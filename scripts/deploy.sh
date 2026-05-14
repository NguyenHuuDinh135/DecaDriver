#!/usr/bin/env bash
set -euo pipefail

# ══════════════════════════════════════════════════════════════════════════════
# DecaDriver — Full Stack Deploy Script
# ══════════════════════════════════════════════════════════════════════════════
#
# Usage:
#   ./scripts/deploy.sh              # Deploy everything (infra → AI → API → Web)
#   ./scripts/deploy.sh infra        # Terraform only
#   ./scripts/deploy.sh ai           # SageMaker handler images only
#   ./scripts/deploy.sh api          # API container only
#   ./scripts/deploy.sh web          # Web container only
#   ./scripts/deploy.sh app          # API + Web (no infra/AI)
#
# Prerequisites:
#   - aws cli configured (aws sts get-caller-identity succeeds)
#   - terraform, docker, bun, uv installed
#   - Run from repo root: cd ~/DecaDriver && ./scripts/deploy.sh
#
# Environment variables (override defaults):
#   AWS_REGION          (default: us-west-2)
#   AWS_ACCOUNT_ID      (auto-detected)
#   ECS_CLUSTER         (default: decadriver)
#   TF_VAR_FILE         (default: none)
#
# ══════════════════════════════════════════════════════════════════════════════

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# ── Config ────────────────────────────────────────────────────────────────────

AWS_REGION="${AWS_REGION:-us-west-2}"
ECS_CLUSTER="${ECS_CLUSTER:-decadriver}"
INFRA_DIR="infra/environments/prod"
HANDLERS_DIR="apps/api/app/services/sagemaker_handlers"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── Helpers ───────────────────────────────────────────────────────────────────

