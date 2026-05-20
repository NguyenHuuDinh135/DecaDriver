# READY COPY-PASTE VERSION - DO NOT COMMIT (contains worker token)
# ==============================================================================
# DecaDriver FASHN Pull Worker (Multi-Worker Protocol)
# ==============================================================================
# Usage in Google Colab:
# 1) Runtime -> Change runtime type -> T4 GPU (or better)
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

BACKEND_URL = "https://bumpy-ears-end.loca.lt"
AI_WORKER_TOKEN = "LUy22Sfd05X-qMFlPGXaAmsU_rMaPYCegv6SlP92UIM"
WORKER_ID = os.environ.get("WORKER_ID", "colab-fashn-01")
POLL_INTERVAL = 10  # seconds


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

# FASHN package
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

import numpy as np
import requests
import torch
from huggingface_hub import snapshot_download
from PIL import Image

# ==============================================================================
# GPU Detection
# ==============================================================================


def detect_gpu_capability() -> dict[str, Any]:
    """Detect GPU type and VRAM."""
    if not torch.cuda.is_available():
        return {"gpu": "CPU", "vram_gb": 0}

    gpu_name = torch.cuda.get_device_name(0)
    vram_bytes = torch.cuda.get_device_properties(0).total_memory
    vram_gb = vram_bytes / (1024**3)

    return {
        "gpu": gpu_name,
        "vram_gb": round(vram_gb, 1),
    }


# ==============================================================================
# FASHN Engine
# ==============================================================================

_MODELS: dict[str, Any] = {}


def clear_cuda() -> None:
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()


def force_onnxruntime_cpu() -> None:
    """Force ONNXRuntime to use CPU to avoid CUDA OOM on T4."""
    try:
        import onnxruntime as ort
        original_init = ort.InferenceSession.__init__

        def patched_init(self, *args, **kwargs):
            kwargs["providers"] = ["CPUExecutionProvider"]
            return original_init(self, *args, **kwargs)

        ort.InferenceSession.__init__ = patched_init
        print("🧠 ONNXRuntime forced to CPUExecutionProvider (prevents CUDA/CUBLAS OOM)")
    except Exception as exc:
        print(f"⚠️ Could not patch ONNXRuntime: {exc}")


force_onnxruntime_cpu()


def get_fashn_pipeline():
    """Load FASHN v1.5 pipeline."""
    if "fashn" in _MODELS:
        return _MODELS["fashn"]

    print("📥 Loading FASHN v1.5 pipeline (first job only)...")

    from fashn_vton import TryOnPipeline

    weights_dir = snapshot_download(repo_id="fashn-ai/fashn-vton-1.5")
    pipeline = TryOnPipeline(weights_dir=weights_dir)

    _MODELS["fashn"] = pipeline
    print("✅ FASHN pipeline ready")
    return pipeline


def unload_fashn_pipeline() -> None:
    """Unload FASHN pipeline to free VRAM."""
    if "fashn" in _MODELS:
        del _MODELS["fashn"]
        clear_cuda()
        print("🧹 FASHN pipeline unloaded")


def run_tryon(job: dict[str, Any]) -> bytes:
    """Run FASHN v1.5 inference and return PNG bytes."""
    clear_cuda()
    pipeline = get_fashn_pipeline()

    print(f"🎨 Running try-on job {job['id']}...")

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
                "engines": ["fashn"],
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

    print("🚀 DecaDriver FASHN Worker started")
    print(f"🔗 Backend: {BACKEND_URL}")
    print(f"🆔 Worker ID: {WORKER_ID}")
    print(f"🎮 GPU: {gpu_info['gpu']} ({gpu_info['vram_gb']}GB)")
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
                png_bytes = run_tryon(job)
                upload_result(job, png_bytes)
                complete_job(job["id"], job.get("output_s3_uri"))
                print(f"✅ Completed job {job['id']}")

            except Exception as exc:
                err = f"{exc}\n{traceback.format_exc()}"
                print(f"❌ Worker error: {err}")
                clear_cuda()
                if "out of memory" in err.lower():
                    print("🧹 CUDA OOM detected; unloading FASHN pipeline before next job")
                    unload_fashn_pipeline()
                if job and "id" in job:
                    fail_job(job["id"], err)

        except KeyboardInterrupt:
            print("\n👋 Worker stopped by user")
            break
        except Exception as exc:
            print(f"❌ Loop error: {exc}")
            time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main_loop()
