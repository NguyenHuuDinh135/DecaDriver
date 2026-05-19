import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, BackgroundTasks

from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.models import JobStatus, TryOnJob, VideoTryOnJob, VideoTryOnJobPublic
from app.services.ai_client import ai_client

router = APIRouter(prefix="/video-tryon", tags=["video-tryon"])


@router.post("/", response_model=VideoTryOnJobPublic)
async def create_video_tryon(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    tryon_job_id: uuid.UUID,
    background_tasks: BackgroundTasks,
) -> Any:
    parent_job = session.exec(
        select(TryOnJob)
        .where(TryOnJob.id == tryon_job_id)
        .options(selectinload(TryOnJob.garment))
    ).first()
    if not parent_job or parent_job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Try-on job not found")

    if parent_job.status != JobStatus.completed:
        raise HTTPException(
            status_code=400,
            detail="Image try-on must be completed before generating video",
        )

    # Define output location
    output_key = f"results/video_tryon/{current_user.id}/{uuid.uuid4()}.mp4"
    output_s3_uri = f"s3://{settings.AI_S3_BUCKET}/{output_key}"

    job = VideoTryOnJob(
        user_id=current_user.id,
        tryon_job_id=tryon_job_id,
        status=JobStatus.pending,
        sagemaker_output_s3=output_s3_uri,
    )
    session.add(job)
    session.commit()
    session.refresh(job)

    # Trigger CatV2TON via HF Spaces in background
    # Note: We need a specialized handler for HF Spaces Gradio API
    background_tasks.add_task(
        ai_client.invoke_catvton,
        person_image_url=parent_job.result_url,
        garment_image_url=parent_job.garment.image_url if parent_job.garment else "",
        output_s3_uri=output_s3_uri
    )

    return job


@router.get("/{job_id}", response_model=VideoTryOnJobPublic)
def get_video_tryon(
    *, session: SessionDep, current_user: CurrentUser, job_id: uuid.UUID
) -> Any:
    job = session.get(VideoTryOnJob, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Video job not found")

    if job.status == JobStatus.pending and job.sagemaker_output_s3:
        # For simplicity, we check if the S3 file exists (HF handler should upload it)
        result = ai_client.get_async_result(job.sagemaker_output_s3)
        if result:
            job.status = JobStatus.completed
            job.result_url = job.sagemaker_output_s3
            session.add(job)
            session.commit()
            session.refresh(job)

    # Return with presigned URL if it's an S3 URI (Fix Audit H2)
    job_data = job.model_dump()
    if job.result_url and job.result_url.startswith("s3://"):
        job_data["result_url"] = ai_client.generate_presigned_url(job.result_url)
    
    return VideoTryOnJobPublic(**job_data)


@router.delete("/{job_id}")
def delete_video_tryon(
    *, session: SessionDep, current_user: CurrentUser, job_id: uuid.UUID
) -> Any:
    job = session.get(VideoTryOnJob, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Video job not found")
    session.delete(job)
    session.commit()
    return {"message": "Video job deleted"}
