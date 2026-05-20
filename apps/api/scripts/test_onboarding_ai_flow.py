#!/usr/bin/env python3
"""Run the real onboarding AI flow end-to-end and save local outputs.

Flow mirrors apps/web/app/(auth)/onboarding/likeness-flow.tsx:
  1. 6 selfie captures + 2 full-body captures
  2. Modal train/reference generation creates a clean avatar reference
  3. FASHN try-on uses that reference + garment
  4. Reference/result are downloaded to outputs/onboarding_ai_flow/<run_id>/

The script intentionally does not print credentials or presigned URLs.
"""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import sys
import time
import uuid
from pathlib import Path
from typing import Any

import boto3
import httpx
from botocore.exceptions import ClientError

ROOT = Path(__file__).resolve().parents[3]
APP_ENV = ROOT / "apps" / ".env"
API_ENV = ROOT / "apps" / "api" / ".env"
DEFAULT_OUT = ROOT / "outputs" / "onboarding_ai_flow"


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required env var: {name}")
    return value


def s3_client():
    return boto3.client("s3", region_name=os.environ.get("AWS_REGION", "us-west-2"))


def upload_file_to_s3(client, bucket: str, path: Path, key: str) -> str:
    content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    client.upload_file(str(path), bucket, key, ExtraArgs={"ContentType": content_type})
    return f"s3://{bucket}/{key}"


def s3_to_presigned_get(client, s3_uri: str, expires: int = 3600) -> str:
    bucket, key = s3_uri.removeprefix("s3://").split("/", 1)
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires,
    )


def download_s3(client, s3_uri: str, out_path: Path) -> None:
    bucket, key = s3_uri.removeprefix("s3://").split("/", 1)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    client.download_file(bucket, key, str(out_path))


def object_exists(client, s3_uri: str) -> bool:
    bucket, key = s3_uri.removeprefix("s3://").split("/", 1)
    try:
        client.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code")
        if code in {"404", "NoSuchKey", "NotFound"}:
            return False
        raise


def find_assets(category: str, garment_override: str | None = None) -> tuple[list[Path], list[Path], Path]:
    assets = ROOT / "test_assets"
    selfies = [assets / f"face_{i}.jpg" for i in range(1, 6)]
    # The prototype wants 6 selfies. Reuse the catalog person as the sixth capture
    # if the local fixture set only has five explicit face files.
    sixth = assets / "face_6.jpg"
    if sixth.exists():
        selfies.append(sixth)
    else:
        selfies.append(assets / "person_base.jpg")

    body = [assets / "person_base.jpg"]
    second_body_candidates = [ROOT / "photo-1515886657613-9f3515b0c78f.jpg", ROOT / "photo-1576566588028-4147f3842f27.jpg", assets / "person_base.jpg"]
    body.append(next(p for p in second_body_candidates if p.exists()))

    if garment_override:
        garment = Path(garment_override).expanduser().resolve()
    elif category == "bottoms":
        garment = assets / "bottom_jeans.jpg"
    else:
        garment = assets / "top_shirt.jpg"

    missing = [p for p in [*selfies, *body, garment] if not p.exists()]
    if missing:
        raise FileNotFoundError("Missing local test images: " + ", ".join(str(p) for p in missing))
    return selfies, body, garment


def modal_payload_base() -> dict[str, Any]:
    return {
        "aws_access_key": os.environ.get("AWS_ACCESS_KEY_ID"),
        "aws_secret_key": os.environ.get("AWS_SECRET_ACCESS_KEY"),
        "aws_session_token": os.environ.get("AWS_SESSION_TOKEN"),
        "region": os.environ.get("AWS_REGION", "us-west-2"),
        "ai_s3_bucket": os.environ.get("AI_S3_BUCKET"),
    }


def sanitize_result(result: dict[str, Any]) -> dict[str, Any]:
    safe = {}
    for key, value in result.items():
        if key.endswith("_url") and isinstance(value, str) and "X-Amz-Signature" in value:
            safe[key] = "[PRESIGNED_URL_REDACTED]"
        elif key in {"aws_access_key", "aws_secret_key", "aws_session_token"}:
            safe[key] = "[REDACTED]"
        else:
            safe[key] = value
    return safe


