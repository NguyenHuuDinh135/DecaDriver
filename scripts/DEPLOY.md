# DecaDriver Deploy Guide

## Prerequisites

| Tool | Cài đặt | Kiểm tra |
|------|---------|----------|
| AWS CLI v2 | `curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o aws.zip && unzip aws.zip && sudo ./aws/install` | `aws --version` |
| Docker | `sudo pacman -S docker` | `docker info` |
| Terraform | `sudo pacman -S terraform` | `terraform --version` |
| Bun | `curl -fsSL https://bun.sh/install \| bash` | `bun --version` |
| uv | `curl -LsSf https://astral.sh/uv/install.sh \| sh` | `uv --version` |

## AWS Authentication

```bash
# Cấu hình credentials
aws configure
# AWS Access Key ID: <your-key>
# AWS Secret Access Key: <your-secret>
# Default region: us-west-2
# Output format: json

# Kiểm tra
aws sts get-caller-identity
```

IAM user cần permissions:
- `AmazonECS_FullAccess`
- `AmazonECR_FullAccess`
- `AmazonSageMakerFullAccess`
- `AmazonS3FullAccess`
- `AmazonSSMReadOnlyAccess`
- `AmazonVPCFullAccess`
- `AmazonRDSFullAccess`
- `IAMFullAccess` (cho Terraform tạo roles)

---

## Deploy Commands

```bash
cd ~/DecaDriver

./scripts/deploy.sh              # Full: infra → AI → API → Web
./scripts/deploy.sh infra        # Terraform only
./scripts/deploy.sh ai           # SageMaker handler images
./scripts/deploy.sh api          # API container + DB migrations
./scripts/deploy.sh web          # Web container
./scripts/deploy.sh app          # API + Web (skip infra/AI)
./scripts/deploy.sh verify       # Health check only
```

---

## Lần đầu tiên deploy (Fresh AWS Account)

### Bước 1: Khởi tạo hạ tầng

```bash
./scripts/deploy.sh infra
```

Tạo: VPC, subnets, RDS PostgreSQL (pgvector), ECS cluster, ECR repos, S3 buckets, IAM roles, SSM parameters.

### Bước 2: Build và push AI images

```bash
./scripts/deploy.sh ai
```

Push: `decadriver-fashn`, `decadriver-catvton` lên ECR + upload Qwen handler lên S3.

### Bước 3: Bật SageMaker endpoints

```bash
cd infra/environments/prod
terraform apply -var create_ai_endpoints=true
```

Phải chạy riêng vì SageMaker cần image có sẵn trên ECR trước.

### Bước 4: Deploy ứng dụng

```bash
./scripts/deploy.sh app
```

Build API + Web containers → push ECR → deploy ECS → chạy DB migrations.

### Bước 5: Kiểm tra

```bash
./scripts/deploy.sh verify
```

---

## Deploy thường ngày (Code changes only)

Chỉ sửa code, không thêm model/env var:

```bash
git push origin main
# CI/CD tự deploy qua GitHub Actions

# Hoặc manual:
./scripts/deploy.sh app
```

---

## Khi nào cần làm gì thêm

### Thêm/sửa database model

```bash
# 1. Tạo migration
cd apps/api
alembic revision --autogenerate -m "add_new_table"

# 2. Test locally
alembic upgrade head

# 3. Deploy (migration chạy tự động)
cd ~/DecaDriver
./scripts/deploy.sh api
```

### Thêm environment variable mới

```bash
# 1. Thêm vào config.py
#    SAGEMAKER_NEW_ENDPOINT: str = ""

# 2. Thêm SSM parameter (infra/environments/prod/ssm.tf)
#    resource "aws_ssm_parameter" "new_endpoint" { ... }

# 3. Thêm vào ECS task (infra/environments/prod/ecs.tf)
#    { name = "SAGEMAKER_NEW_ENDPOINT", valueFrom = aws_ssm_parameter.new_endpoint.arn }

# 4. Deploy infra trước, rồi app
./scripts/deploy.sh infra
./scripts/deploy.sh app
```

### Thêm SageMaker endpoint mới

```bash
# 1. Viết inference handler: apps/api/app/services/sagemaker_handlers/inference_xxx.py
# 2. Viết Dockerfile: Dockerfile.xxx
# 3. Thêm Terraform resources (sagemaker.tf): model, endpoint_config, endpoint
# 4. Thêm ECR repo (ecr.tf)
# 5. Thêm build step (deploy-ai.yml)
# 6. Thêm route (app/api/routes/xxx.py) + register in main.py

# Deploy order:
./scripts/deploy.sh infra    # Tạo ECR repo
./scripts/deploy.sh ai       # Push image
cd infra/environments/prod
terraform apply -var create_ai_endpoints=true   # Tạo endpoint
./scripts/deploy.sh app      # Deploy API with new route
```

### Đổi domain / thêm SSL

