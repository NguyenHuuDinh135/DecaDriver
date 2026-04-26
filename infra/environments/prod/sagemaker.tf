locals {
  hf_pytorch_inference = "763104351884.dkr.ecr.${var.aws_region}.amazonaws.com/huggingface-pytorch-inference:2.6.0-transformers4.51.3-gpu-py312-cu124-ubuntu22.04"
}

# ── CLIP ViT-L/14 — Real-time Endpoint ────────────────────────────────────────

resource "aws_sagemaker_model" "clip" {
  name               = "decadriver-clip-prod"
  execution_role_arn = aws_iam_role.sagemaker.arn

  primary_container {
    image = local.hf_pytorch_inference
    environment = {
      HF_MODEL_ID                   = "openai/clip-vit-large-patch14"
      HF_TASK                       = "feature-extraction"
      SAGEMAKER_CONTAINER_LOG_LEVEL = "20"
    }
  }
}

resource "aws_sagemaker_endpoint_configuration" "clip" {
  name = "decadriver-clip-prod"

  production_variants {
    variant_name           = "default"
    model_name             = aws_sagemaker_model.clip.name
    instance_type          = "ml.g4dn.xlarge"
    initial_instance_count = 1
  }
}

resource "aws_sagemaker_endpoint" "clip" {
  name                 = "decadriver-clip-prod"
  endpoint_config_name = aws_sagemaker_endpoint_configuration.clip.name
}

# ── FASHN v1.5 — Async Endpoint (custom ECR image) ────────────────────────────
# Requires: deploy-ai.yml must push image to ECR first
# Set var.create_ai_endpoints=true after CI/CD runs

resource "aws_sagemaker_model" "fashn" {
  count              = var.create_ai_endpoints ? 1 : 0
  name               = "decadriver-fashn-prod"
  execution_role_arn = aws_iam_role.sagemaker.arn

  primary_container {
    image = "${aws_ecr_repository.fashn.repository_url}:latest"
    environment = {
      AI_S3_BUCKET                  = aws_s3_bucket.ai_assets.bucket
      SAGEMAKER_CONTAINER_LOG_LEVEL = "20"
    }
  }
}

resource "aws_sagemaker_endpoint_configuration" "fashn" {
  count = var.create_ai_endpoints ? 1 : 0
  name  = "decadriver-fashn-prod"

  production_variants {
    variant_name           = "default"
    model_name             = aws_sagemaker_model.fashn[0].name
    instance_type          = "ml.g5.2xlarge"
    initial_instance_count = 1
  }

  async_inference_config {
    output_config {
      s3_output_path = "s3://${aws_s3_bucket.ai_assets.bucket}/results/fashn/"
    }
  }
}

resource "aws_sagemaker_endpoint" "fashn" {
  count                = var.create_ai_endpoints ? 1 : 0
  name                 = "decadriver-fashn-prod"
  endpoint_config_name = aws_sagemaker_endpoint_configuration.fashn[0].name
}

# ── Qwen2.5-VL-7B — Async Endpoint ────────────────────────────────────────────
# Requires: deploy-ai.yml must upload qwen/source.tar.gz to S3 first

resource "aws_sagemaker_model" "qwen" {
  count              = var.create_ai_endpoints ? 1 : 0
  name               = "decadriver-qwen-prod"
  execution_role_arn = aws_iam_role.sagemaker.arn

  primary_container {
    image          = local.hf_pytorch_inference
    model_data_url = "s3://${aws_s3_bucket.ai_assets.bucket}/models/qwen/source.tar.gz"
    environment = {
      HF_MODEL_ID                   = "Qwen/Qwen2.5-VL-7B-Instruct"
      SAGEMAKER_CONTAINER_LOG_LEVEL = "20"
      SAGEMAKER_PROGRAM             = "inference_qwen.py"
    }
  }
}

resource "aws_sagemaker_endpoint_configuration" "qwen" {
  count = var.create_ai_endpoints ? 1 : 0
  name  = "decadriver-qwen-prod"

  production_variants {
    variant_name           = "default"
    model_name             = aws_sagemaker_model.qwen[0].name
    instance_type          = "ml.g5.2xlarge"
    initial_instance_count = 1
  }

  async_inference_config {
    output_config {
      s3_output_path = "s3://${aws_s3_bucket.ai_assets.bucket}/results/qwen/"
    }
  }
}

resource "aws_sagemaker_endpoint" "qwen" {
  count                = var.create_ai_endpoints ? 1 : 0
  name                 = "decadriver-qwen-prod"
  endpoint_config_name = aws_sagemaker_endpoint_configuration.qwen[0].name
}

# ── SSM — endpoint names ───────────────────────────────────────────────────────

resource "aws_ssm_parameter" "sagemaker_clip_endpoint" {
  name  = "/decadriver/prod/sagemaker_clip_endpoint"
  type  = "String"
  value = aws_sagemaker_endpoint.clip.name
}

resource "aws_ssm_parameter" "sagemaker_fashn_endpoint" {
  count = var.create_ai_endpoints ? 1 : 0
  name  = "/decadriver/prod/sagemaker_fashn_endpoint"
  type  = "String"
  value = aws_sagemaker_endpoint.fashn[0].name
}

resource "aws_ssm_parameter" "sagemaker_qwen_endpoint" {
  count = var.create_ai_endpoints ? 1 : 0
  name  = "/decadriver/prod/sagemaker_qwen_endpoint"
  type  = "String"
  value = aws_sagemaker_endpoint.qwen[0].name
}
