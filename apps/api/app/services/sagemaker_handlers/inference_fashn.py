"""SageMaker inference handler for FASHN v1.5 virtual try-on."""
import json
import os
import uuid
import boto3
import requests
from io import BytesIO
from PIL import Image


_s3 = None
_pipeline = None


def model_fn(model_dir: str):
    global _pipeline
    # Import here so container has fashn installed
    from fashn import TryOnPipeline  # type: ignore[import]
    _pipeline = TryOnPipeline.from_pretrained(model_dir)
    _pipeline = _pipeline.to("cuda")
    return _pipeline


def predict_fn(data: dict, pipeline):
    global _s3
    if _s3 is None:
        _s3 = boto3.client("s3")

    ai_bucket = os.environ["AI_S3_BUCKET"]

    # Load images
    person_img = _load_image(data["person_image_url"])
    garment_img = _load_image(data["garment_image_url"])

    # Load LoRA if available
    lora_key = data.get("lora_s3_key")
    if lora_key:
        lora_path = f"/tmp/lora_{uuid.uuid4().hex}.safetensors"
        bucket, key = lora_key.replace("s3://", "").split("/", 1) if lora_key.startswith("s3://") else (ai_bucket, lora_key)
        _s3.download_file(bucket, key, lora_path)
        pipeline.load_lora_weights(lora_path)

    result_img = pipeline(
        person_image=person_img,
        garment_image=garment_img,
        category=data.get("category", "upper_body"),
    )

    # Upload result to S3
    result_key = f"results/fashn/{uuid.uuid4()}.png"
    buf = BytesIO()
    result_img.save(buf, format="PNG")
    buf.seek(0)
    _s3.put_object(Bucket=ai_bucket, Key=result_key, Body=buf.read(), ContentType="image/png")

    return {"result_url": f"s3://{ai_bucket}/{result_key}"}


def output_fn(prediction: dict, accept: str) -> str:
    return json.dumps(prediction)


def _load_image(url: str) -> Image.Image:
    if url.startswith("s3://"):
        s3 = boto3.client("s3")
        bucket, key = url[5:].split("/", 1)
        obj = s3.get_object(Bucket=bucket, Key=key)
        return Image.open(BytesIO(obj["Body"].read())).convert("RGB")
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return Image.open(BytesIO(resp.content)).convert("RGB")
