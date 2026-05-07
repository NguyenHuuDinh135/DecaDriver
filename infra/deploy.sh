#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")/environments/prod" && pwd)"
HANDLERS_DIR="$(cd "$(dirname "$0")/../apps/api/app/services/sagemaker_handlers" && pwd)"
AWS_REGION="$(aws configure get region 2>/dev/null || echo 'us-east-1')"

cd "$DIR"

echo "══════════════════════════════════════════════"
echo "  DecaDriver Infrastructure Deploy"
echo "══════════════════════════════════════════════"

# Phase 1: Init + base infrastructure
echo ""
echo "▶ Phase 1: terraform init"
terraform init

echo ""
echo "▶ Phase 1: terraform plan (base infra, AI endpoints OFF)"
terraform plan

echo ""
read -p "Apply base infrastructure? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

terraform apply -auto-approve
echo "✓ Base infrastructure created"

# Phase 2: Push AI artifacts then create AI endpoints
echo ""
echo "══════════════════════════════════════════════"
echo "  Phase 2: Deploy AI models"
echo "══════════════════════════════════════════════"

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_URL="${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/decadriver-fashn:latest"
AI_BUCKET="decadriver-ai-assets-${ACCOUNT_ID}"

echo ""
echo "▶ Login to ECR"
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

echo "▶ Login to SageMaker base ECR (for base image pull)"
aws ecr get-login-password --region "$AWS_REGION" --registry-ids 763104351884 2>/dev/null | \
  docker login --username AWS --password-stdin "763104351884.dkr.ecr.${AWS_REGION}.amazonaws.com" 2>/dev/null || true

echo ""
echo "▶ Build and push FASHN image"
docker build -f "$HANDLERS_DIR/Dockerfile.fashn" -t "$ECR_URL" "$HANDLERS_DIR"
docker push "$ECR_URL"

echo ""
echo "▶ Upload Qwen handler to S3"
tar -czf /tmp/qwen.tar.gz -C "$HANDLERS_DIR" inference_qwen.py
aws s3 cp /tmp/qwen.tar.gz "s3://${AI_BUCKET}/models/qwen/source.tar.gz"

echo ""
echo "▶ Phase 2: terraform apply (AI endpoints ON)"
terraform apply -auto-approve -var="create_ai_endpoints=true"

echo ""
echo "══════════════════════════════════════════════"
echo "  ✓ All done! Infrastructure fully deployed."
echo "══════════════════════════════════════════════"
terraform output
