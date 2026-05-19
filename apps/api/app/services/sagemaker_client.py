import json

import boto3
from botocore.exceptions import ClientError

from app.core.config import settings


class SageMakerClient:
    def __init__(self) -> None:
        self._sm = boto3.client("sagemaker-runtime", region_name=settings.AWS_REGION)
        self._sm_ctrl = boto3.client("sagemaker", region_name=settings.AWS_REGION)
        self._s3 = boto3.client("s3", region_name=settings.AWS_REGION)

    def invoke_async_endpoint(self, endpoint_name: str, input_s3_uri: str) -> str:
        """Submit async inference job. Returns output S3 URI."""
        resp = self._sm.invoke_endpoint_async(
            EndpointName=endpoint_name,
            InputLocation=input_s3_uri,
            ContentType="application/json",
        )
        return resp["OutputLocation"]

    def get_async_result(self, output_s3_uri: str) -> dict | None:
        """Poll S3 for async result. Returns None if not ready yet."""
        bucket, key = output_s3_uri.replace("s3://", "").split("/", 1)
        try:
            obj = self._s3.get_object(Bucket=bucket, Key=key)
            return json.loads(obj["Body"].read())
        except ClientError as e:
            if e.response["Error"]["Code"] in ("NoSuchKey", "404"):
                return None
            raise

    def invoke_realtime_endpoint(self, endpoint_name: str, payload: dict) -> dict:
        resp = self._sm.invoke_endpoint(
            EndpointName=endpoint_name,
            ContentType="application/json",
            Body=json.dumps(payload),
        )
        return json.loads(resp["Body"].read())

    def start_training_job(
        self,
        job_name: str,
        role_arn: str,
        image_uri: str,
        input_s3_uri: str,
        output_s3_uri: str,
        instance_type: str = "ml.g5.2xlarge",
        hyperparameters: dict | None = None,
    ) -> str:
        self._sm_ctrl.create_training_job(
            TrainingJobName=job_name,
            RoleArn=role_arn,
            AlgorithmSpecification={"TrainingImage": image_uri, "TrainingInputMode": "File"},
            InputDataConfig=[{"ChannelName": "training", "DataSource": {"S3DataSource": {"S3DataType": "S3Prefix", "S3Uri": input_s3_uri}}}],
            OutputDataConfig={"S3OutputPath": output_s3_uri},
            ResourceConfig={"InstanceType": instance_type, "InstanceCount": 1, "VolumeSizeInGB": 50},
            StoppingCondition={"MaxRuntimeInSeconds": 7200},
            HyperParameters=hyperparameters or {},
        )
        return job_name

    def get_training_job_status(self, job_name: str) -> str:
        resp = self._sm_ctrl.describe_training_job(TrainingJobName=job_name)
        return resp["TrainingJobStatus"]

    def upload_json_to_s3(self, bucket: str, key: str, data: dict) -> str:
        self._s3.put_object(Bucket=bucket, Key=key, Body=json.dumps(data), ContentType="application/json")
        return f"s3://{bucket}/{key}"

    def upload_bytes_to_s3(self, bucket: str, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        self._s3.put_object(Bucket=bucket, Key=key, Body=data, ContentType=content_type)
        return f"s3://{bucket}/{key}"

    def generate_presigned_url(self, s3_uri: str, expiration: int = 3600) -> str:
        """Convert s3://bucket/key URI to a presigned HTTPS URL."""
        bucket, key = s3_uri.replace("s3://", "").split("/", 1)
        return self._s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=expiration,
        )

    def check_async_failure(self, output_s3_uri: str) -> bool:
        """Check if an async inference job has failed by looking for .failure file."""
        bucket, key = output_s3_uri.replace("s3://", "").split("/", 1)
        failure_key = key + ".failure"
        try:
            self._s3.head_object(Bucket=bucket, Key=failure_key)
            return True
        except ClientError as e:
            if e.response["Error"]["Code"] in ("404", "NoSuchKey"):
                return False
            raise


_client: SageMakerClient | None = None


def get_sagemaker_client() -> SageMakerClient:
    global _client
    if _client is None:
        _client = SageMakerClient()
    return _client


# Legacy singleton for existing code, but preferred usage is get_sagemaker_client()
sagemaker_client = SageMakerClient()
