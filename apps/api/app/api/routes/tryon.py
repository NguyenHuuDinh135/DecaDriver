import uuid
from typing import Any

from fastapi import APIRouter, HTTPException
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.models import Garment, JobStatus, TryOnJob, TryOnJobPublic
from app.services.sagemaker_client import sagemaker_client

router = APIRouter(prefix="/tryon", tags=["tryon"])


@router.post("/", response_model=TryOnJobPublic)
def create_tryon_job(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    garment_id: uuid.UUID,
) -> Any:
    garment = session.get(Garment, garment_id)
    if not garment:
        raise HTTPException(status_code=404, detail="Garment not found")

    # Build input payload and upload to S3
    input_key = f"inputs/tryon/{current_user.id}/{uuid.uuid4()}.json"
    input_s3_uri = sagemaker_client.upload_json_to_s3(
        settings.AI_S3_BUCKET,
        input_key,
        {
            "user_id": str(current_user.id),
            "garment_image_url": garment.image_url,
            "lora_s3_key": f"avatars/{current_user.id}/lora.safetensors",
        },
    )

    output_s3_uri = sagemaker_client.invoke_async_endpoint(
        settings.SAGEMAKER_FASHN_ENDPOINT, input_s3_uri
    )

    job = TryOnJob(
        user_id=current_user.id,
        garment_id=garment_id,
        status=JobStatus.pending,
        sagemaker_output_s3=output_s3_uri,
    )
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


@router.get("/{job_id}", response_model=TryOnJobPublic)
def get_tryon_job(
    *, session: SessionDep, current_user: CurrentUser, job_id: uuid.UUID
) -> Any:
    job = session.get(TryOnJob, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status == JobStatus.pending and job.sagemaker_output_s3:
        result = sagemaker_client.get_async_result(job.sagemaker_output_s3)
        if result:
            job.status = JobStatus.completed
            job.result_url = result.get("result_url")
            session.add(job)
            session.commit()
            session.refresh(job)

    return job


@router.get("/", response_model=list[TryOnJobPublic])
def list_tryon_jobs(*, session: SessionDep, current_user: CurrentUser) -> Any:
    jobs = session.exec(
        select(TryOnJob).where(TryOnJob.user_id == current_user.id)
    ).all()
    return jobs
