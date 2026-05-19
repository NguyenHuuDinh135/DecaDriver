"""
Public demo endpoints – no authentication required.
Allows visitors to try the AI virtual try-on from the landing page.

Fallback behavior:
- If AI_S3_BUCKET is empty → always mock (no AWS needed)
- If AI provider is unhealthy → auto-fallback to mock with warning
"""

import json
import tempfile
import time
import uuid
from collections import defaultdict
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, HTTPException, Request, UploadFile, BackgroundTasks

from app.core.config import settings
from app.services.ai_client import ai_client

router = APIRouter(prefix="/demo", tags=["demo"])

_MOCK_MODE = not settings.AI_S3_BUCKET
_ENDPOINT_HEALTHY: bool | None = None
_HEALTH_CHECK_AT: float = 0


def _is_endpoint_available() -> bool:
    """Check Modal FASHN endpoint health, cached for 5 minutes."""
    global _ENDPOINT_HEALTHY, _HEALTH_CHECK_AT
    now = time.time()
    if _ENDPOINT_HEALTHY is not None and now - _HEALTH_CHECK_AT < 300:
        return _ENDPOINT_HEALTHY

    if not settings.QWEN_API_URL:
        _ENDPOINT_HEALTHY = False
        _HEALTH_CHECK_AT = now
        return False

    try:
        import httpx
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(settings.QWEN_API_URL)
            # Modal web endpoints return 405 for GET if only POST is allowed, 
            # but if the server is up, it's "healthy" enough for demo.
            _ENDPOINT_HEALTHY = resp.status_code in (200, 405)
    except Exception:
        _ENDPOINT_HEALTHY = False

    _HEALTH_CHECK_AT = now
    return _ENDPOINT_HEALTHY

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


# ── File-based job store (shared across workers) ────────────────────────
_JOBS_DIR = Path(tempfile.gettempdir()) / "decadriver-demo-jobs"
_JOBS_DIR.mkdir(parents=True, exist_ok=True)

MOCK_RESULT_IMAGE = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=900&fit=crop"


def _save_job(job_id: str, data: dict[str, Any]) -> None:
    (_JOBS_DIR / f"{job_id}.json").write_text(json.dumps(data))


def _load_job(job_id: str) -> dict[str, Any] | None:
    path = _JOBS_DIR / f"{job_id}.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, OSError):
        return None


@router.post("/tryon")
async def demo_tryon(
    request: Request,
    background_tasks: BackgroundTasks,
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

    use_mock = _MOCK_MODE or not _is_endpoint_available()

    if use_mock:
        _save_job(job_id, {
            "status": "processing",
            "output_s3_uri": None,
            "result_url": None,
            "mock_ready_at": time.time() + 3,
        })
        return {"job_id": job_id, "status": "processing"}

    prefix = f"inputs/demo/{job_id}"

    person_bytes = await person_image.read()
    person_s3 = ai_client.upload_bytes_to_s3(
        settings.AI_S3_BUCKET,
        f"{prefix}/person.jpg",
        person_bytes,
        content_type=person_image.content_type or "image/jpeg",
    )

    garment_bytes = await garment_image.read()
    garment_s3 = ai_client.upload_bytes_to_s3(
        settings.AI_S3_BUCKET,
        f"{prefix}/garment.jpg",
        garment_bytes,
        content_type=garment_image.content_type or "image/jpeg",
    )

    output_key = f"results/demo/{job_id}.png"
    output_s3_uri = f"s3://{settings.AI_S3_BUCKET}/{output_key}"

    # Trigger Modal inference in background
    background_tasks.add_task(
        ai_client.invoke_fashn,
        person_image_url=person_s3,
        garment_image_url=garment_s3,
        output_s3_uri=output_s3_uri
    )

    _save_job(job_id, {
        "status": "processing",
        "output_s3_uri": output_s3_uri,
        "result_url": None,
    })

    return {"job_id": job_id, "status": "processing"}


@router.get("/tryon/{job_id}")
async def demo_tryon_status(job_id: str) -> dict[str, Any]:
    """Poll for demo try-on result."""
    job = _load_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if "mock_ready_at" in job:
        if job["status"] == "processing":
            if time.time() >= job["mock_ready_at"]:
                job["status"] = "completed"
                job["result_url"] = MOCK_RESULT_IMAGE
                _save_job(job_id, job)
        return {
            "job_id": job_id,
            "status": job["status"],
            "result_url": job.get("result_url"),
        }

    if job["status"] == "processing" and job["output_s3_uri"]:
        result = ai_client.get_async_result(job["output_s3_uri"])
        if result:
            job["result_url"] = ai_client.generate_presigned_url(job["output_s3_uri"])
            job["status"] = "completed"
            _save_job(job_id, job)

    return {
        "job_id": job_id,
        "status": job["status"],
        "result_url": job.get("result_url"),
    }
