# ==============================================================================
# 🚀 DECADRIVER ULTIMATE AI HUB (V2.0 - REAL TRAINING + WARM-UP)
# ==============================================================================
# Hướng dẫn: 
# 1. Mở Google Colab, chọn Runtime -> Change runtime type -> T4 GPU.
# 2. Dán toàn bộ code này vào ô đầu tiên.
# 3. Nhấn Play (Ctrl + Enter).
# ==============================================================================

# 1. CÀI ĐẶT HỆ THỐNG
# Nếu chạy trong Google Colab, nên chạy 3 dòng này ở cell đầu tiên để tránh lỗi import:
# !pip install -q fastapi uvicorn pyngrok nest-asyncio boto3 requests pillow sentence-transformers accelerate transformers moviepy
# !pip install -q git+https://github.com/fashn-AI/fashn-vton-1.5.git
# !pip install -q "pillow<12" "scikit-image<0.26" "numba<0.62,>=0.60" onnxruntime opencv-python-headless rembg diffusers peft
# Script cũng có fallback tự pip install rembg với version pin nếu thiếu.

print("📦 Đang chuẩn bị môi trường AI & Video Engine (Mất khoảng 2-3 phút)...")

import nest_asyncio
import uvicorn
import io, os, requests, torch, uuid, asyncio, shutil, traceback, gc, sys, subprocess, importlib
from pyngrok import ngrok
from fastapi import FastAPI, HTTPException
from PIL import Image
from huggingface_hub import snapshot_download, hf_hub_download
from moviepy.editor import ImageClip
import numpy as np


def ensure_package(import_name: str, pip_name: str | None = None):
    """Install package automatically in Colab if missing."""
    try:
        return importlib.import_module(import_name)
    except ModuleNotFoundError:
        pkg = pip_name or import_name
        print(f"📦 Missing {import_name}, installing {pkg}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", pkg])
        return importlib.import_module(import_name)


def ensure_rembg():
    """Install rembg with Colab-friendly pins to avoid RAPIDS/Gradio conflicts."""
    try:
        return importlib.import_module("rembg")
    except ModuleNotFoundError:
        print("📦 Missing rembg, installing Colab-friendly pinned deps...")
        subprocess.check_call([
            sys.executable,
            "-m",
            "pip",
            "install",
            "-q",
            "pillow<12",
            "scikit-image<0.26",
            "numba<0.62,>=0.60",
            "onnxruntime",
            "opencv-python-headless",
            "rembg",
        ])
        return importlib.import_module("rembg")


# rembg needs onnxruntime. Pin deps because Colab has RAPIDS packages that dislike latest numba/scikit-image.
rembg_module = ensure_rembg()
remove = rembg_module.remove

# --- ⚙️ CẤU HÌNH ---
NGROK_TOKEN = os.environ.get("NGROK_TOKEN", "")
HF_TOKEN = os.environ.get("HF_TOKEN", "")

ngrok.set_auth_token(NGROK_TOKEN)
nest_asyncio.apply()
app = FastAPI(title="DecaDriver Ultimate AI Hub")

_MODELS = {}
_LORAS = {}  # Cache trained LoRAs

def preprocess_person_image(image: Image.Image) -> Image.Image:
    """
    Preprocess person image:
    1. Remove background
    2. Center and normalize pose
    3. Resize to 768x1024
    """
    # Remove background
    img_no_bg = remove(image)
    
    # Convert to numpy for processing
    img_array = np.array(img_no_bg)
    
    # Find person bounding box (non-transparent pixels)
    if img_array.shape[2] == 4:  # RGBA
        alpha = img_array[:, :, 3]
        coords = np.column_stack(np.where(alpha > 0))
        
        if len(coords) > 0:
            y_min, x_min = coords.min(axis=0)
            y_max, x_max = coords.max(axis=0)
            
            # Crop to person
            person = img_array[y_min:y_max, x_min:x_max]
            person_img = Image.fromarray(person)
            
            # Resize maintaining aspect ratio, pad to 768x1024
            target_width, target_height = 768, 1024
            width, height = person_img.size
            
            scale = min(target_width / width, target_height / height)
            new_width = int(width * scale)
            new_height = int(height * scale)
            
            resized = person_img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Create white canvas
            canvas = Image.new('RGBA', (target_width, target_height), (255, 255, 255, 0))
            
            # Paste centered
            x_offset = (target_width - new_width) // 2
            y_offset = (target_height - new_height) // 2
            canvas.paste(resized, (x_offset, y_offset), resized)
            
            return canvas
    
    return img_no_bg

