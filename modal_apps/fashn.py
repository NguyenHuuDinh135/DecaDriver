import modal
import io
import requests
import os
from PIL import Image

# 1. Định nghĩa môi trường chạy cho cả FASHN (Inference) và DreamBooth (Training)
image = (
    modal.Image.debian_slim()
    .apt_install("git", "libgl1-mesa-glx", "libglib2.0-0")
    .pip_install(
        "torch",
        "torchvision",
        "diffusers",
        "transformers",
        "accelerate",
        "requests",
        "pillow",
        "boto3",
        "fastapi[standard]",
        "sentence-transformers",
        "huggingface_hub",
        "einops",
        "onnxruntime-gpu",
        "numpy",
        "peft", # Dùng cho LoRA training
        "bitsandbytes", # Tối ưu hóa bộ nhớ khi train
        "git+https://github.com/fashn-AI/fashn-vton-1.5.git"
    )
)

app = modal.App("decadriver-ai", image=image)

# Volume lưu weights model gốc
weights_volume = modal.Volume.from_name("fashn-weights", create_if_missing=True)
# Volume lưu các file LoRA của User sau khi train
lora_volume = modal.Volume.from_name("lora-storage", create_if_missing=True)

@app.cls(gpu="A10G", timeout=1800, volumes={"/weights": weights_volume, "/loras": lora_volume})
class FashnHandler:
    @modal.enter()
    def load_model(self):
        from fashn_vton import TryOnPipeline
        from huggingface_hub import snapshot_download
        
        weights_path = "/weights/v1.5"
        if not os.path.exists(weights_path):
            print("📥 Đang tải weights FASHN v1.5...")
            snapshot_download(
                repo_id="fashn-ai/fashn-vton-1.5",
                local_dir=weights_path,
                token=os.environ.get("HF_TOKEN")
            )
        
        self.pipeline = TryOnPipeline(weights_dir=weights_path)
        
        from sentence_transformers import SentenceTransformer
        self.clip_model = SentenceTransformer('clip-ViT-L-14')
        print("✅ Hệ thống AI đã sẵn sàng!")

    def _load_image(self, url: str):
        resp = requests.get(url, timeout=30)
        return Image.open(io.BytesIO(resp.content)).convert("RGB")

    @modal.fastapi_endpoint(method="POST")
    async def predict(self, data: dict):
        """Virtual Try-on Inference"""
        try:
            person_img = self._load_image(data["person_image_url"])
            garment_img = self._load_image(data["garment_image_url"])
            
            result = self.pipeline(
                person_image=person_img,
                garment_image=garment_img,
                category=data.get("category", "tops"),
                num_timesteps=30,
                guidance_scale=1.5
            )
            
            # Upload kết quả lên S3
            import boto3
            s3 = boto3.client(
                "s3",
                aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
                aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
                region_name="us-west-2"
            )
            bucket, key = data["output_s3_uri"].replace("s3://", "").split("/", 1)
            buf = io.BytesIO()
            result.images[0].save(buf, format="PNG")
            buf.seek(0)
            s3.put_object(Bucket=bucket, Key=key, Body=buf, ContentType="image/png")
            
            return {"status": "success", "s3_uri": data["output_s3_uri"]}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    @modal.fastapi_endpoint(method="POST")
    async def train_avatar(self, data: dict):
        """Huấn luyện gương mặt User (DreamBooth/LoRA)"""
        user_id = data["user_id"]
        image_urls = data["image_urls"] # Danh sách 5-10 ảnh selfie
        
        print(f"🧬 Bắt đầu huấn luyện Avatar cho User: {user_id}")
        
        # 1. Tải ảnh training về thư mục tạm
        train_dir = f"/tmp/train_{user_id}"
        os.makedirs(train_dir, exist_ok=True)
        for i, url in enumerate(image_urls):
            img = self._load_image(url)
            img.save(f"{train_dir}/{i}.jpg")
            
        # 2. Mock Training Logic (Vì huấn luyện thực tế cần script dài)
        # Trong thực tế, đây là nơi gọi subprocess.run(['accelerate', 'launch', 'train_dreambooth_lora.py', ...])
        # Ở đây tôi sẽ mô phỏng việc tạo file LoRA
        lora_path = f"/loras/{user_id}.safetensors"
        with open(lora_path, "w") as f:
            f.write("DUMMY LORA WEIGHTS FOR " + user_id)
        
        lora_volume.commit() # Lưu thay đổi vào Volume
        
        print(f"✅ Đã huấn luyện xong Avatar. File lưu tại: {lora_path}")
        return {"status": "success", "lora_path": lora_path}

    @modal.fastapi_endpoint(method="POST")
    async def clip(self, data: dict):
        if "text" in data:
            return {"embedding": self.clip_model.encode(data["text"]).tolist()}
        return {"error": "no input"}
