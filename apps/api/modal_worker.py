"""
DecaDriver Modal GPU Worker - demo-safe version.

Public demo/backend contract:
- Backend calls this Modal endpoint through QWEN_API_URL/ai_gateway with task="tryon".
- Payload contains person_image_url, garment_image_url, output_s3_uri, category,
  and optional AWS credentials/region.
- Worker runs real virtual try-on, uploads PNG to output_s3_uri, and returns success.

Onboarding/avatar contract:
- Backend calls task="train" with user_id and image_urls (6 selfies + 2 body refs are OK).
- For the current demo, this creates a clean catalog-like reference image from the
  best full-body/body reference instead of returning a fake queued status.
"""

from __future__ import annotations

import io
import logging
import os
import re

import modal

app = modal.App("decadriver-tryon")
weights_volume = modal.Volume.from_name("decadriver-weights", create_if_missing=True)
logger = logging.getLogger(__name__)

# --- IMAGES -----------------------------------------------------------------

base_image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "libgl1-mesa-glx", "libglib2.0-0", "wget")
    .pip_install("requests", "pillow", "fastapi[standard]", "boto3")
)

clip_image = base_image.pip_install("sentence-transformers>=3.0.0", "torch")

stylist_image = (
    base_image
    .apt_install("libvips-dev")
    .pip_install("torch", "transformers==4.44.0", "timm", "einops", "hf_transfer", "pyvips")
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
)

train_image = (
    base_image
    .pip_install(
        "torch",
        "torchvision",
        "transformers>=4.44.0",
        "accelerate",
        "peft",
        "bitsandbytes",
        "xformers",
        "ftfy",
        "huggingface_hub",
        "boto3",
        "git+https://github.com/huggingface/diffusers.git",
        "git+https://github.com/fashn-AI/fashn-vton-1.5.git",
    )
    .run_commands(
        "wget https://raw.githubusercontent.com/huggingface/diffusers/main/examples/dreambooth/train_dreambooth_lora_sdxl.py -O /train_dreambooth_lora_sdxl.py"
    )
    .env({
        "CUDA_MODULE_LOADING": "LAZY",
        "PYTORCH_CUDA_ALLOC_CONF": "expandable_segments:True",
        # Keep ONNX/DWPose off CUDA where possible; T4 often OOMs when DWPose
        # and FASHN compete for VRAM.
        "ORT_DISABLE_ALL": "1",
    })
)

rembg_image = (
    base_image
    .pip_install(
        "rembg",
        "onnxruntime",
        "opencv-python-headless",
        "numpy<2.3",
        "torch",
        "torchvision",
        "transformers==4.44.0",
        "scikit-image",
        "boto3",
    )
    .env({"U2NET_HOME": "/weights/u2net"})
)

avatar_image = (
    base_image
    .apt_install("libgl1-mesa-glx", "libglib2.0-0")
    .pip_install(
        "torch",
        "torchvision",
        "transformers>=4.45.0",
        "diffusers",
        "accelerate",
        "insightface",
        "facexlib",
        "onnxruntime-gpu",
        "opencv-python",
        "controlnet_aux",
        "huggingface_hub",
        "boto3",
    )
)


def _parse_s3_uri(uri: str) -> tuple[str, str]:
    if not uri or not uri.startswith("s3://"):
        raise ValueError(f"Expected s3:// URI, got {uri!r}")
    bucket, key = uri.removeprefix("s3://").split("/", 1)
    return bucket, key


def _make_s3_client(data: dict):
    import boto3

    kwargs = {"region_name": data.get("region") or data.get("aws_region") or os.environ.get("AWS_REGION", "us-west-2")}
    if data.get("aws_access_key") and data.get("aws_secret_key"):
        kwargs["aws_access_key_id"] = data["aws_access_key"]
        kwargs["aws_secret_access_key"] = data["aws_secret_key"]
        if data.get("aws_session_token"):
            kwargs["aws_session_token"] = data["aws_session_token"]
    return boto3.client("s3", **kwargs)


def _category_for_fashn(raw: str | None) -> str:
    text = (raw or "tops").lower().strip()
    if text in {"one-piece", "one_pieces", "one-pieces", "dress", "dresses"}:
        return "dresses"
    if text in {"bottom", "bottoms", "pants", "skirt"}:
        return "bottoms"
    return "tops"


# --- 1. CLIP FUNCTION --------------------------------------------------------

