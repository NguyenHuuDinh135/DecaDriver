import json
import os

import boto3
import httpx
from botocore.exceptions import ClientError

from app.core.config import settings


class AIClient:
    def __init__(self) -> None:
        self._s3 = boto3.client("s3", region_name=settings.AWS_REGION)

    def _aws_payload(self) -> dict[str, str | None]:
        credentials = boto3.Session(region_name=settings.AWS_REGION).get_credentials()
        frozen = credentials.get_frozen_credentials() if credentials else None
        return {
            "aws_access_key": os.environ.get("AWS_ACCESS_KEY_ID") or (frozen.access_key if frozen else None),
            "aws_secret_key": os.environ.get("AWS_SECRET_ACCESS_KEY") or (frozen.secret_key if frozen else None),
            "aws_session_token": os.environ.get("AWS_SESSION_TOKEN") or (frozen.token if frozen else None),
            "region": settings.AWS_REGION,
        }

    # --- S3 Helpers ---
    def upload_json_to_s3(self, bucket: str, key: str, data: dict) -> str:
        self._s3.put_object(Bucket=bucket, Key=key, Body=json.dumps(data), ContentType="application/json")
        return f"s3://{bucket}/{key}"

    def upload_bytes_to_s3(self, bucket: str, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        self._s3.put_object(Bucket=bucket, Key=key, Body=data, ContentType=content_type)
        return f"s3://{bucket}/{key}"

    def generate_presigned_url(self, s3_uri: str, expiration: int = 3600) -> str:
        if not s3_uri or not s3_uri.startswith("s3://"):
            return s3_uri
        bucket, key = s3_uri.replace("s3://", "").split("/", 1)
        return self._s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=expiration,
        )

    def generate_presigned_put_url(
        self,
        s3_uri: str,
        content_type: str = "image/png",
        expiration: int = 3600,
    ) -> str:
        """Create a presigned HTTPS PUT URL for a worker to upload an output file."""
        bucket, key = s3_uri.replace("s3://", "").split("/", 1)
        return self._s3.generate_presigned_url(
            "put_object",
            Params={"Bucket": bucket, "Key": key, "ContentType": content_type},
            ExpiresIn=expiration,
        )

    # --- Unified Colab Inference Methods ---

    async def _call_colab(self, endpoint: str, payload: dict) -> dict:
        """Helper to call the Google Colab Ngrok tunnel (Hub A: Search & Try-on)."""
        base_url = settings.QWEN_API_URL.split("/analyze")[0] if "/analyze" in settings.QWEN_API_URL else settings.QWEN_API_URL
        # If QWEN_API_URL points at the unified Modal ai_gateway endpoint, post
        # directly. If it points at a legacy Colab base URL, append /tryon,/train...
        base = base_url.rstrip("/")
        is_unified_gateway = bool(payload.get("task")) and (
            base.endswith("/ai_gateway")
            or base.endswith("/ai-gateway")
            or "modal.run" in base
        )
        url = base if is_unified_gateway else f"{base}/{endpoint.lstrip('/')}"

        async with httpx.AsyncClient(timeout=300.0, follow_redirects=True) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            return response.json()

    async def _call_video_hub(self, endpoint: str, payload: dict) -> dict:
        """Helper to call the dedicated Video Hub (Hub B: Stable Video Diffusion)."""
        if not settings.VIDEO_API_URL:
            # Fallback to Hub A if Hub B is not configured
            return await self._call_colab(endpoint, payload)

        base_url = settings.VIDEO_API_URL.split("/generate-video")[0] if "/generate-video" in settings.VIDEO_API_URL else settings.VIDEO_API_URL
        url = f"{base_url.rstrip('/')}/{endpoint.lstrip('/')}"

        async with httpx.AsyncClient(timeout=600.0, follow_redirects=True) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            return response.json()

    async def invoke_clip(self, text: str = None, image_url: str = None) -> list[float]:
        """Call Modal (preferred) or Colab for CLIP embeddings."""
        image_url = self.generate_presigned_url(image_url) if image_url else None
        payload = {"text": text, "image_url": image_url}

        if settings.MODAL_CLIP_URL:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(settings.MODAL_CLIP_URL, json=payload)
                resp.raise_for_status()
                return resp.json().get("embedding", [])

        result = await self._call_colab("clip", payload)
        return result.get("embedding", [])

    async def invoke_fashn(self, person_image_url: str, garment_image_url: str, output_s3_uri: str, category: str = "tops", user_id: str | None = None) -> dict:
        """Call the real Modal FASHN endpoint for Virtual Try-On and write output to S3."""
        p_url = self.generate_presigned_url(person_image_url)
        g_url = self.generate_presigned_url(garment_image_url)

        payload = {
            "task": "tryon",
            "person_image_url": p_url,
            "garment_image_url": g_url,
            "output_s3_uri": output_s3_uri,
            "category": category,
            "user_id": user_id,
            "ai_s3_bucket": settings.AI_S3_BUCKET,
            **self._aws_payload(),
        }

        if settings.MODAL_FASHN_URL:
            async with httpx.AsyncClient(timeout=600.0, follow_redirects=True) as client:
                resp = await client.post(settings.MODAL_FASHN_URL, json=payload)
                resp.raise_for_status()
                return resp.json()

        return await self._call_colab("tryon", payload)

    async def invoke_modal_train(self, user_id: str, image_urls: list[str], output_s3_uri: str | None = None) -> dict:
        """Trigger Avatar reference generation/training on the AI gateway."""
        presigned_urls = [self.generate_presigned_url(url) for url in image_urls]
        payload = {
            "task": "train",
            "user_id": user_id,
            "image_urls": presigned_urls,
            "output_s3_uri": output_s3_uri,
            "ai_s3_bucket": settings.AI_S3_BUCKET,
            **self._aws_payload(),
        }

        if settings.MODAL_TRAIN_URL:
            async with httpx.AsyncClient(timeout=600.0, follow_redirects=True) as client:
                resp = await client.post(settings.MODAL_TRAIN_URL, json=payload)
                resp.raise_for_status()
                return resp.json()

        return await self._call_colab("train", payload)

    async def invoke_qwen(self, prompt: str, image_url: str) -> dict:
        """Call Modal (preferred) or Colab for Stylist analysis."""
        img_url = self.generate_presigned_url(image_url)
        payload = {"prompt": prompt, "image_url": img_url}

        if settings.MODAL_ANALYZE_URL:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(settings.MODAL_ANALYZE_URL, json=payload)
                resp.raise_for_status()
                return resp.json()

        return await self._call_colab("analyze", payload)

    async def invoke_catvton(self, person_image_url: str, garment_image_url: str, output_s3_uri: str) -> dict:
        """Call dedicated Video Hub (Hub B) for high-fidelity Video Try-on."""
        p_url = self.generate_presigned_url(person_image_url)
        g_url = self.generate_presigned_url(garment_image_url)
        payload = {
            "person_image_url": p_url,
            "garment_image_url": g_url,
            "output_s3_uri": output_s3_uri,
            **self._aws_payload(),
        }
        return await self._call_video_hub("generate-video", payload)

    # --- Compatibility Layer ---
    def get_async_result(self, output_s3_uri: str) -> dict | None:
        bucket, key = output_s3_uri.replace("s3://", "").split("/", 1)
        try:
            self._s3.get_object(Bucket=bucket, Key=key)
            return {"status": "success"}
        except ClientError as e:
            if e.response["Error"]["Code"] in ("NoSuchKey", "404"):
                return None
            raise

# Global singleton
ai_client = AIClient()
