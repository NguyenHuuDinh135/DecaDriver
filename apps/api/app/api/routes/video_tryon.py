import uuid
from typing import Any

from fastapi import APIRouter, HTTPException

from app.api.deps import CurrentUser, SessionDep
from app.core.config import settings
from app.models import JobStatus, TryOnJob, VideoTryOnJob, VideoTryOnJobPublic
from app.services.sagemaker_client import sagemaker_client

router = APIRouter(prefix="/video-tryon", tags=["video-tryon"])


@router.post("/", response_model=VideoTryOnJobPublic)
def create_video_tryon(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    tryon_job_id: uuid.UUID,
) -> Any:
    parent_job = session.get(TryOnJob, tryon_job_id)
    if not parent_job or parent_job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Try-on job not found")

    if parent_job.status != JobStatus.completed:
        raise HTTPException(
            status_code=400,
            detail="Image try-on must be completed before generating video",
        )

    input_key = f"inputs/catvton/{current_user.id}/{uuid.uuid4()}.json"
    input_s3_uri = sagemaker_client.upload_json_to_s3(
        settings.AI_S3_BUCKET,
        input_key,
        {
            "person_image_url": parent_job.result_url,
            "garment_image_url": parent_job.garment.image_url
            if parent_job.garment
            else "",
        },
    )

    output_s3_uri = sagemaker_client.invoke_async_endpoint(
        settings.SAGEMAKER_CATVTON_ENDPOINT, input_s3_uri
    )

    job = VideoTryOnJob(
        user_id=current_user.id,
        tryon_job_id=tryon_job_id,
        status=JobStatus.pending,
        sagemaker_output_s3=output_s3_uri,
    )
    session.add(job)
    session.commit()
    session.refresh(job)
    return job


@router.get("/{job_id}", response_model=VideoTryOnJobPublic)
def get_video_tryon(
    *, session: SessionDep, current_user: CurrentUser, job_id: uuid.UUID
) -> Any:
    job = session.get(VideoTryOnJob, job_id)
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Video job not found")

    if job.status == JobStatus.pending and job.sagemaker_output_s3:
        if sagemaker_client.check_async_failure(job.sagemaker_output_s3):
            job.status = JobStatus.failed
            session.add(job)
            session.commit()
            session.refresh(job)
            return job

        result = sagemaker_client.get_async_result(job.sagemaker_output_s3)
        if result:
            job.status = JobStatus.completed
            result_url = result.get("result_url")
            if result_url and result_url.startswith("s3://"):
                result_url = sagemaker_client.generate_presigned_url(result_url)
            job.result_url = result_url
            session.add(job)
            session.commit()
            session.refresh(job)

    return job


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
