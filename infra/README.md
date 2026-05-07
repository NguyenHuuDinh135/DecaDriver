# Infrastructure — DecaDriver (AWS us-east-1)

## Architecture

```
GitHub Actions CI/CD
  ├── terraform.yml      → infra/environments/prod/
  ├── deploy-web.yml     → S3 + CloudFront (Next.js static)
  ├── deploy-api.yml     → ECR + ECS Fargate (FastAPI)
  └── deploy-ai.yml      → S3 model artifacts (SageMaker handlers)

AWS us-east-1
  ├── VPC (10.0.0.0/16)
  │   ├── Public subnets  → ALB, NAT Gateway
  │   └── Private subnets → ECS Fargate, RDS PostgreSQL
  ├── ECS Fargate         → FastAPI API (ECR image)
  ├── RDS PostgreSQL 15   → + pgvector extension
  ├── S3 (web)            → Next.js static export + CloudFront
  ├── S3 (ai-assets)      → LoRA weights, garment images, try-on results
  └── SageMaker
      ├── CLIP ViT-L/14   → Real-time endpoint (ml.g4dn.xlarge)
      ├── FASHN v1.5      → Async endpoint (ml.g5.2xlarge)
      └── Qwen2.5-VL-7B   → Async endpoint (ml.g5.2xlarge)
```

## Prerequisites

1. AWS account with permissions for: VPC, ECS, ECR, RDS, S3, SageMaker, IAM, SSM, CloudFront
2. GitHub OIDC provider already configured in AWS IAM:
   ```bash
   aws iam create-open-id-connect-provider \
     --url https://token.actions.githubusercontent.com \
     --client-id-list sts.amazonaws.com \
     --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
   ```

## First-time Setup

### 1. Create Terraform remote state backend

```bash
aws s3 mb s3://decadriver-tfstate --region us-east-1
aws dynamodb create-table \
  --table-name decadriver-tfstate-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### 2. Deploy infrastructure

```bash
cd infra/environments/prod
terraform init
terraform plan \
  -var="bucket_name=decadriver-web-prod" \
  -var="first_superuser_email=admin@yourdomain.com"
terraform apply \
  -var="bucket_name=decadriver-web-prod" \
  -var="first_superuser_email=admin@yourdomain.com"
```

### 3. Get outputs for GitHub Secrets

```bash
terraform output
```

### 4. Upload initial FASHN model artifact to S3

FASHN v1.5 requires model weights uploaded to S3 before the endpoint can start:

```bash
# Download FASHN v1.5 weights (requires HuggingFace token)
huggingface-cli download fashn/tryon --local-dir /tmp/fashn-model

# Package and upload
tar -czf /tmp/fashn-model.tar.gz -C /tmp/fashn-model .
aws s3 cp /tmp/fashn-model.tar.gz \
  s3://$(terraform output -raw ai_s3_bucket)/models/fashn/source.tar.gz
```

## GitHub Secrets Required

Set these in your repository Settings → Secrets and variables → Actions:

| Secret | Value | Source |
|---|---|---|
| `AWS_ROLE_ARN` | IAM role ARN for GitHub Actions | `terraform output` → `iam.tf` `github_actions` role |
| `S3_BUCKET` | Web static bucket name | `terraform output bucket_id` |
| `ECR_REPOSITORY_URL` | ECR repo URL | `terraform output ecr_repository_url` |
| `ECS_CLUSTER_NAME` | ECS cluster name | `terraform output ecs_cluster_name` |
| `ECS_SERVICE_NAME` | ECS service name | `terraform output ecs_service_name` |
| `AI_S3_BUCKET` | AI assets bucket name | `terraform output ai_s3_bucket` |
| `API_URL` | ALB DNS (fallback) | `terraform output alb_dns_name` |

## Verify Deployment

```bash
# Check API health
curl http://$(terraform output -raw alb_dns_name)/api/v1/health

# Expected response:
# {"db":"ok","clip":"InService","fashn":"InService","qwen":"InService"}
```

## SageMaker Endpoint Notes

- **CLIP** (real-time): Always running, ~$0.70/hr on ml.g4dn.xlarge
- **FASHN + Qwen** (async): Queue-based, scale-to-zero when idle
- **DreamBooth**: On-demand Training Jobs, billed per minute (~$0.50/user)
- **CatV2TON** (video): Not deployed yet — add later when needed

## Updating Inference Handlers

Push changes to `apps/api/app/services/sagemaker_handlers/` → `deploy-ai.yml` auto-uploads to S3.
To apply new handler to a running endpoint, re-run `terraform apply` to update the SageMaker model artifact.

## Costs (estimate, us-east-1)

| Resource | Cost |
|---|---|
| ECS Fargate (1 vCPU/2GB) | ~$30/mo |
| RDS db.t3.medium | ~$50/mo |
| CLIP endpoint (ml.g4dn.xlarge) | ~$500/mo (24/7) |
| FASHN/Qwen async (ml.g5.2xlarge) | Pay per use |
| NAT Gateway | ~$35/mo |
| S3 + CloudFront | ~$5/mo |

To reduce costs: stop CLIP endpoint when not demoing (`aws sagemaker delete-endpoint --endpoint-name decadriver-clip-prod`).
