locals {
  hf_pytorch_inference = "763104351884.dkr.ecr.${var.aws_region}.amazonaws.com/huggingface-pytorch-inference:2.1.0-transformers4.37.0-gpu-py310-cu118-ubuntu20.04"
  hf_tgi               = "763104351884.dkr.ecr.${var.aws_region}.amazonaws.com/huggingface-pytorch-tgi-inference:2.1.1-tgi1.4.0-gpu-py310-cu121-ubuntu22.04"
}

# ── CLIP ViT-L/14 — Real-time Endpoint ────────────────────────────────────────

resource "aws_sagemaker_model" "clip" {
  name               = "decadriver-clip-prod"
  execution_role_arn = aws_iam_role.sagemaker.arn

  primary_container {
    image = local.hf_pytorch_inference
    environment = {
      HF_MODEL_ID                = "openai/clip-vit-large-patch14"
      HF_TASK                    = "feature-extraction"
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

# ── FASHN v1.5 — Async Endpoint ───────────────────────────────────────────────

resource "aws_sagemaker_model" "fashn" {
  name               = "decadriver-fashn-prod"
  execution_role_arn = aws_iam_role.sagemaker.arn

  primary_container {
    image          = local.hf_pytorch_inference
    model_data_url = "s3://${aws_s3_bucket.ai_assets.bucket}/models/fashn/source.tar.gz"
    environment = {
      HF_MODEL_ID                   = "fashn/tryon"
      SAGEMAKER_CONTAINER_LOG_LEVEL = "20"
      SAGEMAKER_PROGRAM             = "inference_fashn.py"
    }
  }
}

resource "aws_sagemaker_endpoint_configuration" "fashn" {
  name = "decadriver-fashn-prod"

  production_variants {
    variant_name           = "default"
    model_name             = aws_sagemaker_model.fashn.name
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
  name                 = "decadriver-fashn-prod"
  endpoint_config_name = aws_sagemaker_endpoint_configuration.fashn.name
}

# ── Qwen2.5-VL-7B — Async Endpoint ────────────────────────────────────────────

resource "aws_sagemaker_model" "qwen" {
  name               = "decadriver-qwen-prod"
  execution_role_arn = aws_iam_role.sagemaker.arn

  primary_container {
    image = local.hf_tgi
    environment = {
      HF_MODEL_ID                   = "Qwen/Qwen2.5-VL-7B-Instruct"
      SM_NUM_GPUS                   = "1"
      MAX_INPUT_LENGTH              = "4096"
      MAX_TOTAL_TOKENS              = "8192"
      SAGEMAKER_CONTAINER_LOG_LEVEL = "20"
    }
  }
}

resource "aws_sagemaker_endpoint_configuration" "qwen" {
  name = "decadriver-qwen-prod"

  production_variants {
    variant_name           = "default"
    model_name             = aws_sagemaker_model.qwen.name
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
  name                 = "decadriver-qwen-prod"
  endpoint_config_name = aws_sagemaker_endpoint_configuration.qwen.name
}

# ── SSM — endpoint names for ECS to read ──────────────────────────────────────

resource "aws_ssm_parameter" "sagemaker_clip_endpoint" {
  name  = "/decadriver/prod/sagemaker_clip_endpoint"
  type  = "String"
  value = aws_sagemaker_endpoint.clip.name
}

resource "aws_ssm_parameter" "sagemaker_fashn_endpoint" {
  name  = "/decadriver/prod/sagemaker_fashn_endpoint"
  type  = "String"
  value = aws_sagemaker_endpoint.fashn.name
}

resource "aws_ssm_parameter" "sagemaker_qwen_endpoint" {
  name  = "/decadriver/prod/sagemaker_qwen_endpoint"
  type  = "String"
  value = aws_sagemaker_endpoint.qwen.name
}