@app.function(image=clip_image, gpu="T4", volumes={"/weights": weights_volume})
def clip_fn(data: dict):
    from sentence_transformers import SentenceTransformer

    model_path = "/weights/clip-ViT-L-14"
    if not os.path.exists(model_path):
        model = SentenceTransformer("clip-ViT-L-14")
        model.save(model_path)
        weights_volume.commit()
    else:
        model = SentenceTransformer(model_path)

    text = data.get("text")
    if text:
        return {"status": "success", "embedding": model.encode(text).tolist()}
    return {"status": "error", "error": "No text provided"}


# --- 2. STYLIST FUNCTION -----------------------------------------------------

@app.function(image=stylist_image, gpu="T4", volumes={"/weights": weights_volume})
def analyze_fn(data: dict):
    import glob
    import json
    import shutil
    import sys

    import requests
    import torch
    from huggingface_hub import snapshot_download
    from PIL import Image
    from transformers import AutoTokenizer

    model_path = "/weights/moondream2_final_snapshot"
    if not os.path.exists(os.path.join(model_path, "moondream.py")):
        snapshot_download(
            repo_id="vikhyatk/moondream2",
            revision="92d3d73b6fd61ab84d9fe093a9c7fd8c04bf2c0d",
            local_dir=model_path,
            local_dir_use_symlinks=False,
        )
        weights_volume.commit()

    pkg_dir = "/tmp/moondream_pkg"
    if not os.path.exists(pkg_dir):
        os.makedirs(pkg_dir, exist_ok=True)
        for py_file in glob.glob(os.path.join(model_path, "*.py")):
            shutil.copy(py_file, pkg_dir)
        with open(os.path.join(pkg_dir, "__init__.py"), "w") as f:
            f.write("")
    sys.path.append(os.path.dirname(pkg_dir))

    from moondream_pkg.configuration_moondream import MoondreamConfig
    from moondream_pkg.moondream import Moondream

    config_path = os.path.join(model_path, "config.json")
    with open(config_path) as f:
        config_dict = json.load(f)
    if "auto_map" in config_dict:
        config_dict.pop("auto_map")
        with open(config_path, "w") as f:
            json.dump(config_dict, f)

    config = MoondreamConfig.from_pretrained(model_path)
    model = Moondream.from_pretrained(model_path, config=config, torch_dtype=torch.float16).to("cuda")
    tokenizer = AutoTokenizer.from_pretrained(model_path)

    image_resp = requests.get(data.get("image_url"), timeout=30)
    image_resp.raise_for_status()
    raw_image = Image.open(io.BytesIO(image_resp.content)).convert("RGB")
    with torch.inference_mode():
        enc_image = model.encode_image(raw_image)
        answer = model.answer_question(enc_image, data.get("prompt", "Describe the clothing"), tokenizer)
    return {"status": "success", "analysis": answer}


# --- 3. BACKGROUND REMOVAL / CATALOG PREPROCESS -----------------------------

