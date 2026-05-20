import uuid
from typing import Any

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel
from sqlmodel import select

from app.api.deps import SessionDep
from app.core.config import settings
from app.models import AvatarJob, Garment, JobStatus, TryOnJob
from app.services.ai_client import ai_client

router = APIRouter(prefix="/ai-worker", tags=["ai-worker"])


class WorkerJobPublic(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    garment_id: uuid.UUID
    category: str = "tops"
    engine_preference: str = "auto"
    retry_count: int = 0
    person_image_url: str
    garment_image_url: str
    output_s3_uri: str
    output_upload_url: str


class WorkerHeartbeat(BaseModel):
    worker_id: str
    gpu: str | None = None
    vram_gb: float | None = None
    engines: list[str] | None = None
    status: str = "idle"


class WorkerComplete(BaseModel):
    result_url: str | None = None


class WorkerFail(BaseModel):
    error: str


def require_worker_token(x_worker_token: str | None = Header(default=None)) -> None:
    if not settings.AI_WORKER_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI worker queue is not configured: AI_WORKER_TOKEN is empty",
        )
    if x_worker_token != settings.AI_WORKER_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid worker token",
        )


def infer_garment_category(garment: Garment) -> str:
    """Map catalog text to FASHN categories: tops, bottoms, one-pieces."""
    text = f"{garment.title} {garment.brand or ''}".lower()
    if any(
        word in text
        for word in ("bottom", "jean", "pants", "trouser", "short", "skirt", "quần")
    ):
        return "bottoms"
    if any(
        word in text
        for word in ("dress", "jumpsuit", "one piece", "one-piece", "váy", "đầm")
    ):
        return "one-pieces"
    return "tops"


@router.get("/jobs/next", response_model=WorkerJobPublic | None)
def get_next_tryon_job(
    *,
    session: SessionDep,
    x_worker_token: str | None = Header(default=None),
    x_worker_id: str = Header(default="unknown"),
) -> Any:
    """Claim the oldest pending try-on job for a pull-based GPU worker.

    Supports:
    - Worker identification via X-Worker-Id header
    - Automatic timeout recovery (jobs stuck in processing > 10min)
    - Retry logic (max 3 attempts)
    """
    require_worker_token(x_worker_token)

    from datetime import datetime, timedelta, timezone

    # First, recover timed-out jobs (processing > 10 minutes)
    timeout_threshold = datetime.now(timezone.utc) - timedelta(minutes=10)
    timed_out_jobs = session.exec(
        select(TryOnJob)
        .where(TryOnJob.status == JobStatus.processing)
        .where(TryOnJob.claimed_at < timeout_threshold)  # type: ignore
        .where(TryOnJob.retry_count < 3)
    ).all()

    for job in timed_out_jobs:
        job.status = JobStatus.pending
        job.worker_id = None
        job.claimed_at = None
        job.retry_count += 1
        session.add(job)

    if timed_out_jobs:
        session.commit()

    # Get next pending job
    job = session.exec(
        select(TryOnJob)
        .where(TryOnJob.status == JobStatus.pending)
        .where(TryOnJob.retry_count < 3)
        .order_by(TryOnJob.created_at.asc())  # type: ignore[union-attr]
    ).first()

    if not job:
        return None

    garment = session.get(Garment, job.garment_id)
    if not garment:
        job.status = JobStatus.failed
        job.result_url = "error:Garment missing"
        session.add(job)
        session.commit()
        return None

    avatar_job = session.exec(
        select(AvatarJob)
        .where(AvatarJob.user_id == job.user_id)
        .where(AvatarJob.status == JobStatus.completed)
        .order_by(AvatarJob.created_at.desc())  # type: ignore[union-attr]
    ).first()

    if not avatar_job or not avatar_job.reference_image_url:
        job.status = JobStatus.failed
        job.result_url = "error:Completed avatar missing"
        session.add(job)
        session.commit()
        return None

    if not job.sagemaker_output_s3:
        job.status = JobStatus.failed
        job.result_url = "error:Output S3 URI missing"
        session.add(job)
        session.commit()
        return None

    # Claim job
    job.status = JobStatus.processing
    job.worker_id = x_worker_id
    job.claimed_at = datetime.now(timezone.utc)
    session.add(job)
    session.commit()
    session.refresh(job)

    return WorkerJobPublic(
        id=job.id,
        user_id=job.user_id,
        garment_id=job.garment_id,
        category=infer_garment_category(garment),
        engine_preference=job.engine_preference or "auto",
        retry_count=job.retry_count,
        person_image_url=ai_client.generate_presigned_url(
            avatar_job.reference_image_url,
            expiration=3600,
        ),
        garment_image_url=ai_client.generate_presigned_url(
            garment.image_url,
            expiration=3600,
        ),
        output_s3_uri=job.sagemaker_output_s3,
        output_upload_url=ai_client.generate_presigned_put_url(
            job.sagemaker_output_s3,
            content_type="image/png",
            expiration=3600,
        ),
    )


@router.post("/heartbeat")
def worker_heartbeat(
    *,
    body: WorkerHeartbeat,
    x_worker_token: str | None = Header(default=None),
) -> dict[str, str]:
    """Worker heartbeat to register capability and status.

    Future: store worker registry in Redis/DB for intelligent job routing.
    For now, just validates token and returns OK.
    """
    require_worker_token(x_worker_token)

    # TODO: Store worker info in Redis with TTL for routing
    # redis.setex(f"worker:{body.worker_id}", 60, json.dumps(body.dict()))

    return {"status": "ok", "worker_id": body.worker_id}


@router.post("/jobs/{job_id}/complete")
def complete_tryon_job(
    *,
    session: SessionDep,
    job_id: uuid.UUID,
    body: WorkerComplete,
    x_worker_token: str | None = Header(default=None),
) -> dict[str, str]:
    """Mark a claimed try-on job completed after worker uploads output."""
    require_worker_token(x_worker_token)

    job = session.get(TryOnJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if not job.sagemaker_output_s3 and not body.result_url:
        raise HTTPException(status_code=409, detail="No result URL available")

    job.status = JobStatus.completed
    job.result_url = body.result_url or job.sagemaker_output_s3
    session.add(job)
    session.commit()

    return {"status": "completed"}


@router.post("/jobs/{job_id}/fail")
def fail_tryon_job(
    *,
    session: SessionDep,
    job_id: uuid.UUID,
    body: WorkerFail,
    x_worker_token: str | None = Header(default=None),
) -> dict[str, str]:
    """Mark a claimed try-on job failed."""
    require_worker_token(x_worker_token)

    job = session.get(TryOnJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.status = JobStatus.failed
    job.result_url = f"error:{body.error[:1900]}"
    session.add(job)
    session.commit()

    return {"status": "failed", "error": body.error}
