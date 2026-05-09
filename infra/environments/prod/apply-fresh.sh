#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "══════════════════════════════════════════════"
echo "  DecaDriver Fresh Infrastructure Deploy"
echo "══════════════════════════════════════════════"
echo ""

# Phase 1: Init
echo "▶ terraform init"
terraform init -input=false

# Phase 2: Plan
echo ""
echo "▶ terraform plan"
terraform plan -out=tfplan

echo ""
read -p "Apply infrastructure? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 0
fi

# Phase 3: Apply
echo ""
echo "▶ terraform apply"
terraform apply tfplan
echo ""
echo "✓ Infrastructure created!"

# Phase 4: Show outputs
echo ""
echo "══════════════════════════════════════════════"
echo "  Outputs"
echo "══════════════════════════════════════════════"
terraform output

echo ""
echo "══════════════════════════════════════════════"
echo "  Done! Now trigger GitHub Actions:"
echo ""
echo "  gh workflow run deploy-web.yml"
echo "  gh workflow run deploy-api.yml"
echo "══════════════════════════════════════════════"
