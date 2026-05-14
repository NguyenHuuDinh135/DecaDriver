import uuid
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.config import settings
from app.models import Garment, JobStatus, TryOnJob, VideoTryOnJob


def _create_garment(db: Session) -> Garment:
    garment = Garment(
        title="Video Test Garment",
        brand="TestBrand",
        image_url="https://example.com/garment.jpg",
    )
    db.add(garment)
    db.commit()
    db.refresh(garment)
    return garment


def _create_completed_tryon_job(
    db: Session, user_id: uuid.UUID, garment_id: uuid.UUID
) -> TryOnJob:
    job = TryOnJob(
        user_id=user_id,
        garment_id=garment_id,
        status=JobStatus.completed,
        result_url="https://example.com/tryon_result.jpg",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def _get_current_user_id(
    client: TestClient, headers: dict[str, str]
) -> uuid.UUID:
    resp = client.get(f"{settings.API_V1_STR}/users/me", headers=headers)
    return uuid.UUID(resp.json()["id"])


def test_create_video_tryon_success(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    user_id = _get_current_user_id(client, normal_user_token_headers)
    garment = _create_garment(db)
    parent_job = _create_completed_tryon_job(db, user_id, garment.id)

    with (
        patch(
            "app.api.routes.video_tryon.sagemaker_client.upload_json_to_s3",
            return_value="s3://bucket/inputs/catvton/input.json",
        ),
        patch(
            "app.api.routes.video_tryon.sagemaker_client.invoke_async_endpoint",
            return_value="s3://bucket/outputs/catvton/output.json",
        ),
    ):
        response = client.post(
            f"{settings.API_V1_STR}/video-tryon/",
            headers=normal_user_token_headers,
            params={"tryon_job_id": str(parent_job.id)},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "pending"
    assert data["tryon_job_id"] == str(parent_job.id)


def test_create_video_tryon_parent_not_completed(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    user_id = _get_current_user_id(client, normal_user_token_headers)
    garment = _create_garment(db)

    pending_job = TryOnJob(
        user_id=user_id,
        garment_id=garment.id,
        status=JobStatus.pending,
    )
    db.add(pending_job)
    db.commit()
    db.refresh(pending_job)

    response = client.post(
        f"{settings.API_V1_STR}/video-tryon/",
        headers=normal_user_token_headers,
        params={"tryon_job_id": str(pending_job.id)},
    )

    assert response.status_code == 400
    assert "completed" in response.json()["detail"].lower()


def test_create_video_tryon_parent_not_found(
    client: TestClient, normal_user_token_headers: dict[str, str]
) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/video-tryon/",
        headers=normal_user_token_headers,
        params={"tryon_job_id": str(uuid.uuid4())},
    )

    assert response.status_code == 404


def test_get_video_tryon_completed(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    user_id = _get_current_user_id(client, normal_user_token_headers)
    garment = _create_garment(db)
    parent_job = _create_completed_tryon_job(db, user_id, garment.id)

    video_job = VideoTryOnJob(
        user_id=user_id,
        tryon_job_id=parent_job.id,
        status=JobStatus.pending,
        sagemaker_output_s3="s3://bucket/output/video_result.json",
    )
    db.add(video_job)
    db.commit()
    db.refresh(video_job)

    mock_result = {"result_url": "s3://bucket/results/video.mp4"}
    with (
        patch(
            "app.api.routes.video_tryon.sagemaker_client.check_async_failure",
            return_value=False,
        ),
        patch(
            "app.api.routes.video_tryon.sagemaker_client.get_async_result",
            return_value=mock_result,
        ),
        patch(
            "app.api.routes.video_tryon.sagemaker_client.generate_presigned_url",
            return_value="https://presigned.url/video.mp4",
        ),
    ):
        response = client.get(
            f"{settings.API_V1_STR}/video-tryon/{video_job.id}",
            headers=normal_user_token_headers,
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["result_url"] == "https://presigned.url/video.mp4"


def test_get_video_tryon_failed(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    user_id = _get_current_user_id(client, normal_user_token_headers)
    garment = _create_garment(db)
    parent_job = _create_completed_tryon_job(db, user_id, garment.id)

    video_job = VideoTryOnJob(
        user_id=user_id,
        tryon_job_id=parent_job.id,
        status=JobStatus.pending,
        sagemaker_output_s3="s3://bucket/output/video_result.json",
    )
    db.add(video_job)
    db.commit()
    db.refresh(video_job)

    with patch(
        "app.api.routes.video_tryon.sagemaker_client.check_async_failure",
        return_value=True,
    ):
        response = client.get(
            f"{settings.API_V1_STR}/video-tryon/{video_job.id}",
            headers=normal_user_token_headers,
        )

    assert response.status_code == 200
    assert response.json()["status"] == "failed"


def test_get_video_tryon_still_pending(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    user_id = _get_current_user_id(client, normal_user_token_headers)
    garment = _create_garment(db)
    parent_job = _create_completed_tryon_job(db, user_id, garment.id)

    video_job = VideoTryOnJob(
        user_id=user_id,
        tryon_job_id=parent_job.id,
        status=JobStatus.pending,
        sagemaker_output_s3="s3://bucket/output/video_result.json",
    )
    db.add(video_job)
    db.commit()
    db.refresh(video_job)

    with (
        patch(
            "app.api.routes.video_tryon.sagemaker_client.check_async_failure",
            return_value=False,
        ),
        patch(
            "app.api.routes.video_tryon.sagemaker_client.get_async_result",
            return_value=None,
        ),
    ):
        response = client.get(
            f"{settings.API_V1_STR}/video-tryon/{video_job.id}",
            headers=normal_user_token_headers,
        )

    assert response.status_code == 200
    assert response.json()["status"] == "pending"


def test_delete_video_tryon(
    client: TestClient, normal_user_token_headers: dict[str, str], db: Session
) -> None:
    user_id = _get_current_user_id(client, normal_user_token_headers)
    garment = _create_garment(db)
    parent_job = _create_completed_tryon_job(db, user_id, garment.id)

    video_job = VideoTryOnJob(
        user_id=user_id,
        tryon_job_id=parent_job.id,
        status=JobStatus.pending,
        sagemaker_output_s3="s3://bucket/output/video_result.json",
    )
    db.add(video_job)
    db.commit()
    db.refresh(video_job)

    response = client.delete(
        f"{settings.API_V1_STR}/video-tryon/{video_job.id}",
        headers=normal_user_token_headers,
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Video job deleted"


def test_create_video_tryon_unauthenticated(client: TestClient) -> None:
    response = client.post(
        f"{settings.API_V1_STR}/video-tryon/",
        params={"tryon_job_id": str(uuid.uuid4())},
    )

    assert response.status_code == 401
