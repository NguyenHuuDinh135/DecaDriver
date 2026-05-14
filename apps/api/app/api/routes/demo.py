"""
Public demo endpoints – no authentication required.
Allows visitors to try the AI virtual try-on from the landing page.

When ENVIRONMENT=local and AI_S3_BUCKET is empty, returns mock results
so the frontend can be tested without AWS credentials.
"""

import time
import uuid
from collections import defaultdict
from typing import Any

from fastapi import APIRouter, File, HTTPException, Request, UploadFile

from app.core.config import settings

router = APIRouter(prefix="/demo", tags=["demo"])

_MOCK_MODE = settings.ENVIRONMENT == "local" and not settings.AI_S3_BUCKET

# ── Simple in-memory rate limiter (per IP, resets on restart) ────────────
_rate: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT = 5        # max requests
_RATE_WINDOW = 3600    # per hour (seconds)


def _check_rate(ip: str) -> None:
    now = time.time()
    _rate[ip] = [t for t in _rate[ip] if now - t < _RATE_WINDOW]
    if len(_rate[ip]) >= _RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Bạn đã vượt giới hạn demo (5 lần/giờ). Vui lòng thử lại sau.",
        )
    _rate[ip].append(now)


# ── In-memory job store (sufficient for demo) ───────────────────────────
_jobs: dict[str, dict[str, Any]] = {}

MOCK_RESULT_IMAGE = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=900&fit=crop"


@router.post("/tryon")
async def demo_tryon(
    request: Request,
    person_image: UploadFile = File(...),
    garment_image: UploadFile = File(...),
) -> dict[str, str]:
    """
    Submit a virtual try-on demo job.
    Accepts two image uploads and returns a job_id to poll for results.
    """
    client_ip = request.client.host if request.client else "unknown"
    _check_rate(client_ip)

    job_id = str(uuid.uuid4())

    if _MOCK_MODE:
        _jobs[job_id] = {
            "status": "processing",
            "output_s3_uri": None,
            "result_url": None,
            "mock_ready_at": time.time() + 3,
        }
        return {"job_id": job_id, "status": "processing"}

    from app.services.sagemaker_client import sagemaker_client

    prefix = f"inputs/demo/{job_id}"

    person_bytes = await person_image.read()
    person_s3 = sagemaker_client.upload_bytes_to_s3(
        settings.AI_S3_BUCKET,
        f"{prefix}/person.jpg",
        person_bytes,
        content_type=person_image.content_type or "image/jpeg",
    )

    garment_bytes = await garment_image.read()
    garment_s3 = sagemaker_client.upload_bytes_to_s3(
        settings.AI_S3_BUCKET,
        f"{prefix}/garment.jpg",
        garment_bytes,
        content_type=garment_image.content_type or "image/jpeg",
    )

    input_key = f"{prefix}/input.json"
    input_s3_uri = sagemaker_client.upload_json_to_s3(
        settings.AI_S3_BUCKET,
        input_key,
        {
            "person_image_url": person_s3,
            "garment_image_url": garment_s3,
        },
    )

    output_s3_uri = sagemaker_client.invoke_async_endpoint(
        settings.SAGEMAKER_FASHN_ENDPOINT, input_s3_uri
    )

    _jobs[job_id] = {
        "status": "processing",
        "output_s3_uri": output_s3_uri,
        "result_url": None,
    }

    return {"job_id": job_id, "status": "processing"}


@router.get("/tryon/{job_id}")
async def demo_tryon_status(job_id: str) -> dict[str, Any]:
    """Poll for demo try-on result."""
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if _MOCK_MODE:
        if job["status"] == "processing":
            ready_at = job.get("mock_ready_at", 0)
            if time.time() >= ready_at:
                job["status"] = "completed"
                job["result_url"] = MOCK_RESULT_IMAGE
        return {
            "job_id": job_id,
            "status": job["status"],
            "result_url": job["result_url"],
        }

    if job["status"] == "processing" and job["output_s3_uri"]:
        from app.services.sagemaker_client import sagemaker_client

        result = sagemaker_client.get_async_result(job["output_s3_uri"])
        if result:
            job["status"] = "completed"
            job["result_url"] = result.get("result_url")

    return {
        "job_id": job_id,
        "status": job["status"],
        "result_url": job["result_url"],
    }
