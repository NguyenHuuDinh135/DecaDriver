"""SageMaker inference handler for CLIP ViT-L/14 — returns 768-dim embeddings."""
import json
import io
import torch
from PIL import Image
from transformers import CLIPModel, CLIPProcessor


def model_fn(model_dir: str):
    model = CLIPModel.from_pretrained(model_dir)
    processor = CLIPProcessor.from_pretrained(model_dir)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = model.to(device)
    model.eval()
    return {"model": model, "processor": processor, "device": device}


def predict_fn(data: dict, model_artifacts: dict):
    model = model_artifacts["model"]
    processor = model_artifacts["processor"]
    device = model_artifacts["device"]

    with torch.no_grad():
        if "image_bytes" in data:
            image = Image.open(io.BytesIO(bytes(data["image_bytes"]))).convert("RGB")
            inputs = processor(images=image, return_tensors="pt").to(device)
            embedding = model.get_image_features(**inputs)
        else:
            text = data.get("text", "")
            inputs = processor(text=[text], return_tensors="pt", padding=True).to(device)
            embedding = model.get_text_features(**inputs)

        embedding = embedding / embedding.norm(dim=-1, keepdim=True)
        return {"embedding": embedding[0].cpu().tolist()}


def output_fn(prediction: dict, accept: str) -> str:
    return json.dumps(prediction)
