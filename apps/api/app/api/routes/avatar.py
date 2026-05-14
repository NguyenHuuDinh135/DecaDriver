import uuid
from typing import Any

from fastapi import APIRouter, HTTPException, UploadFile
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.models import AvatarJob, AvatarJobPublic, JobStatus
from app.services.sagemaker_client import sagemaker_client

router = APIRouter(prefix="/avatar", tags=["avatar"])


@router.post("/train", response_model=AvatarJobPublic)
async def train_avatar(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    images: list[UploadFile],
) -> Any:
    if not settings.DREAMBOOTH_IMAGE_URI or not settings.SAGEMAKER_ROLE_ARN:
        raise HTTPException(
            status_code=503,
            detail="Avatar training is not available yet. DreamBooth infrastructure is being set up.",
        )
    if not settings.AI_S3_BUCKET:
        raise HTTPException(status_code=503, detail="AI services not configured")
    if len(images) < 5:
        raise HTTPException(status_code=400, detail="Upload at least 5 images")

    # Upload images to S3
    input_prefix = f"avatars/{current_user.id}/training/"
    reference_image_url = None
    for i, img in enumerate(images):
        data = await img.read()
        s3_uri = sagemaker_client.upload_bytes_to_s3(
            settings.AI_S3_BUCKET,
            f"{input_prefix}{img.filename}",
            data,
            img.content_type or "image/jpeg",
        )
        if i == 0:
            reference_image_url = s3_uri

    job_name = f"dreambooth-{current_user.id}-{uuid.uuid4().hex[:8]}"
    sagemaker_client.start_training_job(
        job_name=job_name,
        role_arn=settings.SAGEMAKER_ROLE_ARN,
        image_uri=settings.DREAMBOOTH_IMAGE_URI,
        input_s3_uri=f"s3://{settings.AI_S3_BUCKET}/{input_prefix}",
        output_s3_uri=f"s3://{settings.AI_S3_BUCKET}/avatars/{current_user.id}/",
    )

    job = AvatarJob(
        user_id=current_user.id,
        status=JobStatus.pending,
        sagemaker_job_name=job_name,
        reference_image_url=reference_image_url,
    )
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


@router.get("/status", response_model=AvatarJobPublic)
def get_avatar_status(*, session: SessionDep, current_user: CurrentUser) -> Any:
    job = session.exec(
        select(AvatarJob)
        .where(AvatarJob.user_id == current_user.id)
        .order_by(AvatarJob.created_at.desc())  # type: ignore[union-attr]
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="No avatar job found")

    if job.status == JobStatus.pending and job.sagemaker_job_name:
        sm_status = sagemaker_client.get_training_job_status(job.sagemaker_job_name)
        if sm_status == "Completed":
            job.status = JobStatus.completed
            job.lora_s3_key = f"avatars/{current_user.id}/lora.safetensors"
            session.add(job)
            session.commit()
            session.refresh(job)
        elif sm_status == "Failed":
            job.status = JobStatus.failed
            session.add(job)
            session.commit()

    return job


@router.post("/webhook")
def avatar_webhook(*, session: SessionDep, job_name: str, status: str) -> Any:
    """Internal webhook called by SageMaker EventBridge when training completes."""
    job = session.exec(
        select(AvatarJob).where(AvatarJob.sagemaker_job_name == job_name)
    ).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.status = JobStatus.completed if status == "Completed" else JobStatus.failed
    if job.status == JobStatus.completed:
        # Extract user_id from job to build lora path
        job.lora_s3_key = f"avatars/{job.user_id}/lora.safetensors"
    session.add(job)
    session.commit()
    return {"ok": True}
