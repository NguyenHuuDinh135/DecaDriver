"""SageMaker inference handler for FASHN v1.5."""
import json
import os
import uuid
import subprocess
import boto3
import requests
from io import BytesIO
from PIL import Image

_s3 = boto3.client("s3")
_pipeline = None
WEIGHTS_DIR = os.environ.get("FASHN_WEIGHTS_DIR", "/opt/ml/model/weights")


def model_fn(model_dir: str):
    global _pipeline
    ai_bucket = os.environ["AI_S3_BUCKET"]

    # Download weights from S3 if not present
    if not os.path.exists(f"{WEIGHTS_DIR}/model.safetensors"):
        os.makedirs(WEIGHTS_DIR, exist_ok=True)
        _s3.download_file(ai_bucket, "models/fashn/weights.tar.gz", "/tmp/weights.tar.gz")
        subprocess.run(["tar", "-xzf", "/tmp/weights.tar.gz", "-C", WEIGHTS_DIR], check=True)

    from fashn_vton import TryOnPipeline  # type: ignore[import]
    _pipeline = TryOnPipeline(weights_dir=WEIGHTS_DIR)
    return _pipeline


def predict_fn(data: dict, pipeline):
    person_img = _load_image(data["person_image_url"])
    garment_img = _load_image(data["garment_image_url"])

    result = pipeline(
        person_image=person_img,
        garment_image=garment_img,
        category=data.get("category", "tops"),
    )

    ai_bucket = os.environ["AI_S3_BUCKET"]
    result_key = f"results/fashn/{uuid.uuid4()}.png"
    buf = BytesIO()
    result.images[0].save(buf, format="PNG")
    buf.seek(0)
    _s3.put_object(Bucket=ai_bucket, Key=result_key, Body=buf.read(), ContentType="image/png")

    return {"result_url": f"s3://{ai_bucket}/{result_key}"}


def output_fn(prediction: dict, accept: str) -> str:
    return json.dumps(prediction)


def _load_image(url: str) -> Image.Image:
    if url.startswith("s3://"):
        bucket, key = url[5:].split("/", 1)
        obj = _s3.get_object(Bucket=bucket, Key=key)
        return Image.open(BytesIO(obj["Body"].read())).convert("RGB")
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return Image.open(BytesIO(resp.content)).convert("RGB")
