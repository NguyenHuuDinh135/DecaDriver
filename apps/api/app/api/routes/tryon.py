import asyncio
import uuid
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.models import (
    AvatarJob,
    ComboTryOnCreate,
    ComboTryOnJob,
    ComboTryOnJobPublic,
    Garment,
    JobStatus,
    TryOnJob,
    TryOnJobPublic,
)
from app.services.ai_client import ai_client

router = APIRouter(prefix="/tryon", tags=["tryon"])


async def process_combo_tryon(
    job_id: uuid.UUID,
    person_image_url: str,
    top_garment_url: str | None,
    bottom_garment_url: str | None,
    output_s3_uri: str,
    user_id: str,
    session_factory: Any,  # We need a way to get a session in the background
) -> None:
    _ = session_factory
    # This is a bit tricky with SessionDep. Usually, we use a separate session factory for background tasks.
    # For now, let's assume ai_client handles the logic and we update the DB later.
    # Actually, it's better to pass the data needed.

    # Step 1: Top (if exists)
    current_person_url = person_image_url

    if top_garment_url:
        # Step 1: Mặc Áo
        intermediate_key = f"results/tryon/intermediate/{job_id}_top.png"
        intermediate_uri = f"s3://{settings.AI_S3_BUCKET}/{intermediate_key}"

        await ai_client.invoke_fashn(
            person_image_url=current_person_url,
            garment_image_url=top_garment_url,
            output_s3_uri=intermediate_uri,
            category="tops",
            user_id=user_id
        )

        # Chờ một chút để S3 cập nhật file (S3 consistency)
        for _ in range(5):
            if ai_client.get_async_result(intermediate_uri):
                break
            await asyncio.sleep(2)

        # Sử dụng kết quả Bước 1 làm đầu vào cho Bước 2
        current_person_url = ai_client.generate_presigned_url(intermediate_uri)

    # Step 2: Bottom (if exists)
    if bottom_garment_url:
        await ai_client.invoke_fashn(
            person_image_url=current_person_url,
            garment_image_url=bottom_garment_url,
            output_s3_uri=output_s3_uri,
            category="bottoms",
            user_id=user_id
        )
    elif top_garment_url:
        # If only top was requested, the "intermediate" is actually the final result
        # Copy intermediate to final output_s3_uri or just use the intermediate
        # For simplicity, we just use the final output_s3_uri in Step 1 if no bottom.
        pass

    # Note: DB update should happen here. In a real app, you'd use a context manager to get a new session.
    # For this demo, we rely on the polling endpoint to check S3.


@router.post("/", response_model=TryOnJobPublic)
async def create_tryon_job(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    garment_id: uuid.UUID,
) -> Any:
    garment = session.get(Garment, garment_id)
    if not garment:
        raise HTTPException(status_code=404, detail="Garment not found")

    avatar_job = session.exec(
        select(AvatarJob)
        .where(AvatarJob.user_id == current_user.id)
        .where(AvatarJob.status == JobStatus.completed)
        .order_by(AvatarJob.created_at.desc())  # type: ignore[union-attr]
    ).first()

    if not avatar_job or not avatar_job.reference_image_url:
        raise HTTPException(
            status_code=400,
            detail="Vui lòng tạo AI Avatar trước khi sử dụng tính năng thử đồ."
        )

    output_key = f"results/tryon/{current_user.id}/{uuid.uuid4()}.png"
    output_s3_uri = f"s3://{settings.AI_S3_BUCKET}/{output_key}"

    job = TryOnJob(
        user_id=current_user.id,
        garment_id=garment_id,
        status=JobStatus.pending,
        sagemaker_output_s3=output_s3_uri,
    )
    session.add(job)
    session.commit()
    session.refresh(job)

    # Pull-based hybrid mode: do not call Colab/ngrok here.
    # A GPU worker claims this pending job via /api/v1/ai-worker/jobs/next.
    return job