log()   { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $*"; }
ok()    { echo -e "${GREEN}  ✓${NC} $*"; }
warn()  { echo -e "${YELLOW}  ⚠${NC} $*"; }
fail()  { echo -e "${RED}  ✗ $*${NC}" >&2; exit 1; }
hr()    { echo -e "${CYAN}──────────────────────────────────────────────────────────────${NC}"; }

elapsed() {
  local start=$1
  local end
  end=$(date +%s)
  echo "$(( end - start ))s"
}

# ── Preflight Checks ─────────────────────────────────────────────────────────

preflight() {
  log "Preflight checks..."

  command -v aws >/dev/null       || fail "aws CLI not found"
  command -v docker >/dev/null    || fail "docker not found"
  command -v terraform >/dev/null || fail "terraform not found"

  aws sts get-caller-identity >/dev/null 2>&1 || fail "AWS credentials not configured. Run: aws configure"

  AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
  ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

  ok "AWS Account: $AWS_ACCOUNT_ID | Region: $AWS_REGION"
  ok "ECR Registry: $ECR_REGISTRY"

  if ! docker info >/dev/null 2>&1; then
    fail "Docker daemon not running"
  fi
  ok "Docker running"
}

# ── Step 1: Infrastructure (Terraform) ────────────────────────────────────────
# Phase 1 (deploy_infra_base): create ECR, VPC, RDS, ECS — NO SageMaker endpoints
# Phase 2 (deploy_infra_ai):   create SageMaker endpoints (requires images on ECR)

_terraform_apply() {
  local extra_args=("$@")
  cd "$REPO_ROOT/$INFRA_DIR"

  terraform init -upgrade -input=false >/dev/null 2>&1

  log "Planning..."
  local plan_args=(-input=false -out=tfplan "${extra_args[@]}")
  if [[ -n "${TF_VAR_FILE:-}" ]]; then
    plan_args+=(-var-file="$TF_VAR_FILE")
  fi
  terraform plan "${plan_args[@]}"

  local changes
  changes=$(terraform show -json tfplan | python3 -c "
import json, sys
plan = json.load(sys.stdin)
changes = plan.get('resource_changes', [])
adds = sum(1 for c in changes if 'create' in c.get('change', {}).get('actions', []))
updates = sum(1 for c in changes if 'update' in c.get('change', {}).get('actions', []))
deletes = sum(1 for c in changes if 'delete' in c.get('change', {}).get('actions', []))
print(f'{adds} to add, {updates} to change, {deletes} to destroy')
" 2>/dev/null || echo "unknown")

  log "Changes: $changes"

  if [[ "$changes" == "0 to add, 0 to change, 0 to destroy" ]]; then
    ok "No infrastructure changes"
  else
    terraform apply -auto-approve tfplan
    ok "Infrastructure applied"
  fi

  rm -f tfplan
  cd "$REPO_ROOT"
}

deploy_infra_base() {
  hr
  log "STEP 1/5: Base Infrastructure (VPC, RDS, ECR, ECS)"
  local start
  start=$(date +%s)
  _terraform_apply
  ok "Base infra done ($(elapsed "$start"))"
}

deploy_infra_ai_endpoints() {
  hr
  log "STEP 3/5: SageMaker Endpoints (requires images on ECR)"
  local start
  start=$(date +%s)
  _terraform_apply -var create_ai_endpoints=true
  ok "SageMaker endpoints done ($(elapsed "$start"))"
}

deploy_infra() {
  hr
  log "STEP 1: Full Infrastructure (Terraform)"
  local start
  start=$(date +%s)
  _terraform_apply -var create_ai_endpoints=true
  ok "Infra done ($(elapsed "$start"))"
}

# ── Step 2: AI Handlers (SageMaker) ──────────────────────────────────────────

deploy_ai() {
  hr
  log "STEP 2/4: AI Handlers (SageMaker images)"
  local start
  start=$(date +%s)

  aws ecr get-login-password --region "$AWS_REGION" \
    | docker login --username AWS --password-stdin "$ECR_REGISTRY"

  # Also login to SageMaker DLC registry for base images
  aws ecr get-login-password --region "$AWS_REGION" \
    | docker login --username AWS --password-stdin "763104351884.dkr.ecr.${AWS_REGION}.amazonaws.com"

  ok "ECR login OK"

  # FASHN
  log "Building FASHN handler..."
  local fashn_url="${ECR_REGISTRY}/decadriver-fashn:latest"
  docker build -f "$HANDLERS_DIR/Dockerfile.fashn" -t "$fashn_url" "$HANDLERS_DIR"
  docker push "$fashn_url"
  ok "FASHN pushed"

  # CatV2TON
  log "Building CatV2TON handler..."
  local catvton_url="${ECR_REGISTRY}/decadriver-catvton:latest"
  docker build -f "$HANDLERS_DIR/Dockerfile.catvton" -t "$catvton_url" "$HANDLERS_DIR"
  docker push "$catvton_url"
  ok "CatV2TON pushed"

  # Qwen (tarball → S3)
  log "Uploading Qwen handler to S3..."
  local ai_bucket="decadriver-ai-assets-${AWS_ACCOUNT_ID}"
  tar -czf /tmp/qwen.tar.gz -C "$HANDLERS_DIR" inference_qwen.py
  aws s3 cp /tmp/qwen.tar.gz "s3://${ai_bucket}/models/qwen/source.tar.gz"
  rm -f /tmp/qwen.tar.gz
  ok "Qwen uploaded"

  # CLIP uses HuggingFace DLC — no custom build needed
  ok "CLIP uses HF DLC (no build needed)"

  ok "AI handlers done ($(elapsed "$start"))"
}

# ── Step 3: API Deploy ────────────────────────────────────────────────────────

deploy_api() {
  hr
  log "STEP 3/4: API (FastAPI → ECS)"
  local start
  start=$(date +%s)

  aws ecr get-login-password --region "$AWS_REGION" \
    | docker login --username AWS --password-stdin "$ECR_REGISTRY" 2>/dev/null

  local api_url="${ECR_REGISTRY}/decadriver-api"
  local sha
  sha=$(git rev-parse --short HEAD)

  log "Building API image..."
  docker build -t "$api_url:$sha" -t "$api_url:latest" apps/api/
  docker push "$api_url:$sha"
  docker push "$api_url:latest"
  ok "API image pushed ($sha)"

  log "Deploying to ECS..."
  aws ecs update-service \
    --cluster "$ECS_CLUSTER" \
    --service decadriver-api \
    --force-new-deployment \
    --region "$AWS_REGION" \
    --output text --query 'service.serviceName' >/dev/null

  log "Waiting for service stability..."
  aws ecs wait services-stable \
    --cluster "$ECS_CLUSTER" \
    --services decadriver-api \
    --region "$AWS_REGION"

  ok "API deployed ($(elapsed "$start"))"
}

# ── Step 4: Web Deploy ────────────────────────────────────────────────────────

deploy_web() {
  hr
  log "STEP 4/4: Web (Next.js → ECS)"
  local start
  start=$(date +%s)

  aws ecr get-login-password --region "$AWS_REGION" \
    | docker login --username AWS --password-stdin "$ECR_REGISTRY" 2>/dev/null

  # Get API URL from SSM (must exist — run infra first)
  local alb_dns
  alb_dns=$(aws ssm get-parameter \
    --name /decadriver/prod/alb_dns_name \
    --region "$AWS_REGION" \
    --query Parameter.Value \
    --output text 2>/dev/null || echo "")
  if [[ -z "$alb_dns" ]]; then
    fail "SSM /decadriver/prod/alb_dns_name not found. Run './scripts/deploy.sh infra' first."
  fi
  local api_url="http://${alb_dns}/api/v1"
  log "NEXT_PUBLIC_API_URL=$api_url"

  local web_ecr="${ECR_REGISTRY}/decadriver-web"
  local sha
  sha=$(git rev-parse --short HEAD)

  log "Building Web image..."
  docker build \
    --build-arg "NEXT_PUBLIC_API_URL=$api_url" \
    -t "$web_ecr:$sha" \
    -t "$web_ecr:latest" \
    -f apps/web/Dockerfile .
  docker push "$web_ecr:$sha"
  docker push "$web_ecr:latest"
  ok "Web image pushed ($sha)"

  log "Deploying to ECS..."
  aws ecs update-service \
    --cluster "$ECS_CLUSTER" \
    --service decadriver-web \
    --force-new-deployment \
    --region "$AWS_REGION" \
    --output text --query 'service.serviceName' >/dev/null

  log "Waiting for service stability..."
  aws ecs wait services-stable \
    --cluster "$ECS_CLUSTER" \
    --services decadriver-web \
    --region "$AWS_REGION"

  ok "Web deployed ($(elapsed "$start"))"
}

# ── Step 5: Post-deploy Verification ─────────────────────────────────────────

verify() {
  hr
  log "Post-deploy verification"

  local alb_dns
  alb_dns=$(aws ssm get-parameter \
    --name /decadriver/prod/alb_dns_name \
    --region "$AWS_REGION" \
    --query Parameter.Value \
    --output text 2>/dev/null || echo "")

  if [[ -n "$alb_dns" ]]; then
    log "Health check: http://${alb_dns}/api/v1/health"
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" "http://${alb_dns}/api/v1/health" 2>/dev/null || echo "000")
    if [[ "$status" == "200" ]]; then
      ok "API healthy (200)"
    else
      warn "API returned $status (may still be starting)"
    fi
  fi

  # List SageMaker endpoints
  log "SageMaker endpoints:"
  aws sagemaker list-endpoints \
    --name-contains decadriver \
    --region "$AWS_REGION" \
    --query 'Endpoints[].{Name:EndpointName,Status:EndpointStatus}' \
    --output table 2>/dev/null || warn "Could not list endpoints"

  # ECS services status
  log "ECS services:"
  aws ecs describe-services \
    --cluster "$ECS_CLUSTER" \
    --services decadriver-api decadriver-web \
    --region "$AWS_REGION" \
    --query 'services[].{Name:serviceName,Running:runningCount,Desired:desiredCount,Status:status}' \
    --output table 2>/dev/null || warn "Could not describe services"
}

# ── Step: Run DB Migrations ───────────────────────────────────────────────────

run_migrations() {
  log "Running database migrations via ECS exec..."

  local task_arn
  task_arn=$(aws ecs list-tasks \
    --cluster "$ECS_CLUSTER" \
    --service-name decadriver-api \
    --region "$AWS_REGION" \
    --query 'taskArns[0]' \
    --output text 2>/dev/null || echo "")

  if [[ -z "$task_arn" || "$task_arn" == "None" ]]; then
    warn "No running API task found — skipping migrations"
    return
  fi

  log "Task: $task_arn"
  aws ecs execute-command \
    --cluster "$ECS_CLUSTER" \
    --task "$task_arn" \
    --container api \
    --interactive \
    --command "alembic upgrade head" \
    --region "$AWS_REGION" 2>/dev/null && ok "Migrations applied" || warn "ECS exec failed (enable-execute-command may not be set)"
}

# ── Main ──────────────────────────────────────────────────────────────────────

main() {
  local total_start
  total_start=$(date +%s)
  local target="${1:-all}"

  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║          DecaDriver — Production Deploy                     ║${NC}"
  echo -e "${CYAN}║          Target: ${GREEN}${target}${CYAN}                                        ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
  echo ""

  preflight

  case "$target" in
    all)
      deploy_infra_base
      deploy_ai
      deploy_infra_ai_endpoints
      deploy_api
      run_migrations
      deploy_web
      verify
      ;;
    infra)
      deploy_infra
      ;;
    ai)
      deploy_ai
      ;;
    api)
      deploy_api
      run_migrations
      ;;
    web)
      deploy_web
      ;;
    app)
      deploy_api
      run_migrations
      deploy_web
      ;;
    verify)
      verify
      ;;
    preflight)
      log "Running preflight checks..."
      "$REPO_ROOT/scripts/preflight.sh"
      ;;
    *)
      fail "Unknown target: $target. Use: all|infra|ai|api|web|app|preflight|verify"
      ;;
  esac

  hr
  echo ""
  ok "Deploy complete! Total time: $(elapsed "$total_start")"
  echo ""
}

main "$@"
