import json
from io import BytesIO
from unittest.mock import MagicMock, patch

import pytest
from botocore.exceptions import ClientError

from app.services.sagemaker_client import SageMakerClient


@pytest.fixture
def sm_client() -> SageMakerClient:
    with patch("boto3.client"):
        client = SageMakerClient()
    client._s3 = MagicMock()
    client._sm = MagicMock()
    client._sm_ctrl = MagicMock()
    return client


class TestGeneratePresignedUrl:
    def test_returns_presigned_url(self, sm_client: SageMakerClient) -> None:
        sm_client._s3.generate_presigned_url.return_value = "https://bucket.s3.amazonaws.com/key?signed=true"
        result = sm_client.generate_presigned_url("s3://my-bucket/path/to/file.jpg")
        assert result == "https://bucket.s3.amazonaws.com/key?signed=true"
        sm_client._s3.generate_presigned_url.assert_called_once_with(
            "get_object",
            Params={"Bucket": "my-bucket", "Key": "path/to/file.jpg"},
            ExpiresIn=3600,
        )

    def test_custom_expiration(self, sm_client: SageMakerClient) -> None:
        sm_client._s3.generate_presigned_url.return_value = "https://url"
        sm_client.generate_presigned_url("s3://bucket/key", expiration=7200)
        sm_client._s3.generate_presigned_url.assert_called_once_with(
            "get_object",
            Params={"Bucket": "bucket", "Key": "key"},
            ExpiresIn=7200,
        )


class TestCheckAsyncFailure:
    def test_returns_true_when_failure_file_exists(self, sm_client: SageMakerClient) -> None:
        sm_client._s3.head_object.return_value = {}
        result = sm_client.check_async_failure("s3://bucket/output/result.json")
        assert result is True
        sm_client._s3.head_object.assert_called_once_with(
            Bucket="bucket", Key="output/result.json.failure"
        )

    def test_returns_false_when_no_failure_file(self, sm_client: SageMakerClient) -> None:
        error_response = {"Error": {"Code": "404", "Message": "Not Found"}}
        sm_client._s3.head_object.side_effect = ClientError(error_response, "HeadObject")
        result = sm_client.check_async_failure("s3://bucket/output/result.json")
        assert result is False

    def test_raises_on_unexpected_error(self, sm_client: SageMakerClient) -> None:
        error_response = {"Error": {"Code": "403", "Message": "Forbidden"}}
        sm_client._s3.head_object.side_effect = ClientError(error_response, "HeadObject")
        with pytest.raises(ClientError):
            sm_client.check_async_failure("s3://bucket/output/result.json")


class TestGetAsyncResult:
    def test_returns_parsed_json(self, sm_client: SageMakerClient) -> None:
        body = BytesIO(json.dumps({"result_url": "s3://bucket/result.jpg"}).encode())
        sm_client._s3.get_object.return_value = {"Body": body}
        result = sm_client.get_async_result("s3://bucket/output.json")
        assert result == {"result_url": "s3://bucket/result.jpg"}

    def test_returns_none_when_not_ready(self, sm_client: SageMakerClient) -> None:
        error_response = {"Error": {"Code": "NoSuchKey", "Message": "Not Found"}}
        sm_client._s3.get_object.side_effect = ClientError(error_response, "GetObject")
        result = sm_client.get_async_result("s3://bucket/output.json")
        assert result is None


class TestUploadJsonToS3:
    def test_uploads_and_returns_uri(self, sm_client: SageMakerClient) -> None:
        result = sm_client.upload_json_to_s3("my-bucket", "path/data.json", {"key": "value"})
        assert result == "s3://my-bucket/path/data.json"
        sm_client._s3.put_object.assert_called_once()
        call_kwargs = sm_client._s3.put_object.call_args.kwargs
        assert call_kwargs["Bucket"] == "my-bucket"
        assert call_kwargs["Key"] == "path/data.json"
        assert json.loads(call_kwargs["Body"]) == {"key": "value"}


class TestUploadBytesToS3:
    def test_uploads_and_returns_uri(self, sm_client: SageMakerClient) -> None:
        data = b"binary content"
        result = sm_client.upload_bytes_to_s3("my-bucket", "path/file.bin", data, "application/octet-stream")
        assert result == "s3://my-bucket/path/file.bin"
        sm_client._s3.put_object.assert_called_once_with(
            Bucket="my-bucket", Key="path/file.bin", Body=data, ContentType="application/octet-stream"
        )
