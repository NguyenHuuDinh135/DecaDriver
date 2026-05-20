#!/usr/bin/env python3
"""Run onboarding AI -> one final full-outfit try-on image.

Flow:
  1. Upload onboarding images (6 selfies + 2 body refs) to S3.
  2. Modal task=train creates a clean 768x1024 reference image.
  3. Modal task=tryon applies top garment.
  4. Modal task=tryon applies bottom garment on the top result.
  5. Download exactly one teacher-facing final outfit image locally.

No credentials or presigned URLs are printed.
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
DEFAULT_OUT = ROOT / "outputs" / "onboarding_full_outfit_flow"


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


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
    return client.generate_presigned_url("get_object", Params={"Bucket": bucket, "Key": key}, ExpiresIn=expires)


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


def local_assets(
    top_override: str | None,
    bottom_override: str | None,
    body_override: str | None,
) -> tuple[list[Path], list[Path], Path, Path]:
    assets = ROOT / "test_assets"
    selfies = [assets / f"face_{i}.jpg" for i in range(1, 6)]
    selfies.append(assets / "face_6.jpg" if (assets / "face_6.jpg").exists() else assets / "person_base.jpg")
    if body_override:
        body_ref = Path(body_override).expanduser().resolve()
        body = [body_ref, body_ref]
    else:
        body = [assets / "person_base.jpg"]
        body_candidates = [ROOT / "photo-1515886657613-9f3515b0c78f.jpg", ROOT / "photo-1576566588028-4147f3842f27.jpg", assets / "person_base.jpg"]
        body.append(next(p for p in body_candidates if p.exists()))
    top = Path(top_override).expanduser().resolve() if top_override else assets / "top_shirt.jpg"
    bottom = Path(bottom_override).expanduser().resolve() if bottom_override else assets / "bottom_jeans.jpg"
    missing = [p for p in [*selfies, *body, top, bottom] if not p.exists()]
    if missing:
        raise FileNotFoundError("Missing local test images: " + ", ".join(str(p) for p in missing))
    return selfies, body, top, bottom


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
    parser.add_argument("--top", default=None, help="Optional top garment image")
    parser.add_argument("--bottom", default=None, help="Optional bottom garment image")
    parser.add_argument("--body-reference", default=None, help="Optional full-body pose/body reference image to replace the prototype pose")
    parser.add_argument("--run-id", default=time.strftime("%Y%m%d-%H%M%S"))
    args = parser.parse_args()

    load_env_file(APP_ENV)
    load_env_file(API_ENV)
    bucket = require_env("AI_S3_BUCKET")
    gateway_url = require_env("MODAL_FASHN_URL")
    train_url = os.environ.get("MODAL_TRAIN_URL") or gateway_url

    client = s3_client()
    user_id = f"full-outfit-test-{uuid.uuid4().hex[:8]}"
    run_prefix = f"ai-tests/onboarding-full-outfit/{args.run_id}-{user_id}"
    out_dir = Path(args.output_dir) / f"{args.run_id}-{user_id}"
    out_dir.mkdir(parents=True, exist_ok=True)

    selfies, body, top, bottom = local_assets(args.top, args.bottom, args.body_reference)
    onboarding_images = [*selfies, *body]
    image_s3_uris = [
        upload_file_to_s3(
            client,
            bucket,
            path,
            f"{run_prefix}/onboarding/{idx:02d}-{'selfie' if idx <= 6 else 'body'}-{path.name}",
        )
        for idx, path in enumerate(onboarding_images, start=1)
    ]
    top_uri = upload_file_to_s3(client, bucket, top, f"{run_prefix}/garments/top-{top.name}")
    bottom_uri = upload_file_to_s3(client, bucket, bottom, f"{run_prefix}/garments/bottom-{bottom.name}")

    reference_s3_uri = f"s3://{bucket}/{run_prefix}/outputs/01-reference.png"
    top_s3_uri = f"s3://{bucket}/{run_prefix}/outputs/02-top-applied.png"
    final_s3_uri = f"s3://{bucket}/{run_prefix}/outputs/03-final-top-bottom.png"

    image_urls = [s3_to_presigned_get(client, uri) for uri in image_s3_uris]
    train_result = await post_modal(
        train_url,
        {
            **modal_payload_base(),
            "task": "train",
            "user_id": user_id,
            "image_urls": image_urls,
            "body_image_urls": [s3_to_presigned_get(client, uri) for uri in image_s3_uris[-2:]],
            "output_s3_uri": reference_s3_uri,
        },
        timeout=900.0,
    )
    reference_uri = train_result.get("reference_image_url") or reference_s3_uri
    if not object_exists(client, reference_uri):
        raise RuntimeError(f"Reference output missing on S3: {reference_uri}")

    top_result = await post_modal(
        gateway_url,
        {
            **modal_payload_base(),
            "task": "tryon",
            "person_image_url": s3_to_presigned_get(client, reference_uri),
            "garment_image_url": s3_to_presigned_get(client, top_uri),
            "output_s3_uri": top_s3_uri,
            "category": "tops",
            "user_id": user_id,
            "num_timesteps": 20,
        },
        timeout=1200.0,
    )
    top_output_uri = top_result.get("output_s3_uri") or top_s3_uri
    if not object_exists(client, top_output_uri):
        raise RuntimeError(f"Top output missing on S3: {top_output_uri}")

    bottom_result = await post_modal(
        gateway_url,
        {
            **modal_payload_base(),
            "task": "tryon",
            "person_image_url": s3_to_presigned_get(client, top_output_uri),
            "garment_image_url": s3_to_presigned_get(client, bottom_uri),
            "output_s3_uri": final_s3_uri,
            "category": "bottoms",
            "user_id": user_id,
            "num_timesteps": 20,
        },
        timeout=1200.0,
    )
    final_uri = bottom_result.get("output_s3_uri") or final_s3_uri
    if not object_exists(client, final_uri):
        raise RuntimeError(f"Final outfit output missing on S3: {final_uri}")

    reference_local = out_dir / "debug_01_reference.png"
    top_local = out_dir / "debug_02_top_applied.png"
    final_local = out_dir / "final_top_bottom_tryon.png"
    download_s3(client, reference_uri, reference_local)
    download_s3(client, top_output_uri, top_local)
    download_s3(client, final_uri, final_local)

    report = {
        "run_id": args.run_id,
        "user_id": user_id,
        "flow": "onboarding -> reference -> top try-on -> bottom try-on -> one final outfit image",
        "local_outputs": {
            "final": str(final_local.resolve()),
            "debug_reference": str(reference_local.resolve()),
            "debug_top_applied": str(top_local.resolve()),
        },
        "s3_outputs": {
            "reference": reference_uri,
            "top_intermediate": top_output_uri,
            "final": final_uri,
        },
        "assets": {"top": str(top), "bottom": str(bottom)},
        "modal_results": {"train": sanitize_result(train_result), "top": sanitize_result(top_result), "bottom": sanitize_result(bottom_result)},
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
