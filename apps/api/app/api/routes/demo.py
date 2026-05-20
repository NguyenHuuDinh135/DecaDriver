"""
Public demo endpoints – no authentication required.
Allows visitors to try the AI virtual try-on from the landing page.

Demo behavior:
- Public/no-login endpoint for teacher demo.
- Uses the real AI gateway when S3 + QWEN_API_URL are configured.
- Does not silently fall back to mock data when the real gateway is missing/unhealthy.
"""

import json
import subprocess
import tempfile
import time
import uuid
from collections import defaultdict
from pathlib import Path
from typing import Any

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, Request, UploadFile

from app.core.config import settings
from app.services.ai_client import ai_client

router = APIRouter(prefix="/demo", tags=["demo"])

_ENDPOINT_HEALTHY: bool | None = None
_HEALTH_CHECK_AT: float = 0


def _is_endpoint_available() -> bool:
    """Check Modal FASHN endpoint health, cached for 5 minutes."""
    global _ENDPOINT_HEALTHY, _HEALTH_CHECK_AT
    now = time.time()
    if _ENDPOINT_HEALTHY is not None and now - _HEALTH_CHECK_AT < 300:
        return _ENDPOINT_HEALTHY

    demo_ai_url = settings.MODAL_FASHN_URL or settings.QWEN_API_URL
    if not demo_ai_url:
        _ENDPOINT_HEALTHY = False
        _HEALTH_CHECK_AT = now
        return False

    try:
        import httpx
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(demo_ai_url)
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
            detail="Demo rate limit exceeded (5 requests/hour). Please try again later.",
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


def _format_error(exc: Exception) -> str:
    message = str(exc).strip()
    if message:
        return f"{type(exc).__name__}: {message}"
    return repr(exc)


async def _run_real_demo_tryon(job_id: str, person_s3: str, garment_s3: str, output_s3_uri: str) -> None:
    try:
        result = await ai_client.invoke_fashn(
            person_image_url=person_s3,
            garment_image_url=garment_s3,
            output_s3_uri=output_s3_uri,
        )
        if result.get("status") not in ("success", "completed", None):
            raise RuntimeError(result.get("error") or str(result))
    except Exception as exc:
        job = _load_job(job_id) or {}
        job["status"] = "failed"
        job["error"] = _format_error(exc)
        job.setdefault("output_s3_uri", output_s3_uri)
        _save_job(job_id, job)


async def _run_full_outfit_job(
    job_id: str,
    body_s3: str,
    top_s3: str,
    bottom_s3: str,
    reference_s3_uri: str,
    top_output_s3_uri: str,
    final_output_s3_uri: str,
) -> None:
    stage = "reference generation"
    try:
        job = _load_job(job_id) or {}
        job["stage"] = stage
        _save_job(job_id, job)

        train = await ai_client.invoke_modal_train(
            user_id=f"demo-{job_id}",
            image_urls=[body_s3, body_s3],
            output_s3_uri=reference_s3_uri,
        )
        if train.get("status") not in ("success", "completed", None):
            raise RuntimeError(train.get("error") or str(train))

        stage = "top try-on"
        job = _load_job(job_id) or {}
        job["stage"] = stage
        _save_job(job_id, job)
        top_result = await ai_client.invoke_fashn(
            person_image_url=reference_s3_uri,
            garment_image_url=top_s3,
            output_s3_uri=top_output_s3_uri,
            category="tops",
            user_id=f"demo-{job_id}",
        )
        if top_result.get("status") not in ("success", "completed", None):
            raise RuntimeError(top_result.get("error") or str(top_result))

        stage = "bottom try-on"
        job = _load_job(job_id) or {}
        job["stage"] = stage
        _save_job(job_id, job)
        bottom_result = await ai_client.invoke_fashn(
            person_image_url=top_output_s3_uri,
            garment_image_url=bottom_s3,
            output_s3_uri=final_output_s3_uri,
            category="bottoms",
            user_id=f"demo-{job_id}",
        )
        if bottom_result.get("status") not in ("success", "completed", None):
            raise RuntimeError(bottom_result.get("error") or str(bottom_result))

        job = _load_job(job_id) or {}
        job["status"] = "completed"
        job["stage"] = "completed"
        job["result_url"] = ai_client.generate_presigned_url(final_output_s3_uri)
        job["debug_reference_url"] = ai_client.generate_presigned_url(reference_s3_uri)
        job["debug_top_url"] = ai_client.generate_presigned_url(top_output_s3_uri)
        _save_job(job_id, job)
    except Exception as exc:
        job = _load_job(job_id) or {}
        job["status"] = "failed"
        job["error"] = f"{stage} failed: {_format_error(exc)}"
        _save_job(job_id, job)