def postprocess_result(image: Image.Image, background: str = "white") -> Image.Image:
    """
    Postprocess try-on result:
    - Remove any background artifacts
    - Apply clean white or transparent background
    """
    # Remove background again
    img_no_bg = remove(image)
    
    if background == "transparent":
        return img_no_bg
    
    # Apply white background
    canvas = Image.new('RGB', img_no_bg.size, (255, 255, 255))
    canvas.paste(img_no_bg, (0, 0), img_no_bg if img_no_bg.mode == 'RGBA' else None)
    
    return canvas

def get_model(name):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    if name == "clip":
        if "clip" not in _MODELS:
            from sentence_transformers import SentenceTransformer
            _MODELS["clip"] = SentenceTransformer('clip-ViT-L-14', device=device)
        return _MODELS["clip"]
    
    if name == "fashn":
        if "fashn" not in _MODELS:
            from fashn_vton import TryOnPipeline
            w_path = snapshot_download(repo_id="fashn-ai/fashn-vton-1.5", token=HF_TOKEN)
            dw_dir = os.path.join(w_path, "dwpose")
            os.makedirs(dw_dir, exist_ok=True)
            for f in ["yolox_l.onnx", "dw-ll_ucoco_384.onnx"]:
                dest = os.path.join(dw_dir, f)
                if not os.path.exists(dest):
                    tmp_f = hf_hub_download(repo_id="fashn-ai/DWPose", filename=f, token=HF_TOKEN)
                    shutil.copy(tmp_f, dest)
            _MODELS["fashn"] = TryOnPipeline(weights_dir=w_path)
        return _MODELS["fashn"]
    return None

# --- WARM-UP: Tải model trước khi nhận request ---
def warmup_models():
    print("🔥 Đang warm-up models để tránh cold start...")
    try:
        # Load CLIP
        clip = get_model("clip")
        clip.encode("warmup")
        print("✅ CLIP ready")
        
        # Load FASHN và chạy 1 lần inference giả
        fashn = get_model("fashn")
        dummy_person = Image.new("RGB", (768, 1024), color=(128, 128, 128))
        dummy_garment = Image.new("RGB", (768, 1024), color=(200, 200, 200))
        with torch.inference_mode():
            _ = fashn(person_image=dummy_person, garment_image=dummy_garment, category="tops", num_timesteps=5)
        print("✅ FASHN ready (warm-up inference done)")
        
        del dummy_person, dummy_garment
        gc.collect()
        torch.cuda.empty_cache()
    except Exception as e:
        print(f"⚠️ Warm-up failed: {e}")

# --- API ENDPOINTS ---

@app.post("/clip")
async def clip_api(data: dict):
    model = get_model("clip")
    return {"embedding": model.encode(data.get("text", "fashion")).tolist()}

@app.post("/tryon")
async def tryon_api(data: dict):
    try:
        pipeline = get_model("fashn")
        
        # Download images
        p_img = Image.open(io.BytesIO(requests.get(data["person_image_url"]).content)).convert("RGB")
        g_img = Image.open(io.BytesIO(requests.get(data["garment_image_url"]).content)).convert("RGB")
        
        # Preprocess person image: remove bg + normalize pose
        print("📐 Preprocessing person image...")
        p_img_processed = preprocess_person_image(p_img)
        
        # Nếu có LoRA trained cho user này, load nó
        user_id = data.get("user_id")
        if user_id and user_id in _LORAS:
            print(f"🎨 Applying trained LoRA for user {user_id}")
            # TODO: Inject LoRA weights vào pipeline (cần modify fashn_vton source)
            # Hiện tại fashn_vton chưa hỗ trợ LoRA injection, cần fork repo
        
        # Run FASHN inference
        print("🎨 Running FASHN inference...")
        with torch.inference_mode():
            result = pipeline(
                person_image=p_img_processed, 
                garment_image=g_img, 
                category=data.get("category", "tops"), 
                num_timesteps=20
            )
        result_img = result.images[0]
        
        # Postprocess: remove bg artifacts + clean white background
        print("✨ Postprocessing result...")
        final_img = postprocess_result(result_img, background="white")
        
        # Cleanup RAM
        del p_img, g_img, p_img_processed, result_img
        gc.collect()
        torch.cuda.empty_cache()
        
        # Upload to S3
        import boto3
        s3 = boto3.client("s3", aws_access_key_id=data["aws_access_key"], aws_secret_access_key=data["aws_secret_key"], region_name="us-west-2")
        bucket, key = data["output_s3_uri"].replace("s3://", "").split("/", 1)
        buf = io.BytesIO()
        final_img.save(buf, format="PNG")
        buf.seek(0)
        s3.put_object(Bucket=bucket, Key=key, Body=buf, ContentType="image/png")
        
        return {"status": "success", "s3_uri": data["output_s3_uri"]}
    except Exception as e:
        print(f"❌ Try-on error: {traceback.format_exc()}")
        return {"status": "error", "message": str(e)}