@app.function(image=rembg_image, gpu="T4", volumes={"/weights": weights_volume})
def remove_bg_fn(data: dict):
    import base64

    import numpy as np
    import requests
    from PIL import Image
    from rembg import new_session, remove

    img_b64 = data.get("image_b64")
    img_url = data.get("image_url")
    if img_b64:
        orig_image = Image.open(io.BytesIO(base64.b64decode(img_b64))).convert("RGB")
    elif img_url:
        image_resp = requests.get(img_url, timeout=30)
        image_resp.raise_for_status()
        orig_image = Image.open(io.BytesIO(image_resp.content)).convert("RGB")
    else:
        return {"status": "error", "error": "No image source provided"}

    # Use rembg's human segmentation model for catalog/reference photos. The
    # previous generic RMBG path often kept the whole outdoor background as alpha,
    # which made onboarding references look less like studio/catalog photos.
    session = new_session("u2net_human_seg", providers=["CPUExecutionProvider"])
    result = remove(orig_image, session=session).convert("RGBA")

    if data.get("catalog_canvas", False):
        arr = np.array(result)
        alpha = arr[:, :, 3]
        coords = np.column_stack(np.where(alpha > 20))
        if coords.size:
            y_min, x_min = coords.min(axis=0)
            y_max, x_max = coords.max(axis=0)
            person = result.crop((x_min, y_min, x_max + 1, y_max + 1))
            canvas = Image.new("RGBA", (768, 1024), (255, 255, 255, 0))
            scale = min(700 / person.width, 960 / person.height)
            resized = person.resize((int(person.width * scale), int(person.height * scale)), Image.Resampling.LANCZOS)
            canvas.alpha_composite(resized, ((768 - resized.width) // 2, 1024 - resized.height - 12))
            result = canvas

    if data.get("white_background", False):
        bg = Image.new("RGB", result.size, "white")
        bg.paste(result, mask=result.split()[-1])
        result = bg

    output_s3_uri = data.get("output_s3_uri")
    if output_s3_uri:
        buf = io.BytesIO()
        result.save(buf, format="PNG")
        bucket, key = _parse_s3_uri(output_s3_uri)
        _make_s3_client(data).put_object(Bucket=bucket, Key=key, Body=buf.getvalue(), ContentType="image/png")
        return {"status": "success", "output_s3_uri": output_s3_uri}

    buf = io.BytesIO()
    result.save(buf, format="PNG")
    return {"status": "success", "image_b64": base64.b64encode(buf.getvalue()).decode("utf-8")}


# --- 4. AVATAR GENERATION FUNCTION ------------------------------------------

@app.function(image=avatar_image, gpu="A10G", volumes={"/weights": weights_volume}, timeout=600)
def generate_avatar_fn(data: dict):
    """Optional SDXL avatar generator kept for richer demos."""
    import base64

    import numpy as np
    import requests
    import torch
    from controlnet_aux import OpenposeDetector
    from diffusers import ControlNetModel, StableDiffusionXLControlNetPipeline
    from PIL import Image

    weights_path = "/weights/avatar_models"
    os.makedirs(weights_path, exist_ok=True)
    swapper_path = os.path.join(weights_path, "inswapper_128.onnx")
    if not os.path.exists(swapper_path):
        import urllib.request
        urllib.request.urlretrieve(
            "https://huggingface.co/ezioruan/inswapper_128.onnx/resolve/main/inswapper_128.onnx",
            swapper_path,
        )
        weights_volume.commit()

    controlnet = ControlNetModel.from_pretrained("thibaud/controlnet-openpose-sdxl-1.0", torch_dtype=torch.float16).to("cuda")
    pipe = StableDiffusionXLControlNetPipeline.from_pretrained(
        "stabilityai/stable-diffusion-xl-base-1.0",
        controlnet=controlnet,
        torch_dtype=torch.float16,
        variant="fp16",
    ).to("cuda")
    pipe.enable_model_cpu_offload()

    pose_resp = requests.get(data.get("pose_image_url"), timeout=30)
    pose_resp.raise_for_status()
    pose_ref_img = Image.open(io.BytesIO(pose_resp.content)).convert("RGB")
    openpose = OpenposeDetector.from_pretrained("lllyasviel/ControlNet")
    pose_image = openpose(pose_ref_img)

    prompt = data.get("prompt", "a high quality professional studio photo of a person, fashion model, standing, highly detailed")
    refined_prompt = f"{prompt}, centered, full body, solo, single subject, clean studio background"
    gen_image = pipe(
        refined_prompt,
        negative_prompt=data.get("negative_prompt", "lowres, bad anatomy, bad hands, text, watermark, blurry, multiple people, cropped"),
        image=pose_image,
        num_inference_steps=30,
    ).images[0]

    face_url = data.get("face_image_url")
    if face_url:
        import insightface
        from insightface.app import FaceAnalysis

        face_resp = requests.get(face_url, timeout=30)
        face_resp.raise_for_status()
        user_face_img = Image.open(io.BytesIO(face_resp.content)).convert("RGB")
        app_face = FaceAnalysis(name="buffalo_l", providers=["CUDAExecutionProvider", "CPUExecutionProvider"])
        app_face.prepare(ctx_id=0, det_size=(640, 640))
        source_faces = app_face.get(np.array(user_face_img))
        target_faces = app_face.get(np.array(gen_image))
        if source_faces and target_faces:
            swapper = insightface.model_zoo.get_model(swapper_path, providers=["CUDAExecutionProvider", "CPUExecutionProvider"])
            source_face = max(source_faces, key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]))
            target_face = max(target_faces, key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]))
            gen_image = Image.fromarray(swapper.get(np.array(gen_image), target_face, source_face, paste_back=True))

    if data.get("remove_bg"):
        buf = io.BytesIO()
        gen_image.save(buf, format="PNG")
        return remove_bg_fn.remote({"image_b64": base64.b64encode(buf.getvalue()).decode(), "white_background": True})

    buf = io.BytesIO()
    gen_image.save(buf, format="PNG")
    return {"status": "success", "image_b64": base64.b64encode(buf.getvalue()).decode("utf-8")}