```bash
# 1. Tạo ACM certificate (infra/environments/prod/acm.tf)
# 2. Thêm Route53 hosted zone + A record
# 3. Thêm HTTPS listener cho ALB (port 443)
# 4. Redirect HTTP → HTTPS

./scripts/deploy.sh infra
```

---

## Troubleshooting

### API trả 502

```bash
# Xem logs realtime
aws logs tail /ecs/decadriver-api --follow --region us-west-2

# Nguyên nhân thường gặp:
# - Thiếu env var → check SSM parameters
# - DB connection refused → check RDS security group
# - Import error → check requirements.txt / pyproject.toml
```

### SageMaker endpoint lỗi

```bash
# Check endpoint status
aws sagemaker describe-endpoint --endpoint-name decadriver-fashn-prod --region us-west-2

# Xem logs model container
aws logs tail /aws/sagemaker/Endpoints/decadriver-fashn-prod --follow --region us-west-2

# Nguyên nhân thường gặp:
# - InService nhưng timeout → model đang load (lần đầu 3-5 phút)
# - Failed → Docker image lỗi, check CloudWatch logs
# - OutOfMemory → cần instance lớn hơn (ml.g5.4xlarge)
```

### Web page trắng

```bash
# Kiểm tra NEXT_PUBLIC_API_URL
aws ssm get-parameter --name /decadriver/prod/alb_dns_name --region us-west-2

# Xem web logs
aws logs tail /ecs/decadriver-web --follow --region us-west-2

# Nguyên nhân thường gặp:
# - API URL sai → rebuild web image với đúng build-arg
# - CORS → check API CORS settings
```

### ECS task liên tục restart

```bash
# Xem stopped tasks
aws ecs list-tasks --cluster decadriver --desired-status STOPPED --region us-west-2

# Describe task để xem exit code
aws ecs describe-tasks --cluster decadriver --tasks <task-arn> --region us-west-2

# Health check fail → kiểm tra /api/v1/health endpoint
# Exit code 137 → OOM, tăng task memory
# Exit code 1 → app crash, xem logs
```

### Database migration lỗi

```bash
# Chạy migration manually
aws ecs execute-command \
  --cluster decadriver \
  --task <task-arn> \
  --container api \
  --interactive \
  --command "alembic upgrade head"

# Rollback migration
aws ecs execute-command \
  --cluster decadriver \
  --task <task-arn> \
  --container api \
  --interactive \
  --command "alembic downgrade -1"
```

---

## Kiến trúc deploy

```
GitHub Push (main)
       │
       ├── deploy-web.yml ──→ ECR (decadriver-web) ──→ ECS Service
       ├── deploy-api.yml ──→ ECR (decadriver-api) ──→ ECS Service
       └── deploy-ai.yml  ──→ ECR (decadriver-fashn, decadriver-catvton)
                               + S3 (qwen handler)

Terraform (manual/script)
       │
       ├── VPC + Subnets + NAT Gateway
       ├── RDS PostgreSQL 15 + pgvector
       ├── ECS Cluster + Services + Task Definitions
       ├── ALB + Target Groups + Listeners
       ├── ECR Repositories
       ├── S3 Buckets (ai-assets, web-static)
       ├── SageMaker (CLIP, FASHN, Qwen, CatV2TON)
       ├── IAM Roles + Policies
       └── SSM Parameters (secrets, config)
```

---

## AI Stack Summary (5 flows)

| Flow | Endpoint | Type | Instance | Dùng cho |
|------|----------|------|----------|----------|
| CLIP | `decadriver-clip-prod` | Realtime | ml.g4dn.xlarge | Embedding garments → recommend |
| FASHN | `decadriver-fashn-prod` | Async | ml.g5.2xlarge | Image try-on (person + garment → ảnh) |
| Qwen | `decadriver-qwen-prod` | Async | ml.g5.2xlarge | Style analysis (ảnh → body type, color tone) |
| CatV2TON | `decadriver-catvton-prod` | Async | ml.g5.2xlarge | Video try-on (person + garment → MP4 5-10s) |
| DreamBooth | Training job | On-demand | ml.g5.2xlarge | Avatar LoRA training (ảnh user → model) |

Async endpoints có scale-to-zero: không tốn tiền khi không dùng, cold start ~3-5 phút.

---

## Cost Estimates (Monthly)

| Resource | Ước tính | Ghi chú |
|----------|----------|---------|
| ECS Fargate (API + Web) | ~$30-50 | 0.25 vCPU, 512MB mỗi service |
| RDS db.t3.micro | ~$15 | Free tier eligible |
| SageMaker CLIP (always-on) | ~$150 | ml.g4dn.xlarge |
| SageMaker Async (scale-to-zero) | ~$0-50 | Chỉ tính khi chạy inference |
| NAT Gateway | ~$35 | Cân nhắc dùng VPC endpoints thay thế |
| S3 + ECR | ~$5 | Storage + data transfer |
| **Total** | **~$235-305** | Không tính free tier |

Tiết kiệm: Xóa CLIP realtime endpoint nếu chưa cần recommend feature (~$150/tháng).