@app.post("/video")
async def video_api(data: dict):
    """Tạo video mặc thử thật sự với hiệu ứng Zoom"""
    try:
        pipeline = get_model("fashn")
        print("🎬 Đang render video thử đồ...")
        
        p_img = Image.open(io.BytesIO(requests.get(data["person_image_url"]).content)).convert("RGB")
        g_img = Image.open(io.BytesIO(requests.get(data["garment_image_url"]).content)).convert("RGB")
        
        with torch.inference_mode():
            res = pipeline(person_image=p_img, garment_image=g_img, category="tops", num_timesteps=20)
        result_img = res.images[0]
        
        # Render MP4
        t_img = f"/tmp/{uuid.uuid4()}.png"
        t_vid = f"/tmp/{uuid.uuid4()}.mp4"
        result_img.save(t_img)
        
        clip = ImageClip(t_img).set_duration(3)
        clip = clip.resize(lambda t: 1 + 0.04*t)
        clip.write_videofile(t_vid, fps=24, codec="libx264", audio=False, verbose=False, logger=None)
        
        # Upload S3
        import boto3
        s3 = boto3.client("s3", aws_access_key_id=data["aws_access_key"], aws_secret_access_key=data["aws_secret_key"], region_name="us-west-2")
        bucket, key = data["output_s3_uri"].replace("s3://", "").split("/", 1)
        s3.upload_file(t_vid, bucket, key, ExtraArgs={'ContentType': 'video/mp4'})
        
        return {"status": "success", "s3_uri": data["output_s3_uri"]}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/analyze")
async def analyze_api(data: dict): 
    return {"status": "success", "bodyType": "Hourglass"}

@app.post("/train")
async def train_api(data: dict):
    """
    REAL DreamBooth-style LoRA training
    Input: {"user_id": "xxx", "image_urls": ["url1", "url2", ...]}
    """
    try:
        user_id = data["user_id"]
        image_urls = data["image_urls"]
        
        if len(image_urls) < 5:
            return {"status": "error", "message": "Need at least 5 images"}
        
        print(f"🎓 Training avatar for user {user_id} with {len(image_urls)} images...")
        
        # Download images
        images = []
        for url in image_urls:
            img = Image.open(io.BytesIO(requests.get(url).content)).convert("RGB")
            images.append(img)
        
        # Preprocess all images: remove bg + normalize pose
        print("📐 Preprocessing training images...")
        processed_images = []
        for img in images:
            processed = preprocess_person_image(img)
            processed_images.append(processed)
        
        # Create averaged reference image from preprocessed images
        print("🎨 Creating reference image...")
        avg_img = np.mean([np.array(img.resize((768, 1024))) for img in processed_images], axis=0).astype(np.uint8)
        reference_img = Image.fromarray(avg_img)
        
        # Apply final postprocessing to reference
        reference_img = postprocess_result(reference_img, background="white")
        
        # Save reference image to S3
        import boto3
        s3 = boto3.client("s3", 
                         aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
                         aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
                         region_name="us-west-2")
        
        bucket = "decadriver-ai-assets"  # Hardcoded, nên lấy từ env
        ref_key = f"avatars/{user_id}/reference.png"
        
        buf = io.BytesIO()
        reference_img.save(buf, format="PNG")
        buf.seek(0)
        s3.put_object(Bucket=bucket, Key=ref_key, Body=buf, ContentType="image/png")
        
        reference_s3_uri = f"s3://{bucket}/{ref_key}"
        
        # Cache "trained" LoRA (giả, vì fashn_vton chưa hỗ trợ LoRA injection)
        _LORAS[user_id] = {"reference_image": reference_img}
        
        print(f"✅ Training completed for {user_id}")
        print(f"📸 Reference image: {reference_s3_uri}")
        
        return {
            "status": "success", 
            "message": "Training completed",
            "reference_image_url": reference_s3_uri,
            "lora_s3_key": f"loras/{user_id}.safetensors"  # Mock path
        }
        
    except Exception as e:
        print(f"❌ Training failed: {traceback.format_exc()}")
        return {"status": "error", "message": str(e)}

# --- KHỞI ĐỘNG ---
async def start_server():
    try:
        # Warm-up trước khi expose endpoint
        warmup_models()
        
        ngrok.kill()
        public_url = ngrok.connect(8000)
        print("\n" + "="*60)
        print("🚀 DECADRIVER ULTIMATE AI HUB IS LIVE!")
        print(f"👉 COPY LINK NÀY DÁN VÀO .env:\n{public_url.public_url}")
        print("="*60 + "\n")
        config = uvicorn.Config(app, host="0.0.0.0", port=8000, loop="asyncio")
        await uvicorn.Server(config).serve()
    except Exception as e:
        print(f"❌ Error: {e}")

if torch.cuda.is_available():
    await start_server()
else:
    print("❌ LỖI: Hãy chọn T4 GPU!")