async def post_modal(url: str, payload: dict[str, Any], timeout: float) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
    if data.get("status") not in {"success", "completed"}:
        raise RuntimeError(f"Modal returned non-success: {sanitize_result(data)}")
    return data


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", default=str(DEFAULT_OUT))
    parser.add_argument("--category", default="tops", choices=["tops", "bottoms", "dresses"])
    parser.add_argument("--garment", default=None, help="Optional garment image path override")
    parser.add_argument("--run-id", default=time.strftime("%Y%m%d-%H%M%S"))
    args = parser.parse_args()

    # apps/.env is authoritative for backend settings, apps/api/.env may contain
    # Modal deployment values from earlier experiments. Load both without printing.
    load_env_file(APP_ENV)
    load_env_file(API_ENV)

    bucket = require_env("AI_S3_BUCKET")
    train_url = require_env("MODAL_TRAIN_URL")
    fashn_url = require_env("MODAL_FASHN_URL")

    client = s3_client()
    user_id = f"onboarding-test-{uuid.uuid4().hex[:8]}"
    run_prefix = f"ai-tests/onboarding-flow/{args.run_id}-{user_id}"
    out_dir = Path(args.output_dir) / f"{args.run_id}-{user_id}"
    out_dir.mkdir(parents=True, exist_ok=True)

    selfies, body, garment = find_assets(args.category, args.garment)
    onboarding_images = [*selfies, *body]

    image_s3_uris: list[str] = []
    for index, path in enumerate(onboarding_images, start=1):
        role = "selfie" if index <= 6 else "body"
        uri = upload_file_to_s3(client, bucket, path, f"{run_prefix}/onboarding/{index:02d}-{role}-{path.name}")
        image_s3_uris.append(uri)

    garment_uri = upload_file_to_s3(client, bucket, garment, f"{run_prefix}/garments/{garment.name}")
    image_urls = [s3_to_presigned_get(client, uri) for uri in image_s3_uris]
    body_urls = [s3_to_presigned_get(client, uri) for uri in image_s3_uris[-2:]]
    garment_url = s3_to_presigned_get(client, garment_uri)

    reference_s3_uri = f"s3://{bucket}/{run_prefix}/outputs/reference.png"
    tryon_s3_uri = f"s3://{bucket}/{run_prefix}/outputs/tryon.png"

    train_payload = {
        **modal_payload_base(),
        "task": "train",
        "user_id": user_id,
        "image_urls": image_urls,
        "body_image_urls": body_urls,
        "output_s3_uri": reference_s3_uri,
    }
    train_result = await post_modal(train_url, train_payload, timeout=900.0)
    reference_result_uri = train_result.get("reference_image_url") or reference_s3_uri
    if not object_exists(client, reference_result_uri):
        raise RuntimeError(f"Reference output missing on S3: {reference_result_uri}")
    download_s3(client, reference_result_uri, out_dir / "01_reference_from_onboarding.png")

    tryon_payload = {
        **modal_payload_base(),
        "task": "tryon",
        "person_image_url": s3_to_presigned_get(client, reference_result_uri),
        "garment_image_url": garment_url,
        "output_s3_uri": tryon_s3_uri,
        "category": args.category,
        "user_id": user_id,
        "num_timesteps": 20,
    }
    tryon_result = await post_modal(fashn_url, tryon_payload, timeout=1200.0)
    tryon_result_uri = tryon_result.get("output_s3_uri") or tryon_s3_uri
    if not object_exists(client, tryon_result_uri):
        raise RuntimeError(f"Try-on output missing on S3: {tryon_result_uri}")
    download_s3(client, tryon_result_uri, out_dir / "02_tryon_result.png")

    report = {
        "run_id": args.run_id,
        "user_id": user_id,
        "flow": "6 selfies + 2 body photos -> Modal train/reference -> Modal FASHN try-on",
        "local_outputs": {
            "reference": str((out_dir / "01_reference_from_onboarding.png").resolve()),
            "tryon": str((out_dir / "02_tryon_result.png").resolve()),
        },
        "s3_outputs": {
            "reference_image_url": reference_result_uri,
            "tryon_output_s3_uri": tryon_result_uri,
        },
        "assets": {
            "selfies": [str(p) for p in selfies],
            "body_photos": [str(p) for p in body],
            "garment": str(garment),
        },
        "modal_results": {
            "train": sanitize_result(train_result),
            "tryon": sanitize_result(tryon_result),
        },
    }
    (out_dir / "report.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))

    sys.stdout.write(json.dumps(report["local_outputs"], indent=2, ensure_ascii=False) + "\n")
    sys.stdout.write(f"report={out_dir / 'report.json'}\n")
    return 0


if __name__ == "__main__":
    import asyncio

    try:
        raise SystemExit(asyncio.run(main()))
    except Exception as exc:
        sys.stderr.write(f"ERROR: {exc}\n")
        raise SystemExit(1)