def _download_s3_to_file(s3_uri: str, path: Path) -> None:
    bucket, key = s3_uri.replace("s3://", "").split("/", 1)
    ai_client._s3.download_file(bucket, key, str(path))  # noqa: SLF001


def _make_video_from_image(input_path: Path, output_path: Path) -> None:
    frames = 120
    vf = (
        "scale=1080:1440:force_original_aspect_ratio=decrease,"
        "pad=1080:1440:(ow-iw)/2:(oh-ih)/2:white,"
        f"zoompan=z='1+0.035*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        "d=120:s=1080x1440:fps=24,format=yuv420p"
    )
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-i",
            str(input_path),
            "-vf",
            vf,
            "-t",
            "5",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-movflags",
            "+faststart",
            str(output_path),
        ],
        check=True,
        capture_output=True,
    )


async def _run_full_outfit_video_job(job_id: str, source_s3_uri: str, video_s3_uri: str) -> None:
    try:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_dir = Path(tmp)
            image_path = tmp_dir / "source.png"
            video_path = tmp_dir / "video.mp4"
            _download_s3_to_file(source_s3_uri, image_path)
            _make_video_from_image(image_path, video_path)
            ai_client.upload_bytes_to_s3(
                settings.AI_S3_BUCKET,
                video_s3_uri.replace(f"s3://{settings.AI_S3_BUCKET}/", ""),
                video_path.read_bytes(),
                content_type="video/mp4",
            )
        job = _load_job(job_id) or {}
        job["video_status"] = "completed"
        job["video_url"] = ai_client.generate_presigned_url(video_s3_uri)
        _save_job(job_id, job)
    except Exception as exc:
        job = _load_job(job_id) or {}
        job["video_status"] = "failed"
        job["video_error"] = _format_error(exc)
        _save_job(job_id, job)

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

    if not settings.AI_S3_BUCKET:
        raise HTTPException(status_code=503, detail="AI_S3_BUCKET is not configured; the demo needs S3 to call the real AI pipeline.")
    if not settings.MODAL_FASHN_URL and not settings.QWEN_API_URL:
        raise HTTPException(status_code=503, detail="MODAL_FASHN_URL is not configured; the demo does not use mock data.")
    if not _is_endpoint_available():
        raise HTTPException(status_code=503, detail="The AI gateway is not available. Check the Modal endpoint instead of returning mock data.")

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

    # Trigger real Modal inference in background
    background_tasks.add_task(
        _run_real_demo_tryon,
        job_id=job_id,
        person_s3=person_s3,
        garment_s3=garment_s3,
        output_s3_uri=output_s3_uri,
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


@router.post("/full-outfit")
async def demo_full_outfit(
    request: Request,
    background_tasks: BackgroundTasks,
    top_image: UploadFile = File(...),
    bottom_image: UploadFile = File(...),
    body_reference: UploadFile = File(...),
) -> dict[str, str]:
    """Submit public demo job: pose/body reference + top + bottom -> one final outfit image."""
    client_ip = request.client.host if request.client else "unknown"
    _check_rate(client_ip)

    if not settings.AI_S3_BUCKET:
        raise HTTPException(status_code=503, detail="AI_S3_BUCKET is not configured; the demo needs S3 to call the real AI pipeline.")
    if not settings.MODAL_FASHN_URL and not settings.QWEN_API_URL:
        raise HTTPException(status_code=503, detail="MODAL_FASHN_URL is not configured; the demo does not use mock data.")
    if not settings.MODAL_TRAIN_URL and not settings.QWEN_API_URL:
        raise HTTPException(status_code=503, detail="MODAL_TRAIN_URL is not configured; the demo does not use mock data.")
    if not _is_endpoint_available():
        raise HTTPException(status_code=503, detail="The AI gateway is not available. Check the Modal endpoint instead of returning mock data.")

    job_id = str(uuid.uuid4())
    prefix = f"inputs/demo_full_outfit/{job_id}"

    body_bytes = await body_reference.read()
    body_content_type = body_reference.content_type or "image/jpeg"

    body_s3 = ai_client.upload_bytes_to_s3(settings.AI_S3_BUCKET, f"{prefix}/body_reference.jpg", body_bytes, body_content_type)
    top_s3 = ai_client.upload_bytes_to_s3(
        settings.AI_S3_BUCKET,
        f"{prefix}/top.jpg",
        await top_image.read(),
        top_image.content_type or "image/jpeg",
    )
    bottom_s3 = ai_client.upload_bytes_to_s3(
        settings.AI_S3_BUCKET,
        f"{prefix}/bottom.jpg",
        await bottom_image.read(),
        bottom_image.content_type or "image/jpeg",
    )

    reference_s3_uri = f"s3://{settings.AI_S3_BUCKET}/results/demo_full_outfit/{job_id}/reference.png"
    top_output_s3_uri = f"s3://{settings.AI_S3_BUCKET}/results/demo_full_outfit/{job_id}/top.png"
    final_output_s3_uri = f"s3://{settings.AI_S3_BUCKET}/results/demo_full_outfit/{job_id}/final.png"

    _save_job(
        job_id,
        {
            "status": "processing",
            "stage": "queued",
            "result_url": None,
            "output_s3_uri": final_output_s3_uri,
            "reference_s3_uri": reference_s3_uri,
            "top_output_s3_uri": top_output_s3_uri,
            "video_status": "not_requested",
            "video_url": None,
        },
    )
    background_tasks.add_task(
        _run_full_outfit_job,
        job_id=job_id,
        body_s3=body_s3,
        top_s3=top_s3,
        bottom_s3=bottom_s3,
        reference_s3_uri=reference_s3_uri,
        top_output_s3_uri=top_output_s3_uri,
        final_output_s3_uri=final_output_s3_uri,
    )
    return {"job_id": job_id, "status": "processing"}


@router.get("/full-outfit/{job_id}")
async def demo_full_outfit_status(job_id: str) -> dict[str, Any]:
    job = _load_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "job_id": job_id,
        "status": job.get("status"),
        "stage": job.get("stage"),
        "result_url": job.get("result_url"),
        "debug_reference_url": job.get("debug_reference_url"),
        "debug_top_url": job.get("debug_top_url"),
        "video_status": job.get("video_status", "not_requested"),
        "video_url": job.get("video_url"),
        "error": job.get("error"),
        "video_error": job.get("video_error"),
    }


@router.post("/full-outfit/{job_id}/video")
async def demo_full_outfit_video(job_id: str, background_tasks: BackgroundTasks) -> dict[str, str]:
    """Create video only after the user explicitly clicks the result CTA."""
    job = _load_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("status") != "completed" or not job.get("output_s3_uri"):
        raise HTTPException(status_code=409, detail="The full outfit image is not ready for video generation yet.")
    if job.get("video_status") == "processing":
        return {"job_id": job_id, "video_status": "processing"}
    if job.get("video_status") == "completed":
        return {"job_id": job_id, "video_status": "completed"}

    video_s3_uri = f"s3://{settings.AI_S3_BUCKET}/results/demo_full_outfit/{job_id}/video.mp4"
    job["video_status"] = "processing"
    job["video_s3_uri"] = video_s3_uri
    _save_job(job_id, job)
    background_tasks.add_task(
        _run_full_outfit_video_job,
        job_id=job_id,
        source_s3_uri=job["output_s3_uri"],
        video_s3_uri=video_s3_uri,
    )
    return {"job_id": job_id, "video_status": "processing"}
