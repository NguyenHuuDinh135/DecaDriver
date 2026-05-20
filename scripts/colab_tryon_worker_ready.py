# ==============================================================================
# DecaDriver Colab Pull Worker
# ==============================================================================
# READY COPY-PASTE VERSION - DO NOT COMMIT (contains worker token)
# Usage in Google Colab:
# 1) Runtime -> Change runtime type -> T4 GPU
# 2) Paste this file into one Colab cell
# 3) Set BACKEND_URL and AI_WORKER_TOKEN below
# 4) Run. No ngrok needed.
# ==============================================================================

import gc
import importlib
import io
import os
import shutil
import subprocess
import sys
import time
import traceback
from typing import Any

# Important for free Colab T4:
# FASHN main torch model should use CUDA, but DWPose/rembg ONNX models can OOM
# when ONNXRuntime grabs another CUDA/CUBLAS handle. Force ONNXRuntime to CPU.
os.environ.setdefault("CUDA_MODULE_LOADING", "LAZY")
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")


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
ensure_package("PIL", "pillow<12")
ensure_package("huggingface_hub")
ensure_package("numpy")
ensure_package("fastapi")
ensure_package("uvicorn")

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

# Optional rembg CPU postprocess. If this causes package trouble, set USE_REMBG = False.
USE_REMBG = True
if USE_REMBG:
    try:
        ensure_package("rembg", "rembg")
        ensure_package("onnxruntime", "onnxruntime")
    except Exception as exc:
        print(f"⚠️ rembg unavailable, continuing without background cleanup: {exc}")
        USE_REMBG = False

import numpy as np
import requests
import torch
from huggingface_hub import hf_hub_download, snapshot_download
from PIL import Image

if USE_REMBG:
    from rembg import remove
else:
    remove = None


def force_onnxruntime_cpu() -> None:
    """Monkey-patch ONNXRuntime sessions to avoid CUDA OOM in DWPose on T4."""
    try:
        import onnxruntime as ort
    except Exception as exc:
        print(f"⚠️ onnxruntime unavailable for CPU patch: {exc}")
        return

    original_session = ort.InferenceSession

    def cpu_session(*args, **kwargs):
        kwargs["providers"] = ["CPUExecutionProvider"]
        return original_session(*args, **kwargs)

    ort.InferenceSession = cpu_session
    print("🧠 ONNXRuntime forced to CPUExecutionProvider (prevents CUDA/CUBLAS OOM)")


force_onnxruntime_cpu()


def patch_sequential_cfg(pipeline: Any) -> None:
    """Run classifier-free guidance sequentially instead of duplicated batch.

    The upstream FASHN forward_for_cfg concatenates conditional + unconditional
    batches before a single forward pass. That is fast, but OOMs on free Colab
    T4. Sequential CFG is slower but uses much less peak VRAM.
    """
    import types

    model = pipeline.tryon_model

    def forward_for_cfg_sequential(self, *args, **kwargs):
        kwargs = {k: v for k, v in kwargs.items() if v is not None}
        noisy_images = args[0]
        batch_size = noisy_images.shape[0]
        device = noisy_images.device

        mask_c = torch.ones(batch_size, device=device, dtype=torch.bool)
        logits = self.forward(*args, **kwargs, mask=mask_c)["x"]
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        mask_u = torch.zeros(batch_size, device=device, dtype=torch.bool)
        null_logits = self.forward(*args, **kwargs, mask=mask_u)["x"]
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        return {"v_c": logits, "v_u": null_logits}

    model.forward_for_cfg = types.MethodType(forward_for_cfg_sequential, model)
    print("🧩 FASHN CFG patched to sequential mode (T4-safe, slower)")


# ==============================================================================
# CONFIG - EDIT THESE TWO VALUES IN COLAB
# ==============================================================================
BACKEND_URL = "https://bumpy-ears-end.loca.lt"
AI_WORKER_TOKEN = "LUy22Sfd05X-qMFlPGXaAmsU_rMaPYCegv6SlP92UIM"
HF_TOKEN = os.environ.get("HF_TOKEN", "") or None
POLL_SECONDS = 5
REQUEST_TIMEOUT = 60

# Output behavior
OUTPUT_BACKGROUND = "white"  # "white" or "transparent"
PREPROCESS_PERSON = True
POSTPROCESS_RESULT = True

_MODELS: dict[str, Any] = {}


def api_headers() -> dict[str, str]:
    return {"X-Worker-Token": AI_WORKER_TOKEN}


def clear_cuda() -> None:
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()


def unload_fashn_pipeline() -> None:
    if "fashn" in _MODELS:
        del _MODELS["fashn"]
    clear_cuda()


def get_fashn_pipeline():
    if "fashn" in _MODELS:
        return _MODELS["fashn"]

    print("📥 Loading FASHN pipeline lazily (first job only)...")
    from fashn_vton import TryOnPipeline

    w_path = snapshot_download(repo_id="fashn-ai/fashn-vton-1.5", token=HF_TOKEN)
    dw_dir = os.path.join(w_path, "dwpose")
    os.makedirs(dw_dir, exist_ok=True)
    for filename in ["yolox_l.onnx", "dw-ll_ucoco_384.onnx"]:
        dest = os.path.join(dw_dir, filename)
        if not os.path.exists(dest):
            tmp_f = hf_hub_download(
                repo_id="fashn-ai/DWPose",
                filename=filename,
                token=HF_TOKEN,
            )
            shutil.copy(tmp_f, dest)

    _MODELS["fashn"] = TryOnPipeline(weights_dir=w_path)
    patch_sequential_cfg(_MODELS["fashn"])
    print("✅ FASHN pipeline ready")
    return _MODELS["fashn"]