# --- 5. AVATAR REFERENCE / LORA TRAINING TASK -------------------------------

@app.function(image=rembg_image, gpu="T4", timeout=900, volumes={"/weights": weights_volume})
def train_avatar_task(data: dict):
    """Create a real reference_image_url from onboarding images.

    The frontend onboarding currently collects 6 selfies + 2 full-body references.
    For try-on, FASHN needs a full-body person image, so this picks the most likely
    body/reference image (later uploads or explicit body_image_urls), removes bg,
    centers it on 768x1024, uploads it to S3, and returns success synchronously.
    """
    import uuid

    user_id = data.get("user_id")
    image_urls = data.get("image_urls") or []
    body_urls = data.get("body_image_urls") or []
    if not user_id or not image_urls:
        return {"status": "error", "error": "user_id and image_urls are required"}

    # Prefer explicit body refs; otherwise use the last uploaded image because the
    # current onboarding order is selfies first, full-body photos last.
    source_url = (body_urls[-1] if body_urls else image_urls[-1])
    output_s3_uri = data.get("output_s3_uri")
    if not output_s3_uri:
        bucket = data.get("bucket") or data.get("ai_s3_bucket") or os.environ.get("AI_S3_BUCKET")
        if not bucket:
            # Infer bucket from first uploaded s3:// URL if present.
            for url in image_urls:
                if isinstance(url, str) and url.startswith("s3://"):
                    bucket, _ = _parse_s3_uri(url)
                    break
        if not bucket:
            return {"status": "error", "error": "No output_s3_uri or AI_S3_BUCKET provided"}
        output_s3_uri = f"s3://{bucket}/avatars/{user_id}/reference_{uuid.uuid4().hex}.png"

    result = remove_bg_fn.remote({
        **data,
        "image_url": source_url,
        "output_s3_uri": output_s3_uri,
        "catalog_canvas": True,
        "white_background": True,
    })
    if result.get("status") != "success":
        return result

    return {
        "status": "success",
        "reference_image_url": output_s3_uri,
        # Kept for DB compatibility. Real DreamBooth can be added later, but the
        # demo try-on now uses a real cleaned body reference instead of a mock.
        "lora_s3_key": f"avatars/{user_id}/reference-only",
        "source_image_url": source_url,
    }


# --- 6. VIRTUAL TRY-ON TASK --------------------------------------------------

@app.function(image=train_image, gpu="A10G", timeout=900, volumes={"/weights": weights_volume})
def run_tryon_job(job: dict) -> bytes:
    import requests
    import torch
    from fashn_vton import TryOnPipeline
    from huggingface_hub import snapshot_download
    from PIL import Image

    weights_path = "/weights/fashn-vton-1.5"
    if not os.path.exists(weights_path):
        snapshot_download(repo_id="fashn-ai/fashn-vton-1.5", local_dir=weights_path, local_dir_use_symlinks=False)
        weights_volume.commit()

    dwpose_path = os.path.join(weights_path, "dwpose")
    if not os.path.exists(dwpose_path):
        os.makedirs(dwpose_path, exist_ok=True)
        snapshot_download(repo_id="yzd-v/DWPose", local_dir=dwpose_path, local_dir_use_symlinks=False)
        weights_volume.commit()

    p_resp = requests.get(job["person_image_url"], timeout=60)
    p_resp.raise_for_status()
    g_resp = requests.get(job["garment_image_url"], timeout=60)
    g_resp.raise_for_status()

    # Preprocess person to match the catalog expectation from onboarding/demo.
    p_b64_buf = io.BytesIO(p_resp.content)
    import base64
    prep = remove_bg_fn.remote({
        "image_b64": base64.b64encode(p_b64_buf.getvalue()).decode(),
        "catalog_canvas": True,
        "white_background": True,
    })
    if prep.get("status") == "success" and prep.get("image_b64"):
        person_img = Image.open(io.BytesIO(base64.b64decode(prep["image_b64"]))).convert("RGB")
    else:
        person_img = Image.open(io.BytesIO(p_resp.content)).convert("RGB")

    garment_img = Image.open(io.BytesIO(g_resp.content)).convert("RGB")
    pipeline = TryOnPipeline(weights_dir=weights_path)
    with torch.inference_mode():
        result = pipeline(
            person_image=person_img,
            garment_image=garment_img,
            category=_category_for_fashn(job.get("category")),
            num_timesteps=int(job.get("num_timesteps", 20)),
        )

    out = result.images[0]
    # Clean final background for teacher-facing catalog output.
    buf = io.BytesIO()
    out.save(buf, format="PNG")
    post = remove_bg_fn.remote({
        "image_b64": base64.b64encode(buf.getvalue()).decode(),
        "white_background": True,
    })
    if post.get("status") == "success" and post.get("image_b64"):
        return base64.b64decode(post["image_b64"])

    buf = io.BytesIO()
    out.save(buf, format="PNG")
    return buf.getvalue()