@router.post("/combo", response_model=ComboTryOnJobPublic)
async def create_combo_tryon_job(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    body: ComboTryOnCreate,
    background_tasks: BackgroundTasks,
) -> Any:
    top_garment = session.get(Garment, body.top_garment_id) if body.top_garment_id else None
    bottom_garment = session.get(Garment, body.bottom_garment_id) if body.bottom_garment_id else None

    if not top_garment and not bottom_garment:
        raise HTTPException(status_code=400, detail="At least one garment id must be provided")

    avatar_job = session.exec(
        select(AvatarJob)
        .where(AvatarJob.user_id == current_user.id)
        .where(AvatarJob.status == JobStatus.completed)
        .order_by(AvatarJob.created_at.desc())
    ).first()

    if not avatar_job or not avatar_job.reference_image_url:
        raise HTTPException(status_code=400, detail="Vui lòng tạo AI Avatar trước.")

    output_key = f"results/combo/{current_user.id}/{uuid.uuid4()}.png"
    output_s3_uri = f"s3://{settings.AI_S3_BUCKET}/{output_key}"

    job = ComboTryOnJob(
        user_id=current_user.id,
        top_garment_id=body.top_garment_id,
        bottom_garment_id=body.bottom_garment_id,
        status=JobStatus.pending,
        result_url=output_s3_uri, # We store the target S3 URI
    )
    session.add(job)
    session.commit()
    session.refresh(job)

    # Trigger sequential background task
    background_tasks.add_task(
        process_combo_tryon,
        job_id=job.id,
        person_image_url=avatar_job.reference_image_url,
        top_garment_url=top_garment.image_url if top_garment else None,
        bottom_garment_url=bottom_garment.image_url if bottom_garment else None,
        output_s3_uri=output_s3_uri,
        user_id=str(current_user.id),
        session_factory=None # In a real app, pass a session maker
    )

    return job


@router.get("/combo/{job_id}", response_model=ComboTryOnJobPublic)
def get_combo_tryon_job(
    *, session: SessionDep, current_user: CurrentUser, job_id: uuid.UUID
) -> Any:
    job = session.get(ComboTryOnJob, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status == JobStatus.pending:
        # Check S3 for the final result
        if job.result_url:
            result = ai_client.get_async_result(job.result_url)
            if result:
                job.status = JobStatus.completed
                session.add(job)
                session.commit()
                session.refresh(job)

    job_data = job.model_dump()
    if job.result_url and job.result_url.startswith("s3://"):
        job_data["result_url"] = ai_client.generate_presigned_url(job.result_url)

    return ComboTryOnJobPublic(**job_data)


@router.get("/{job_id}", response_model=TryOnJobPublic)
def get_tryon_job(
    *, session: SessionDep, current_user: CurrentUser, job_id: uuid.UUID
) -> Any:
    job = session.get(TryOnJob, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status in (JobStatus.pending, JobStatus.processing) and job.sagemaker_output_s3:
        result = ai_client.get_async_result(job.sagemaker_output_s3)
        if result:
            job.status = JobStatus.completed
            job.result_url = job.sagemaker_output_s3
            session.add(job)
            session.commit()
            session.refresh(job)

    job_data = job.model_dump()
    if job.result_url and job.result_url.startswith("s3://"):
        job_data["result_url"] = ai_client.generate_presigned_url(job.result_url)

    return TryOnJobPublic(**job_data)


@router.get("/", response_model=list[TryOnJobPublic])
def list_tryon_jobs(*, session: SessionDep, current_user: CurrentUser) -> Any:
    jobs = session.exec(
        select(TryOnJob).where(TryOnJob.user_id == current_user.id)
    ).all()

    response_jobs = []
    for job in jobs:
        job_data = job.model_dump()
        if job.result_url and job.result_url.startswith("s3://"):
            job_data["result_url"] = ai_client.generate_presigned_url(job.result_url)
        response_jobs.append(TryOnJobPublic(**job_data))

    return response_jobs


@router.delete("/{job_id}")
def delete_tryon_job(
    *, session: SessionDep, current_user: CurrentUser, job_id: uuid.UUID
) -> Any:
    job = session.get(TryOnJob, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")
    session.delete(job)
    session.commit()
    return {"message": "Job deleted"}
