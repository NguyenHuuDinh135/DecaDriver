import uuid
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import AvatarJob, Garment, JobStatus, TryOnJob


def _create_garment(db: Session) -> Garment:
    garment = Garment(
        title="Test Shirt",
        brand="TestBrand",
        image_url="https://example.com/shirt.jpg",
    )
    db.add(garment)
    db.commit()
    db.refresh(garment)
    return garment


def _create_avatar_job(db: Session, user_id: uuid.UUID) -> AvatarJob:
    job = AvatarJob(
        user_id=user_id,
        status=JobStatus.completed,
        reference_image_url="s3://bucket/avatars/ref.jpg",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def test_create_tryon_no_avatar(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    garment = _create_garment(db)
    response = client.post(
        f"{settings.API_V1_STR}/tryon/",
        headers=normal_user_token_headers,
        params={"garment_id": str(garment.id)},
    )
    assert response.status_code == 400
    assert "Avatar" in response.json()["detail"] or "avatar" in response.json()["detail"].lower()


def test_create_tryon_success(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    garment = _create_garment(db)
    # Get current user ID from token
    me_resp = client.get(
        f"{settings.API_V1_STR}/users/me", headers=normal_user_token_headers
    )
    user_id = uuid.UUID(me_resp.json()["id"])
    _create_avatar_job(db, user_id)

    with (
        patch(
            "app.api.routes.tryon.sagemaker_client.upload_json_to_s3",
            return_value="s3://bucket/input.json",
        ),
        patch(
            "app.api.routes.tryon.sagemaker_client.invoke_async_endpoint",
            return_value="s3://bucket/output.json",
        ),
    ):
        response = client.post(
            f"{settings.API_V1_STR}/tryon/",
            headers=normal_user_token_headers,
            params={"garment_id": str(garment.id)},
        )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "pending"
    assert data["garment_id"] == str(garment.id)


def test_create_tryon_garment_not_found(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/tryon/",
        headers=normal_user_token_headers,
        params={"garment_id": str(uuid.uuid4())},
    )
    assert response.status_code == 404


def test_get_tryon_job_completed(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    me_resp = client.get(
        f"{settings.API_V1_STR}/users/me", headers=normal_user_token_headers
    )
    user_id = uuid.UUID(me_resp.json()["id"])
    garment = _create_garment(db)

    job = TryOnJob(
        user_id=user_id,
        garment_id=garment.id,
        status=JobStatus.pending,
        sagemaker_output_s3="s3://bucket/output/result.json",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    mock_result = {"result_url": "s3://bucket/results/tryon.jpg"}
    with (
        patch(
            "app.api.routes.tryon.sagemaker_client.check_async_failure",
            return_value=False,
        ),
        patch(
            "app.api.routes.tryon.sagemaker_client.get_async_result",
            return_value=mock_result,
        ),
        patch(
            "app.api.routes.tryon.sagemaker_client.generate_presigned_url",
            return_value="https://presigned.url/tryon.jpg",
        ),
    ):
        response = client.get(
            f"{settings.API_V1_STR}/tryon/{job.id}",
            headers=normal_user_token_headers,
        )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["result_url"] == "https://presigned.url/tryon.jpg"


def test_get_tryon_job_failed(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    me_resp = client.get(
        f"{settings.API_V1_STR}/users/me", headers=normal_user_token_headers
    )
    user_id = uuid.UUID(me_resp.json()["id"])
    garment = _create_garment(db)

    job = TryOnJob(
        user_id=user_id,
        garment_id=garment.id,
        status=JobStatus.pending,
        sagemaker_output_s3="s3://bucket/output/result.json",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    with patch(
        "app.api.routes.tryon.sagemaker_client.check_async_failure",
        return_value=True,
    ):
        response = client.get(
            f"{settings.API_V1_STR}/tryon/{job.id}",
            headers=normal_user_token_headers,
        )
    assert response.status_code == 200
    assert response.json()["status"] == "failed"


def test_get_tryon_job_not_found(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    response = client.get(
        f"{settings.API_V1_STR}/tryon/{uuid.uuid4()}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 404


def test_delete_tryon_job(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    me_resp = client.get(
        f"{settings.API_V1_STR}/users/me", headers=normal_user_token_headers
    )
    user_id = uuid.UUID(me_resp.json()["id"])
    garment = _create_garment(db)

    job = TryOnJob(
        user_id=user_id,
        garment_id=garment.id,
        status=JobStatus.completed,
        result_url="https://example.com/result.jpg",
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    response = client.delete(
        f"{settings.API_V1_STR}/tryon/{job.id}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Job deleted"


def test_delete_tryon_not_found(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    response = client.delete(
        f"{settings.API_V1_STR}/tryon/{uuid.uuid4()}",
        headers=normal_user_token_headers,
    )
    assert response.status_code == 404


def test_list_tryon_jobs(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    with patch(
        "app.api.routes.tryon.sagemaker_client.generate_presigned_url",
        return_value="https://presigned.url/img.jpg",
    ):
        response = client.get(
            f"{settings.API_V1_STR}/tryon/",
            headers=normal_user_token_headers,
        )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_tryon_unauthenticated(client: TestClient) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/tryon/",
        params={"garment_id": str(uuid.uuid4())},
    )
    assert response.status_code == 401
