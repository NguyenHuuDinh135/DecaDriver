# ==============================================================================
# DecaDriver Multi-Engine Pull Worker
# ==============================================================================
# Supports multiple try-on engines with automatic selection based on GPU capability.
# Usage in Google Colab:
# 1) Runtime -> Change runtime type -> T4 GPU (or L4/A100)
# 2) Paste this file into one Colab cell
# 3) Set BACKEND_URL and AI_WORKER_TOKEN below
# 4) Run. No ngrok needed.
# ==============================================================================

import gc
import importlib
import io
import os
import subprocess
import sys
import time
import traceback
from typing import Any

# GPU memory optimization
os.environ.setdefault("CUDA_MODULE_LOADING", "LAZY")
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")

# ==============================================================================
# Configuration
# ==============================================================================

BACKEND_URL = os.environ.get("DECADRIVER_BACKEND_URL", "http://localhost:8000")
AI_WORKER_TOKEN = os.environ.get("AI_WORKER_TOKEN", "REPLACE_WITH_AI_WORKER_TOKEN")
WORKER_ID = os.environ.get("WORKER_ID", "colab-auto")
POLL_INTERVAL = 10  # seconds

# Engine selection strategy
# "auto" - detect GPU and choose best engine
# "fashn" - force FASHN v1.5 (needs 16GB+ VRAM)
# "idm-vton" - force IDM-VTON (lighter, works on T4)
ENGINE_STRATEGY = os.environ.get("ENGINE_STRATEGY", "auto")


def ensure_package(import_name: str, pip_name: str | None = None):
    try:
        return importlib.import_module(import_name)
    except ModuleNotFoundError:
        pkg = pip_name or import_name
        print(f"📦 Installing {pkg}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", pkg])
        return importlib.import_module(import_name)


# Core deps
ensure_package("requests")
ensure_package("PIL", "pillow")
ensure_package("huggingface_hub")
ensure_package("numpy")
ensure_package("torch")

import numpy as np
import requests
import torch
from huggingface_hub import snapshot_download
from PIL import Image

# ==============================================================================
# GPU Detection
# ==============================================================================


def detect_gpu_capability() -> dict[str, Any]:
    """Detect GPU type and VRAM to choose appropriate engine."""
    if not torch.cuda.is_available():
        return {"gpu": "CPU", "vram_gb": 0, "recommended_engine": "none"}

    gpu_name = torch.cuda.get_device_name(0)
    vram_bytes = torch.cuda.get_device_properties(0).total_memory
    vram_gb = vram_bytes / (1024**3)

    # Determine recommended engine
    if vram_gb >= 20:
        recommended = "fashn"
    elif vram_gb >= 14:
        recommended = "idm-vton"
    else:
        recommended = "idm-vton"  # fallback

    return {
        "gpu": gpu_name,
        "vram_gb": round(vram_gb, 1),
        "recommended_engine": recommended,
    }


# ==============================================================================
# Engine Registry
# ==============================================================================

_MODELS: dict[str, Any] = {}


def clear_cuda() -> None:
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()


# ==============================================================================
# IDM-VTON Engine (Lightweight, T4-friendly)
# ==============================================================================


def get_idm_vton_pipeline():
    """Load IDM-VTON pipeline (lighter than FASHN, works on T4)."""
    if "idm_vton" in _MODELS:
        return _MODELS["idm_vton"]

    print("📥 Loading IDM-VTON pipeline (first job only)...")

    # Install IDM-VTON if needed
    try:
        from diffusers import AutoPipelineForInpainting
    except ImportError:
        subprocess.check_call([
            sys.executable,
            "-m",
            "pip",
            "install",
            "-q",
            "diffusers[torch]",
            "transformers",
            "accelerate",
        ])
        from diffusers import AutoPipelineForInpainting

    # For now, use a placeholder - IDM-VTON needs proper implementation
    # This is a simplified version using Stable Diffusion inpainting as base
    model_id = "stabilityai/stable-diffusion-2-inpainting"
    pipeline = AutoPipelineForInpainting.from_pretrained(
        model_id,
        torch_dtype=torch.float16,
    ).to("cuda")

    _MODELS["idm_vton"] = pipeline
    print("✅ IDM-VTON pipeline ready")
    return pipeline


