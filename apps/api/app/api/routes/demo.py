"""
Public demo endpoints – no authentication required.
Allows visitors to try the AI virtual try-on from the landing page.
"""

import time
import uuid
from collections import defaultdict
from typing import Any

from fastapi import APIRouter, HTTPException, Request, UploadFile, File

from app.core.config import settings
from app.services.sagemaker_client import sagemaker_client

router = APIRouter(prefix="/demo", tags=["demo"])

# ── Simple in-memory rate limiter (per IP, resets on restart) ────────────
_rate: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT = 5        # max requests
_RATE_WINDOW = 3600    # per hour (seconds)


def _check_rate(ip: str) -> None:
    now = time.time()
    # Prune old entries
    _rate[ip] = [t for t in _rate[ip] if now - t < _RATE_WINDOW]
    if len(_rate[ip]) >= _RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Bạn đã vượt giới hạn demo (5 lần/giờ). Vui lòng thử lại sau.",
        )
    _rate[ip].append(now)


# ── In-memory job store (sufficient for demo) ───────────────────────────
_jobs: dict[str, dict[str, Any]] = {}


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
    prefix = f"inputs/demo/{job_id}"

    # Upload person image to S3
    person_bytes = await person_image.read()
    person_s3 = sagemaker_client.upload_bytes_to_s3(
        settings.AI_S3_BUCKET,
        f"{prefix}/person.jpg",
        person_bytes,
        content_type=person_image.content_type or "image/jpeg",
    )

    # Upload garment image to S3
    garment_bytes = await garment_image.read()
    garment_s3 = sagemaker_client.upload_bytes_to_s3(
        settings.AI_S3_BUCKET,
        f"{prefix}/garment.jpg",
        garment_bytes,
        content_type=garment_image.content_type or "image/jpeg",
    )

    # Build input payload for the FASHN endpoint
    input_key = f"{prefix}/input.json"
    input_s3_uri = sagemaker_client.upload_json_to_s3(
        settings.AI_S3_BUCKET,
        input_key,
        {
            "person_image_s3": person_s3,
            "garment_image_s3": garment_s3,
            "job_id": job_id,
        },
    )

    # Invoke SageMaker async endpoint
    output_s3_uri = sagemaker_client.invoke_async_endpoint(
        settings.SAGEMAKER_FASHN_ENDPOINT, input_s3_uri
    )

    # Store job info
    _jobs[job_id] = {
        "status": "processing",
        "output_s3_uri": output_s3_uri,
        "result_url": None,
    }

    return {"job_id": job_id, "status": "processing"}


@router.get("/tryon/{job_id}")
def demo_tryon_status(job_id: str) -> dict[str, Any]:
    """Poll for demo try-on result."""
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["status"] == "processing" and job["output_s3_uri"]:
        result = sagemaker_client.get_async_result(job["output_s3_uri"])
        if result:
            job["status"] = "completed"
            job["result_url"] = result.get("result_url")

    return {
        "job_id": job_id,
        "status": job["status"],
        "result_url": job["result_url"],
    }
