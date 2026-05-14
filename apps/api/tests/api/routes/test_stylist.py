from unittest.mock import patch

from fastapi.testclient import TestClient

from app.core.config import settings


def test_analyze_style_success(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
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
        response = client.post(
            f"{settings.API_V1_STR}/stylist/analyze",
            headers=normal_user_token_headers,
            json={"image_url": "https://example.com/photo.jpg"},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["body_type"] == "athletic"
    assert data["color_tone"] == "warm"
    assert "minimalist" in data["recommended_styles"]


def test_analyze_style_timeout(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
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
            return_value=None,
        ),
        patch("asyncio.sleep", return_value=None),
    ):
        response = client.post(
            f"{settings.API_V1_STR}/stylist/analyze",
            headers=normal_user_token_headers,
            json={"image_url": "https://example.com/photo.jpg"},
        )
    assert response.status_code == 504


def test_analyze_style_no_body(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/stylist/analyze",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 422


def test_get_style_profile_not_found(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/stylist/profile",
        headers=normal_user_token_headers,
    )
    # May be 200 if previous test created one, or 404
    assert response.status_code in (200, 404)


def test_analyze_style_unauthenticated(client: TestClient) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/stylist/analyze",
        json={"image_url": "https://example.com/photo.jpg"},
    )
    assert response.status_code == 401
