"""SageMaker inference handler for CatV2TON video try-on."""
import json
import os
import shutil
import subprocess
import tempfile
import uuid
from io import BytesIO

import boto3
import requests
from PIL import Image

_s3 = boto3.client("s3")
_pipeline = None
WEIGHTS_DIR = os.environ.get("CATVTON_WEIGHTS_DIR", "/opt/ml/model/weights")


def model_fn(model_dir: str):  # noqa: ARG001
    global _pipeline
    ai_bucket = os.environ["AI_S3_BUCKET"]

    if not os.path.exists(f"{WEIGHTS_DIR}/model_index.json"):
        os.makedirs(WEIGHTS_DIR, exist_ok=True)
        _s3.download_file(ai_bucket, "models/catvton/weights.tar.gz", "/tmp/weights.tar.gz")
        subprocess.run(["tar", "-xzf", "/tmp/weights.tar.gz", "-C", WEIGHTS_DIR], check=True)

    from catvton import CatVTONVideoPipeline  # type: ignore[import]
    _pipeline = CatVTONVideoPipeline(weights_dir=WEIGHTS_DIR)
    return _pipeline


def predict_fn(data: dict, pipeline):
    person_img = _load_image(data["person_image_url"])
    garment_img = _load_image(data["garment_image_url"])

    video_frames = pipeline(
        person_image=person_img,
        garment_image=garment_img,
        num_frames=24,
        fps=8,
    )

    ai_bucket = os.environ["AI_S3_BUCKET"]
    result_key = f"results/catvton/{uuid.uuid4()}.mp4"

    tmp_path = f"/tmp/{uuid.uuid4()}.mp4"
    _save_video(video_frames, tmp_path, fps=8)

    with open(tmp_path, "rb") as f:
        _s3.put_object(Bucket=ai_bucket, Key=result_key, Body=f.read(), ContentType="video/mp4")
    os.remove(tmp_path)

    return {"result_url": f"s3://{ai_bucket}/{result_key}"}


def output_fn(prediction: dict, accept: str) -> str:  # noqa: ARG001
    return json.dumps(prediction)


def _load_image(url: str) -> Image.Image:
    if url.startswith("s3://"):
        bucket, key = url[5:].split("/", 1)
        obj = _s3.get_object(Bucket=bucket, Key=key)
        return Image.open(BytesIO(obj["Body"].read())).convert("RGB")
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    return Image.open(BytesIO(resp.content)).convert("RGB")


def _save_video(frames, output_path: str, fps: int = 8) -> None:
    """Save video frames as MP4 using ffmpeg."""
    tmpdir = tempfile.mkdtemp()
    try:
        for i, frame in enumerate(frames):
            frame.save(os.path.join(tmpdir, f"{i:04d}.png"))

        subprocess.run(
            [
                "ffmpeg", "-y",
                "-framerate", str(fps),
                "-i", os.path.join(tmpdir, "%04d.png"),
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-preset", "fast",
                output_path,
            ],
            check=True,
            capture_output=True,
        )
    finally:
        shutil.rmtree(tmpdir)