# --- UNIFIED GATEWAY ENDPOINT ------------------------------------------------

@app.function(image=base_image, secrets=[modal.Secret.from_name("decadriver-backend")], timeout=1200)
@modal.fastapi_endpoint(method="POST")
async def ai_gateway(data: dict):
    task = data.get("task")
    if not task:
        return {"status": "error", "error": "No task specified"}

    logger.info("Gateway routing task=%s", task)
    try:
        if task == "clip":
            return clip_fn.remote(data)
        if task == "analyze":
            return analyze_fn.remote(data)
        if task == "remove_bg":
            return remove_bg_fn.remote(data)
        if task == "generate_avatar":
            return generate_avatar_fn.remote(data)
        if task == "train":
            return train_avatar_task.remote(data)
        if task == "tryon":
            png_bytes = run_tryon_job.remote(data)
            output_s3_uri = data.get("output_s3_uri")
            if not output_s3_uri:
                import base64
                return {"status": "success", "image_b64": base64.b64encode(png_bytes).decode("utf-8")}
            bucket, key = _parse_s3_uri(output_s3_uri)
            _make_s3_client(data).put_object(Bucket=bucket, Key=key, Body=png_bytes, ContentType="image/png")
            return {"status": "success", "output_s3_uri": output_s3_uri}
        return {"status": "error", "error": f"Unknown task: {task}"}
    except Exception as exc:
        logger.exception("AI gateway task failed: %s", task)
        return {"status": "error", "error": str(exc)}


@app.function(image=base_image, schedule=modal.Period(seconds=30), secrets=[modal.Secret.from_name("decadriver-backend")], timeout=1200)
def poll_jobs():
    """Optional pull-worker mode for authenticated /tryon queue."""
    import requests

    backend_url = os.environ.get("BACKEND_URL", "").rstrip("/")
    if not backend_url or "172.26" in backend_url:
        return
    worker_token = os.environ.get("AI_WORKER_TOKEN")
    worker_id = os.environ.get("WORKER_ID", "modal-worker-01")
    headers = {"X-Worker-Token": worker_token or "", "X-Worker-Id": worker_id}

    try:
        requests.post(
            f"{backend_url}/api/v1/ai-worker/heartbeat",
            headers={"X-Worker-Token": worker_token or ""},
            json={"worker_id": worker_id, "gpu": "A10G", "vram_gb": 24, "engines": ["fashn"], "status": "idle"},
            timeout=10,
        )
        resp = requests.get(f"{backend_url}/api/v1/ai-worker/jobs/next", headers=headers, timeout=10)
        resp.raise_for_status()
        job = resp.json()
        if not job:
            return

        png_bytes = run_tryon_job.remote(job)
        requests.put(job["output_upload_url"], data=png_bytes, headers={"Content-Type": "image/png"}, timeout=120).raise_for_status()
        requests.post(
            f"{backend_url}/api/v1/ai-worker/jobs/{job['id']}/complete",
            headers={"X-Worker-Token": worker_token or ""},
            json={"result_url": job.get("output_s3_uri")},
            timeout=10,
        ).raise_for_status()
    except Exception as exc:
        logger.exception("poll_jobs failed")
        job_id_match = re.search(r"'id': '([^']+)'", str(locals().get("job", {})))
        if job_id_match:
            try:
                requests.post(
                    f"{backend_url}/api/v1/ai-worker/jobs/{job_id_match.group(1)}/fail",
                    headers={"X-Worker-Token": worker_token or ""},
                    json={"error": str(exc)},
                    timeout=10,
                )
            except Exception:
                pass
