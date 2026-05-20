# ==============================================================================
# 🚀 DECADRIVER ULTIMATE AI HUB (V1.5 MMDiT + REAL VIDEO PRODUCTION)
# ==============================================================================
# Hướng dẫn: 
# 1. Mở Google Colab, chọn Runtime -> Change runtime type -> T4 GPU.
# 2. Dán toàn bộ code này vào ô đầu tiên.
# 3. Nhấn Play (Ctrl + Enter).
# ==============================================================================

# 1. CÀI ĐẶT HỆ THỐNG
# print("📦 Đang chuẩn bị môi trường AI & Video Engine (Mất khoảng 2-3 phút)...")
# !pip install -q fastapi uvicorn pyngrok nest-asyncio boto3 requests pillow sentence-transformers accelerate transformers moviepy
# !pip install -q git+https://github.com/fashn-AI/fashn-vton-1.5.git

import nest_asyncio
import uvicorn
import io, os, requests, torch, uuid, asyncio, shutil, traceback, gc
from pyngrok import ngrok
from fastapi import FastAPI, HTTPException
from PIL import Image
from huggingface_hub import snapshot_download, hf_hub_download
from moviepy.editor import ImageClip

# --- ⚙️ CẤU HÌNH ---
NGROK_TOKEN = os.environ.get("NGROK_TOKEN", "")
HF_TOKEN = os.environ.get("HF_TOKEN", "") 

ngrok.set_auth_token(NGROK_TOKEN)
nest_asyncio.apply()
app = FastAPI(title="DecaDriver Ultimate AI Hub")

_MODELS = {}

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

# --- API ENDPOINTS ---

@app.post("/clip")
async def clip_api(data: dict):
    model = get_model("clip")
    return {"embedding": model.encode(data.get("text", "fashion")).tolist()}

@app.post("/tryon")
async def tryon_api(data: dict):
    try:
        pipeline = get_model("fashn")
        p_img = Image.open(io.BytesIO(requests.get(data["person_image_url"]).content)).convert("RGB")
        g_img = Image.open(io.BytesIO(requests.get(data["garment_image_url"]).content)).convert("RGB")
        with torch.inference_mode():
            result = pipeline(person_image=p_img, garment_image=g_img, category=data.get("category", "tops"), num_timesteps=20)
        result_img = result.images[0]
        
        # Cleanup RAM
        del p_img; del g_img; gc.collect(); torch.cuda.empty_cache()
        
        import boto3
        s3 = boto3.client("s3", aws_access_key_id=data["aws_access_key"], aws_secret_access_key=data["aws_secret_key"], region_name="us-west-2")
        bucket, key = data["output_s3_uri"].replace("s3://", "").split("/", 1)
        buf = io.BytesIO()
        result_img.save(buf, format="PNG")
        buf.seek(0)
        s3.put_object(Bucket=bucket, Key=key, Body=buf, ContentType="image/png")
        return {"status": "success", "s3_uri": data["output_s3_uri"]}
    except Exception as e:
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
async def analyze_api(data: dict): return {"status": "success", "bodyType": "Hourglass"}

@app.post("/train")
async def train_api(data: dict): return {"status": "success", "message": "Training mock OK"}

# --- KHỞI ĐỘNG ---
async def start_server():
    try:
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
