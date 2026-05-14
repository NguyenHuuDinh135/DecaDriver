#!/usr/bin/env bash
set -euo pipefail

# ══════════════════════════════════════════════════════════════════════════════
# DecaDriver — Deploy Preflight Checks
# ══════════════════════════════════════════════════════════════════════════════
#
# Validates all required artifacts exist BEFORE deploying.
# Run: ./scripts/preflight.sh
#
# Checks:
#   1. SSM parameters exist (ALB DNS, secrets)
#   2. ECR images exist for all services
#   3. S3 model artifacts exist for SageMaker endpoints
#   4. SageMaker endpoints are healthy (not in Failed state)
#
# ══════════════════════════════════════════════════════════════════════════════

AWS_REGION="${AWS_REGION:-us-west-2}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text 2>/dev/null || echo "")}"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
AI_BUCKET="decadriver-ai-assets-${AWS_ACCOUNT_ID}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

pass() { echo -e "${GREEN}  ✓${NC} $*"; }
warn() { echo -e "${YELLOW}  ⚠${NC} $*"; WARNINGS=$((WARNINGS + 1)); }
fail() { echo -e "${RED}  ✗${NC} $*"; ERRORS=$((ERRORS + 1)); }

echo ""
echo "DecaDriver — Deploy Preflight Checks"
echo "═══════════════════════════════════════"
echo ""

# ── 1. AWS Auth ──────────────────────────────────────────────────────────────
echo "AWS Authentication:"
if [[ -z "$AWS_ACCOUNT_ID" ]]; then
  fail "Not authenticated to AWS"
  echo -e "\n${RED}Cannot continue without AWS auth.${NC}"
  exit 1
fi
pass "Account: $AWS_ACCOUNT_ID | Region: $AWS_REGION"

# ── 2. SSM Parameters ───────────────────────────────────────────────────────
echo ""
echo "SSM Parameters:"
for param in "/decadriver/prod/alb_dns_name" "/decadriver/prod/db_password" "/decadriver/prod/secret_key"; do
  if aws ssm get-parameter --name "$param" --region "$AWS_REGION" >/dev/null 2>&1; then
    pass "$param"
  else
    fail "$param — MISSING (run 'deploy.sh infra' first)"
  fi
done

# ── 3. ECR Images ───────────────────────────────────────────────────────────
echo ""
echo "ECR Images:"
for repo in "decadriver-api" "decadriver-web" "decadriver-fashn" "decadriver-catvton"; do
  tag=$(aws ecr describe-images --repository-name "$repo" --image-ids imageTag=latest --region "$AWS_REGION" --query 'imageDetails[0].imagePushedAt' --output text 2>/dev/null || echo "")
  if [[ -n "$tag" && "$tag" != "None" ]]; then
    pass "$repo:latest (pushed: $tag)"
  else
    fail "$repo:latest — NOT FOUND (run 'deploy.sh ai' or push via CI)"
  fi
done

# ── 4. S3 Model Artifacts ───────────────────────────────────────────────────
echo ""
echo "S3 Model Artifacts:"

check_s3() {
  local key="$1"
  local name="$2"
  if aws s3api head-object --bucket "$AI_BUCKET" --key "$key" --region "$AWS_REGION" >/dev/null 2>&1; then
    pass "$name → s3://$AI_BUCKET/$key"
  else
    fail "$name → s3://$AI_BUCKET/$key — MISSING"
    echo -e "       Upload: ${YELLOW}aws s3 cp <local-file> s3://$AI_BUCKET/$key${NC}"
  fi
}

check_s3 "models/fashn/weights.tar.gz" "FASHN weights"
check_s3 "models/qwen/source.tar.gz" "Qwen handler"

# ── 5. SageMaker Endpoints ──────────────────────────────────────────────────
echo ""
echo "SageMaker Endpoints:"
for ep in "decadriver-clip-prod" "decadriver-fashn-prod" "decadriver-qwen-prod" "decadriver-catvton-prod"; do
  status=$(aws sagemaker describe-endpoint --endpoint-name "$ep" --region "$AWS_REGION" --query 'EndpointStatus' --output text 2>/dev/null || echo "NOT_FOUND")
  case "$status" in
    InService) pass "$ep → InService" ;;
    Creating)  warn "$ep → Creating (still spinning up)" ;;
    Updating)  warn "$ep → Updating" ;;
    Failed)    fail "$ep → FAILED (check CloudWatch logs)" ;;
    NOT_FOUND) warn "$ep → Not created yet (run terraform with create_ai_endpoints=true)" ;;
    *)         warn "$ep → $status" ;;
  esac
done

# ── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════"
if [[ $ERRORS -gt 0 ]]; then
  echo -e "${RED}FAILED: $ERRORS errors, $WARNINGS warnings${NC}"
  echo -e "Fix errors above before deploying."
  exit 1
elif [[ $WARNINGS -gt 0 ]]; then
  echo -e "${YELLOW}PASSED with $WARNINGS warnings${NC}"
  echo -e "Deploy may work but some services will be degraded."
  exit 0
else
  echo -e "${GREEN}ALL CHECKS PASSED${NC}"
  echo -e "Safe to deploy."
  exit 0
fi
