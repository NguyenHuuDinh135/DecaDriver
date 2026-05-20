import uuid
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile
from sqlmodel import select

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.models import AvatarJob, AvatarJobPublic, JobStatus
from app.services.ai_client import ai_client

router = APIRouter(prefix="/avatar", tags=["avatar"])


async def process_modal_avatar_training(
    user_id: uuid.UUID,
    image_uris: list[str],
    job_id: uuid.UUID,
):
    """Background task to trigger Modal training and update status."""
    from sqlmodel import Session

    from app.core.db import engine

    try:
        # Convert S3 URIs to presigned URLs for Modal to download
        presigned_urls = [ai_client.generate_presigned_url(uri) for uri in image_uris]

        output_s3_uri = f"s3://{settings.AI_S3_BUCKET}/avatars/{user_id}/reference_{job_id}.png"

        # Trigger reference generation/training on Modal. For the current
        # onboarding flow, Modal builds a clean full-body reference from the
        # captured images and returns reference_image_url synchronously.
        result = await ai_client.invoke_modal_train(
            user_id=str(user_id),
            image_urls=presigned_urls,
            output_s3_uri=output_s3_uri,
        )

        # Update DB with training result
        with Session(engine) as session:
            job = session.get(AvatarJob, job_id)
            if job and result.get("status") == "success":
                job.status = JobStatus.completed
                job.reference_image_url = result.get("reference_image_url", job.reference_image_url)
                job.lora_s3_key = result.get("lora_s3_key")
                session.add(job)
                session.commit()
            elif job:
                job.status = JobStatus.failed
                session.add(job)
                session.commit()
    except Exception:
        with Session(engine) as session:
            job = session.get(AvatarJob, job_id)
            if job:
                job.status = JobStatus.failed
                session.add(job)
                session.commit()


@router.post("/train", response_model=AvatarJobPublic)
async def train_avatar(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    images: list[UploadFile],
    background_tasks: BackgroundTasks,
) -> Any:
    if not settings.QWEN_API_URL and not settings.MODAL_TRAIN_URL:
        raise HTTPException(
            status_code=503,
            detail="Avatar training is not available yet. AI gateway is not configured.",
        )
    if not settings.AI_S3_BUCKET:
        raise HTTPException(status_code=503, detail="AI services not configured")
    if len(images) < 5:
        raise HTTPException(status_code=400, detail="Upload ít nhất 5 ảnh để AI nhận diện gương mặt.")

    # 1. Upload images to S3
    input_prefix = f"avatars/{current_user.id}/training/"
    image_uris = []
    reference_image_url = None

    for i, img in enumerate(images):
        data = await img.read()
        s3_uri = ai_client.upload_bytes_to_s3(
            settings.AI_S3_BUCKET,
            f"{input_prefix}{uuid.uuid4()}.jpg",
            data,
            img.content_type or "image/jpeg",
        )
        image_uris.append(s3_uri)
        if i == 0:
            reference_image_url = s3_uri

    # 2. Create Job in DB
    job = AvatarJob(
        user_id=current_user.id,
        status=JobStatus.pending,
        reference_image_url=reference_image_url,
    )
    session.add(job)
    session.commit()
    session.refresh(job)

    # 3. Trigger Modal training in background
    background_tasks.add_task(
        process_modal_avatar_training,
        user_id=current_user.id,
        image_uris=image_uris,
        job_id=job.id
    )

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

    # Status is updated by background task process_modal_avatar_training
    # No auto-complete logic here
    return job
