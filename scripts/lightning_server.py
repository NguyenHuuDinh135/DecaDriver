import io
import os
import uvicorn
import boto3
import torch
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image
from sentence_transformers import SentenceTransformer
from diffusers import DiffusionPipeline

# --- CONFIGURATION ---
# Bạn sẽ dán Ngrok Token vào đây hoặc dùng environment variable
NGROK_AUTHTOKEN = os.environ.get("NGROK_AUTHTOKEN", "")

app = FastAPI(title="DecaDriver AI Server (Lightning AI)")

# --- GLOBAL MODELS (PRE-LOADED IN VRAM) ---
print("🚀 Loading CLIP Model...")
clip_model = SentenceTransformer('clip-ViT-L-14', device="cuda")

print("🚀 Loading VTON Model (IDM-VTON)...")
# Sử dụng IDM-VTON hoặc SD Inpainting tùy vào Studio
vton_pipe = DiffusionPipeline.from_pretrained(
    "yisol/IDM-VTON", 
    torch_dtype=torch.float16
).to("cuda")

print("✅ All Models Loaded & Ready on GPU!")

# --- SCHEMAS ---
class ClipRequest(BaseModel):
    text: str = None
    image_url: str = None

class TryOnRequest(BaseModel):
    person_image_url: str
    garment_image_url: str
    output_s3_uri: str
    aws_access_key: str
    aws_secret_key: str
    region: str = "us-west-2"

# --- UTILS ---
def load_image(url: str):
    resp = requests.get(url, timeout=30)
    return Image.open(io.BytesIO(resp.content)).convert("RGB")

# --- ENDPOINTS ---

@app.post("/clip")
async def get_clip_embedding(req: ClipRequest):
    try:
        if req.text:
            embedding = clip_model.encode(req.text).tolist()
        elif req.image_url:
            img = load_image(req.image_url)
            embedding = clip_model.encode(img).tolist()
        else:
            raise HTTPException(status_code=400, detail="Missing text or image_url")
        return {"embedding": embedding}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tryon")
async def do_tryon(req: TryOnRequest):
    try:
        person_img = load_image(req.person_image_url)
        garment_img = load_image(req.garment_image_url)
        
        # Inference (IDM-VTON standard parameters)
        print("🪄 Running Try-on Inference...")
        # Note: Parameters might vary slightly based on the specific pipeline implementation
        result_img = vton_pipe(
            prompt="a person wearing a fashion garment",
            image=person_img,
            # control_image=garment_img, 
            num_inference_steps=30
        ).images[0]
        
        # Upload to S3 using the provided temporary credentials
        s3 = boto3.client(
            "s3",
            aws_access_key_id=req.aws_access_key,
            aws_secret_access_key=req.aws_secret_key,
            region_name=req.region
        )
        
        bucket, key = req.output_s3_uri.replace("s3://", "").split("/", 1)
        buf = io.BytesIO()
        result_img.save(buf, format="PNG")
        buf.seek(0)
        s3.put_object(Bucket=bucket, Key=key, Body=buf, ContentType="image/png")
        
        return {"status": "success", "s3_uri": req.output_s3_uri}
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Setup Ngrok tunnel if token is present
    if NGROK_AUTHTOKEN:
        from pyngrok import ngrok
        ngrok.set_auth_token(NGROK_AUTHTOKEN)
        public_url = ngrok.connect(8000)
        print(f"\n🌍 PUBLIC API URL: {public_url.public_url}\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
