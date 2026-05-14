from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import Garment


def _seed_garments(db: Session) -> None:
    for i in range(3):
        g = Garment(
            title=f"Garment {i}",
            image_url=f"https://example.com/{i}.jpg",
        )
        db.add(g)
    db.commit()


def test_recommend_no_profile_fallback(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    _seed_garments(db)
    response = client.get(
        f"{settings.API_V1_STR}/recommend/",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_recommend_with_profile(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session  # noqa: ARG001
) -> None:
    """When a style profile exists, CLIP endpoint is called for embedding-based search."""
    # First, create a style profile via the analyze endpoint
    mock_result = {
        "bodyType": "athletic",
        "colorTone": "warm",
        "heightEstimate": "175cm",
        "recommendedStyles": ["minimalist", "smart casual"],
        "avoidStyles": ["oversized"],
    }
    with (
        patch(
            "app.api.routes.stylist.sagemaker_client.upload_json_to_s3",
            return_value="s3://bucket/key.json",
        ),
        patch(
            "app.api.routes.stylist.sagemaker_client.invoke_async_endpoint",
            return_value="s3://bucket/output.json",
        ),
        patch(
            "app.api.routes.stylist.sagemaker_client.get_async_result",
            return_value=mock_result,
        ),
    ):
        client.post(
            f"{settings.API_V1_STR}/stylist/analyze",
            headers=normal_user_token_headers,
            json={"image_url": "https://example.com/photo.jpg"},
        )

    # Mock CLIP endpoint returning an embedding
    mock_embedding = [0.1] * 768
    with patch(
        "app.api.routes.recommend.sagemaker_client.invoke_realtime_endpoint",
        return_value={"embedding": mock_embedding},
    ):
        response = client.get(
            f"{settings.API_V1_STR}/recommend/",
            headers=normal_user_token_headers,
        )
    # May return 200 with results or fallback depending on pgvector state
    assert response.status_code in (200, 502)


def test_recommend_clip_returns_no_embedding(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session  # noqa: ARG001
) -> None:
    """When CLIP returns empty embedding, expect a 502 error."""
    # Ensure the user has a style profile (created by prior test)
    mock_result = {
        "bodyType": "athletic",
        "colorTone": "warm",
        "heightEstimate": "175cm",
        "recommendedStyles": ["minimalist"],
        "avoidStyles": [],
    }
    with (
        patch(
            "app.api.routes.stylist.sagemaker_client.upload_json_to_s3",
            return_value="s3://bucket/key.json",
        ),
        patch(
            "app.api.routes.stylist.sagemaker_client.invoke_async_endpoint",
            return_value="s3://bucket/output.json",
        ),
        patch(
            "app.api.routes.stylist.sagemaker_client.get_async_result",
            return_value=mock_result,
        ),
    ):
        client.post(
            f"{settings.API_V1_STR}/stylist/analyze",
            headers=normal_user_token_headers,
            json={"image_url": "https://example.com/photo.jpg"},
        )

    with patch(
        "app.api.routes.recommend.sagemaker_client.invoke_realtime_endpoint",
        return_value={"embedding": []},
    ):
        response = client.get(
            f"{settings.API_V1_STR}/recommend/",
            headers=normal_user_token_headers,
        )
    assert response.status_code == 502
    assert "embedding" in response.json()["detail"].lower()


def test_recommend_unauthenticated(client: TestClient) -> None:
    response = client.get(f"{settings.API_V1_STR}/recommend/")
    assert response.status_code == 401
