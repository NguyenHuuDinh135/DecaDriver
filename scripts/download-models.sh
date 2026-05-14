#!/usr/bin/env bash
set -euo pipefail

# ══════════════════════════════════════════════════════════════════════════════
# DecaDriver — Download & Upload AI Model Weights to S3
# ══════════════════════════════════════════════════════════════════════════════
#
# Downloads FASHN v1.5 weights from Hugging Face and uploads to S3.
# Run once before first deploy, or when models need updating.
#
# Usage:
#   ./scripts/download-models.sh              # Download all models
#   ./scripts/download-models.sh fashn        # FASHN only
#   ./scripts/download-models.sh check        # Check what's missing
#
# ══════════════════════════════════════════════════════════════════════════════

AWS_REGION="${AWS_REGION:-us-west-2}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}"
AI_BUCKET="decadriver-ai-assets-${AWS_ACCOUNT_ID}"
TMP_DIR="/tmp/decadriver-models"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${CYAN}[models]${NC} $*"; }
ok()   { echo -e "${GREEN}  ✓${NC} $*"; }
warn() { echo -e "${YELLOW}  ⚠${NC} $*"; }
fail() { echo -e "${RED}  ✗ $*${NC}" >&2; exit 1; }

check_deps() {
  command -v git >/dev/null || fail "git not found"
  command -v python3 >/dev/null || fail "python3 not found"
  command -v aws >/dev/null || fail "aws CLI not found"
  pip install --quiet huggingface_hub 2>/dev/null || true
}

check_s3() {
  echo ""
  echo "S3 Model Status (s3://$AI_BUCKET/models/):"
  echo "─────────────────────────────────────────────"

  if aws s3api head-object --bucket "$AI_BUCKET" --key "models/fashn/weights.tar.gz" --region "$AWS_REGION" >/dev/null 2>&1; then
    local size
    size=$(aws s3api head-object --bucket "$AI_BUCKET" --key "models/fashn/weights.tar.gz" --region "$AWS_REGION" --query 'ContentLength' --output text 2>/dev/null)
    ok "FASHN weights: $(numfmt --to=iec "$size" 2>/dev/null || echo "$size bytes")"
  else
    warn "FASHN weights: MISSING"
  fi

  if aws s3api head-object --bucket "$AI_BUCKET" --key "models/qwen/source.tar.gz" --region "$AWS_REGION" >/dev/null 2>&1; then
    ok "Qwen handler: present"
  else
    warn "Qwen handler: MISSING"
  fi
  echo ""
}

download_fashn() {
  log "Downloading FASHN v1.5 weights from Hugging Face..."
  mkdir -p "$TMP_DIR/fashn"

  # Download main model
  python3 -c "
from huggingface_hub import hf_hub_download, snapshot_download
import os

weights_dir = '$TMP_DIR/fashn'

# Main model weights
print('Downloading fashn-ai/fashn-vton-1.5...')
hf_hub_download('fashn-ai/fashn-vton-1.5', 'model.safetensors', local_dir=weights_dir)

# DWPose (pose estimation)
print('Downloading fashn-ai/DWPose...')
dwpose_dir = os.path.join(weights_dir, 'dwpose')
os.makedirs(dwpose_dir, exist_ok=True)
hf_hub_download('fashn-ai/DWPose', 'yolox_l.onnx', local_dir=dwpose_dir)
hf_hub_download('fashn-ai/DWPose', 'dw-ll_ucoco_384.onnx', local_dir=dwpose_dir)

print('All weights downloaded.')
"
  ok "Downloaded to $TMP_DIR/fashn"

  # Pack and upload
  log "Packing weights..."
  tar -czf "$TMP_DIR/fashn-weights.tar.gz" -C "$TMP_DIR/fashn" .
  local size
  size=$(stat -c %s "$TMP_DIR/fashn-weights.tar.gz" 2>/dev/null || stat -f %z "$TMP_DIR/fashn-weights.tar.gz")
  ok "Packed: $(numfmt --to=iec "$size" 2>/dev/null || echo "$size bytes")"

  log "Uploading to s3://$AI_BUCKET/models/fashn/weights.tar.gz..."
  aws s3 cp "$TMP_DIR/fashn-weights.tar.gz" "s3://$AI_BUCKET/models/fashn/weights.tar.gz" --region "$AWS_REGION"
  ok "Uploaded to S3"

  # Cleanup
  rm -rf "$TMP_DIR"
  ok "FASHN weights ready"
}

main() {
  local target="${1:-all}"

  case "$target" in
    check)
      check_s3
      ;;
    fashn)
      check_deps
      download_fashn
      ;;
    all)
      check_deps
      download_fashn
      check_s3
      ;;
    *)
      echo "Usage: $0 [all|fashn|check]"
      exit 1
      ;;
  esac
}

main "$@"