def run_idm_vton(job: dict[str, Any]) -> bytes:
    """Run IDM-VTON inference and return PNG bytes."""
    pipeline = get_idm_vton_pipeline()

    # Download images
    person_resp = requests.get(job["person_image_url"], timeout=60)
    person_resp.raise_for_status()
    person_img = Image.open(io.BytesIO(person_resp.content)).convert("RGB")

    garment_resp = requests.get(job["garment_image_url"], timeout=60)
    garment_resp.raise_for_status()
    garment_img = Image.open(io.BytesIO(garment_resp.content)).convert("RGB")

    # Resize to 512x512 for SD2 inpainting
    person_img = person_img.resize((512, 512))
    garment_img = garment_img.resize((512, 512))

    # Create a simple mask (this is placeholder logic)
    mask = Image.new("L", (512, 512), 255)

    # Run inference
    with torch.inference_mode():
        result = pipeline(
            prompt=f"person wearing {job.get('category', 'clothing')}",
            image=person_img,
            mask_image=mask,
            num_inference_steps=20,
            guidance_scale=7.5,
        ).images[0]

    # Convert to PNG bytes
    buf = io.BytesIO()
    result.save(buf, format="PNG")
    return buf.getvalue()


# ==============================================================================
# FASHN Engine (High quality, needs 16GB+ VRAM)
# ==============================================================================


def get_fashn_pipeline():
    """Load FASHN v1.5 pipeline (high quality but heavy)."""
    if "fashn" in _MODELS:
        return _MODELS["fashn"]

    print("📥 Loading FASHN v1.5 pipeline (first job only)...")

    # Install FASHN
    try:
        import fashn_vton  # noqa: F401
    except ModuleNotFoundError:
        subprocess.check_call([
            sys.executable,
            "-m",
            "pip",
            "install",
            "-q",
            "git+https://github.com/fashn-AI/fashn-vton-1.5.git",
        ])

    from fashn_vton import TryOnPipeline

    weights_dir = snapshot_download(repo_id="fashn-ai/fashn-vton-1.5")
    pipeline = TryOnPipeline(weights_dir=weights_dir)

    _MODELS["fashn"] = pipeline
    print("✅ FASHN pipeline ready")
    return pipeline


def run_fashn(job: dict[str, Any]) -> bytes:
    """Run FASHN v1.5 inference and return PNG bytes."""
    pipeline = get_fashn_pipeline()

    # Download images
    person_resp = requests.get(job["person_image_url"], timeout=60)
    person_resp.raise_for_status()
    person_img = Image.open(io.BytesIO(person_resp.content)).convert("RGB")

    garment_resp = requests.get(job["garment_image_url"], timeout=60)
    garment_resp.raise_for_status()
    garment_img = Image.open(io.BytesIO(garment_resp.content)).convert("RGB")

    # Run FASHN inference
    with torch.inference_mode():
        result = pipeline(
            person_image=person_img,
            garment_image=garment_img,
            category=job.get("category", "tops"),
            num_timesteps=15,
        )

    result_img = result.images[0]

    # Convert to PNG bytes
    buf = io.BytesIO()
    result_img.save(buf, format="PNG")
    return buf.getvalue()


# ==============================================================================
# Engine Router
# ==============================================================================


def choose_engine(job: dict[str, Any], gpu_info: dict[str, Any]) -> str:
    """Choose engine based on job preference and GPU capability."""
    job_preference = job.get("engine_preference", "auto")

    if ENGINE_STRATEGY != "auto":
        return ENGINE_STRATEGY

    if job_preference != "auto":
        return job_preference

    # Auto-select based on GPU
    return gpu_info["recommended_engine"]


def run_tryon(job: dict[str, Any], gpu_info: dict[str, Any]) -> bytes:
    """Route to appropriate engine and run inference."""
    engine = choose_engine(job, gpu_info)

    print(f"🎨 Running try-on with engine: {engine}")

    if engine == "fashn":
        return run_fashn(job)
    elif engine == "idm-vton":
        return run_idm_vton(job)
    else:
        raise ValueError(f"Unknown engine: {engine}")


