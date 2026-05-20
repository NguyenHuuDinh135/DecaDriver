# ==============================================================================
# 🎬 DECADRIVER HIGH-FIDELITY VIDEO HUB (STABLE VIDEO DIFFUSION)
# ==============================================================================
# Hướng dẫn: 
# 1. Dùng một account Google KHÁC (hoặc tab ẩn danh) để có thêm 1 GPU T4.
# 2. Chọn Runtime -> Change runtime type -> T4 GPU.
# 3. Dán code này vào và nhấn Play.
# ==============================================================================

# 1. CÀI ĐẶT HỆ THỐNG VIDEO CHUYÊN DỤNG
print("📦 Đang thiết lập xưởng phim AI (Mất khoảng 3-4 phút)...")
!pip install -q fastapi uvicorn pyngrok nest-asyncio boto3 requests pillow diffusers accelerate transformers

import nest_asyncio
import uvicorn
import io, os, requests, torch, uuid, asyncio, gc
from pyngrok import ngrok
from fastapi import FastAPI, HTTPException
from PIL import Image
from diffusers import StableVideoDiffusionPipeline
from diffusers.utils import load_image, export_to_video

# --- ⚙️ CẤU HÌNH ---
NGROK_TOKEN = os.environ.get("NGROK_TOKEN", "")
ngrok.set_auth_token(NGROK_TOKEN)
nest_asyncio.apply()
app = FastAPI(title="DecaDriver Video Production Hub")

# --- 🧠 NẠP MODEL VIDEO (STABLE VIDEO DIFFUSION) ---
_PIPE = None

def get_video_pipeline():
    global _PIPE
    if _PIPE is None:
        print("📥 Đang tải bộ não Video SVD-XT (Cực nặng, vui lòng đợi)...")
        _PIPE = StableVideoDiffusionPipeline.from_pretrained(
            "stabilityai/stable-video-diffusion-img2vid-xt",
            torch_dtype=torch.float16,
            variant="fp16"
        )
        _PIPE.enable_model_cpu_offload() # Tối ưu để chạy được trên T4
        print("✅ Model Video đã sẵn sàng!")
    return _PIPE

# --- API ENDPOINT ---

@app.post("/generate-video")
async def generate_video_api(data: dict):
    """Biến ảnh Try-on thành Video cử động thật sự"""
    try:
        pipe = get_video_pipeline()
        print(f"🎬 Đang render video cho: {data.get('output_s3_uri')}")
        
        # 1. Tải ảnh gốc (Kết quả từ FASHN)
        image = Image.open(io.BytesIO(requests.get(data["person_image_url"]).content)).convert("RGB")
        image = image.resize((512, 512)) # SVD tốt nhất ở size này
        
        # 2. Chạy AI Video Generation
        generator = torch.manual_seed(42)
        frames = pipe(
            image, 
            decode_chunk_size=8, 
            generator=generator,
            motion_bucket_id=127, # Mức độ cử động (0-255)
            noise_aug_strength=0.1
        ).frames[0]
        
        # 3. Xuất file MP4
        temp_vid_path = f"/tmp/{uuid.uuid4()}.mp4"
        export_to_video(frames, temp_vid_path, fps=7)
        
        # 4. Upload lên S3
        import boto3
        s3 = boto3.client(
            "s3", 
            aws_access_key_id=data["aws_access_key"], 
            aws_secret_access_key=data["aws_secret_key"], 
            region_name=data.get("region", "us-west-2")
        )
        bucket, key = data["output_s3_uri"].replace("s3://", "").split("/", 1)
        s3.upload_file(temp_vid_path, bucket, key, ExtraArgs={'ContentType': 'video/mp4'})
        
        # Cleanup
        del frames; gc.collect(); torch.cuda.empty_cache()
        
        print("✅ VIDEO PRODUCTION SUCCESS!")
        return {"status": "success", "s3_uri": data["output_s3_uri"]}
    except Exception as e:
        import traceback
        print(f"❌ LỖI RENDER: {traceback.format_exc()}")
        return {"status": "error", "message": str(e)}

# --- KHỞI ĐỘNG ---
async def start_server():
    try:
        ngrok.kill()
        public_url = ngrok.connect(8000)
        print("\n" + "="*60)
        print("🚀 DECADRIVER VIDEO HUB IS LIVE!")
        print(f"👉 COPY LINK NÀY DÁN VÀO .env (VIDEO_API_URL):\n{public_url.public_url}")
        print("="*60 + "\n")
        config = uvicorn.Config(app, host="0.0.0.0", port=8000, loop="asyncio")
        await uvicorn.Server(config).serve()
    except Exception as e:
        print(f"❌ Error: {e}")

if torch.cuda.is_available():
    await start_server()
else:
    print("❌ LỖI: Vui lòng bật T4 GPU!")