def load_image(url: str) -> Image.Image:
    resp = requests.get(url, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    return Image.open(io.BytesIO(resp.content)).convert("RGB")


def crop_center_person(image: Image.Image) -> Image.Image:
    """Remove background if available, crop non-transparent person, center to 768x1024."""
    if not USE_REMBG or remove is None:
        return image.convert("RGB")

    rgba = remove(image).convert("RGBA")
    arr = np.array(rgba)
    alpha = arr[:, :, 3]
    coords = np.column_stack(np.where(alpha > 8))
    if len(coords) == 0:
        return image.convert("RGB")

    y_min, x_min = coords.min(axis=0)
    y_max, x_max = coords.max(axis=0)

    # Safe padding so head/feet are not cut.
    pad_y = int((y_max - y_min) * 0.04)
    pad_x = int((x_max - x_min) * 0.06)
    y_min = max(0, y_min - pad_y)
    x_min = max(0, x_min - pad_x)
    y_max = min(arr.shape[0], y_max + pad_y)
    x_max = min(arr.shape[1], x_max + pad_x)

    person = Image.fromarray(arr[y_min:y_max, x_min:x_max])
    target_w, target_h = 768, 1024
    scale = min(target_w / person.width, target_h / person.height)
    new_size = (max(1, int(person.width * scale)), max(1, int(person.height * scale)))
    person = person.resize(new_size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (target_w, target_h), (255, 255, 255, 0))
    x = (target_w - person.width) // 2
    y = (target_h - person.height) // 2
    canvas.paste(person, (x, y), person)

    # FASHN expects RGB. Put person on white before inference.
    rgb = Image.new("RGB", canvas.size, (255, 255, 255))
    rgb.paste(canvas, (0, 0), canvas)
    return rgb


def clean_result_background(image: Image.Image) -> Image.Image:
    if not POSTPROCESS_RESULT or not USE_REMBG or remove is None:
        return image.convert("RGB")

    rgba = remove(image).convert("RGBA")
    if OUTPUT_BACKGROUND == "transparent":
        return rgba

    canvas = Image.new("RGB", rgba.size, (255, 255, 255))
    canvas.paste(rgba, (0, 0), rgba)
    return canvas


def run_tryon(job: dict[str, Any]) -> bytes:
    person = load_image(job["person_image_url"])
    garment = load_image(job["garment_image_url"])

    if PREPROCESS_PERSON:
        print("📐 Preprocessing person image...")
        person = crop_center_person(person)

    clear_cuda()
    pipeline = get_fashn_pipeline()
    print(f"🎨 Running try-on job {job['id']}...")
    with torch.inference_mode():
        result = pipeline(
            person_image=person,
            garment_image=garment,
            category=job.get("category", "tops"),
            num_timesteps=15,
        )
    out_img = result.images[0]

    print("✨ Postprocessing result...")
    out_img = clean_result_background(out_img)

    buf = io.BytesIO()
    out_img.save(buf, format="PNG")
    clear_cuda()
    return buf.getvalue()


def upload_output(job: dict[str, Any], png_bytes: bytes) -> None:
    resp = requests.put(
        job["output_upload_url"],
        data=png_bytes,
        headers={"Content-Type": "image/png"},
        timeout=REQUEST_TIMEOUT,
    )
    resp.raise_for_status()


def claim_next_job() -> dict[str, Any] | None:
    resp = requests.get(
        f"{BACKEND_URL.rstrip('/')}/api/v1/ai-worker/jobs/next",
        headers=api_headers(),
        timeout=REQUEST_TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json()


def complete_job(job_id: str) -> None:
    resp = requests.post(
        f"{BACKEND_URL.rstrip('/')}/api/v1/ai-worker/jobs/{job_id}/complete",
        headers=api_headers(),
        json={},
        timeout=REQUEST_TIMEOUT,
    )
    resp.raise_for_status()


def fail_job(job_id: str, error: str) -> None:
    requests.post(
        f"{BACKEND_URL.rstrip('/')}/api/v1/ai-worker/jobs/{job_id}/fail",
        headers=api_headers(),
        json={"error": error[:1000]},
        timeout=REQUEST_TIMEOUT,
    )


def main_loop() -> None:
    if AI_WORKER_TOKEN == "REPLACE_WITH_AI_WORKER_TOKEN":
        raise RuntimeError("Set AI_WORKER_TOKEN before starting worker")

    print("🚀 DecaDriver Colab worker started")
    print(f"🔗 Backend: {BACKEND_URL}")
    print("💡 No ngrok needed. Worker pulls jobs from backend.")

    while True:
        job = None
        try:
            job = claim_next_job()
            if not job:
                time.sleep(POLL_SECONDS)
                continue

            print(f"📦 Claimed job {job['id']}")
            png_bytes = run_tryon(job)
            upload_output(job, png_bytes)
            complete_job(job["id"])
            print(f"✅ Completed job {job['id']}")
        except KeyboardInterrupt:
            print("👋 Worker stopped")
            break
        except Exception as exc:
            err = f"{exc}\n{traceback.format_exc()}"
            print(f"❌ Worker error: {err}")
            clear_cuda()
            if "out of memory" in err.lower():
                print("🧹 CUDA OOM detected; unloading FASHN pipeline before next job")
                unload_fashn_pipeline()
            if job and "id" in job:
                try:
                    fail_job(job["id"], err)
                except Exception as fail_exc:
                    print(f"⚠️ Could not mark job failed: {fail_exc}")
            time.sleep(POLL_SECONDS)


main_loop()