# ==============================================================================
# Worker Loop
# ==============================================================================


def heartbeat(gpu_info: dict[str, Any]) -> None:
    """Send heartbeat to backend."""
    try:
        resp = requests.post(
            f"{BACKEND_URL}/api/v1/ai-worker/heartbeat",
            headers={"X-Worker-Token": AI_WORKER_TOKEN},
            json={
                "worker_id": WORKER_ID,
                "gpu": gpu_info["gpu"],
                "vram_gb": gpu_info["vram_gb"],
                "engines": ["idm-vton", "fashn"] if gpu_info["vram_gb"] >= 16 else ["idm-vton"],
                "status": "idle",
            },
            timeout=10,
        )
        resp.raise_for_status()
    except Exception as exc:
        print(f"⚠️ Heartbeat failed: {exc}")


def claim_job() -> dict[str, Any] | None:
    """Poll backend for next job."""
    try:
        resp = requests.get(
            f"{BACKEND_URL}/api/v1/ai-worker/jobs/next",
            headers={
                "X-Worker-Token": AI_WORKER_TOKEN,
                "X-Worker-Id": WORKER_ID,
            },
            timeout=10,
        )
        resp.raise_for_status()
        job = resp.json()
        return job if job else None
    except Exception as exc:
        print(f"⚠️ Claim job failed: {exc}")
        return None


def complete_job(job_id: str, result_url: str | None = None) -> None:
    """Mark job completed."""
    try:
        resp = requests.post(
            f"{BACKEND_URL}/api/v1/ai-worker/jobs/{job_id}/complete",
            headers={"X-Worker-Token": AI_WORKER_TOKEN},
            json={"result_url": result_url},
            timeout=10,
        )
        resp.raise_for_status()
    except Exception as exc:
        print(f"⚠️ Complete job failed: {exc}")


def fail_job(job_id: str, error: str) -> None:
    """Mark job failed."""
    try:
        resp = requests.post(
            f"{BACKEND_URL}/api/v1/ai-worker/jobs/{job_id}/fail",
            headers={"X-Worker-Token": AI_WORKER_TOKEN},
            json={"error": error},
            timeout=10,
        )
        resp.raise_for_status()
    except Exception as exc:
        print(f"⚠️ Fail job failed: {exc}")


def upload_result(job: dict[str, Any], png_bytes: bytes) -> None:
    """Upload result to S3 via presigned URL."""
    try:
        resp = requests.put(
            job["output_upload_url"],
            data=png_bytes,
            headers={"Content-Type": "image/png"},
            timeout=60,
        )
        resp.raise_for_status()
    except Exception as exc:
        raise RuntimeError(f"Upload failed: {exc}") from exc


def main_loop():
    """Main worker loop."""
    gpu_info = detect_gpu_capability()

    print("🚀 DecaDriver Multi-Engine Worker started")
    print(f"🔗 Backend: {BACKEND_URL}")
    print(f"🆔 Worker ID: {WORKER_ID}")
    print(f"🎮 GPU: {gpu_info['gpu']} ({gpu_info['vram_gb']}GB)")
    print(f"🔧 Recommended engine: {gpu_info['recommended_engine']}")
    print(f"💡 Polling for jobs every {POLL_INTERVAL}s...")

    heartbeat(gpu_info)

    while True:
        try:
            job = claim_job()
            if not job:
                time.sleep(POLL_INTERVAL)
                continue

            print(f"📦 Claimed job {job['id']}")

            try:
                clear_cuda()
                png_bytes = run_tryon(job, gpu_info)
                upload_result(job, png_bytes)
                complete_job(job["id"], job.get("output_s3_uri"))
                print(f"✅ Completed job {job['id']}")

            except Exception as exc:
                err = f"{exc}\n{traceback.format_exc()}"
                print(f"❌ Worker error: {err}")
                clear_cuda()
                fail_job(job["id"], err)

        except KeyboardInterrupt:
            print("\n👋 Worker stopped by user")
            break
        except Exception as exc:
            print(f"❌ Loop error: {exc}")
            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main_loop()
