#!/usr/bin/env bash
set -euo pipefail

# ══════════════════════════════════════════════════════════════════════════════
# DecaDriver — Local Development Startup
# ══════════════════════════════════════════════════════════════════════════════
#
# Usage:
#   ./scripts/dev.sh              # Start all (API + Web + DB) with AWS
#   ./scripts/dev.sh mock         # Start all in mock mode (no AWS needed)
#   ./scripts/dev.sh api          # API only (uses apps/.env)
#   ./scripts/dev.sh web          # Web only
#   ./scripts/dev.sh db           # Start PostgreSQL Docker only
#
# Configuration:
#   - Real AWS mode: reads from apps/.env (DB + SageMaker + S3)
#   - Mock mode: no .env needed, demo returns fake results after 3s
#
# ══════════════════════════════════════════════════════════════════════════════

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[dev]${NC} $*"; }
ok()   { echo -e "${GREEN}  ✓${NC} $*"; }
warn() { echo -e "${YELLOW}  ⚠${NC} $*"; }

cleanup() {
  log "Shutting down..."
  kill $API_PID 2>/dev/null || true
  kill $WEB_PID 2>/dev/null || true
  wait 2>/dev/null
}
trap cleanup EXIT INT TERM

API_PID=""
WEB_PID=""
MOCK_MODE=false

# ── Database ──────────────────────────────────────────────────────────────────

ensure_db() {
  local container_name="decadriver-postgres"

  if docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
    ok "PostgreSQL already running ($container_name)"
    return
  fi

  if docker ps -a --format '{{.Names}}' | grep -q "^${container_name}$"; then
    log "Starting existing PostgreSQL container..."
    docker start "$container_name" >/dev/null
  else
    log "Creating PostgreSQL container (pgvector/pgvector:pg16)..."
    docker run -d \
      --name "$container_name" \
      -e POSTGRES_USER=postgres \
      -e POSTGRES_PASSWORD=postgres \
      -e POSTGRES_DB=app \
      -p 5432:5432 \
      pgvector/pgvector:pg16 >/dev/null
  fi

  log "Waiting for PostgreSQL..."
  for i in {1..15}; do
    if docker exec "$container_name" pg_isready -U postgres >/dev/null 2>&1; then
      ok "PostgreSQL ready on :5432"
      # Ensure pgvector extension
      docker exec "$container_name" psql -U postgres -d app -c "CREATE EXTENSION IF NOT EXISTS vector;" >/dev/null 2>&1 || true
      return
    fi
    sleep 1
  done
  warn "PostgreSQL not ready after 15s"
}

run_migrations() {
  log "Running database migrations..."
  cd "$REPO_ROOT/apps/api"
  if uv run alembic upgrade head 2>&1 | tail -3; then
    ok "Migrations complete"
  else
    warn "Migration failed (may already be up to date)"
  fi
  cd "$REPO_ROOT"
}

# ── API ───────────────────────────────────────────────────────────────────────

start_api() {
  log "Starting API (FastAPI) on :8000..."
  cd "$REPO_ROOT/apps/api"

  if [[ "$MOCK_MODE" == true ]]; then
    export PROJECT_NAME="DecaDriver"
    export ENVIRONMENT="local"
    export POSTGRES_SERVER="localhost"
    export POSTGRES_PORT="5432"
    export POSTGRES_USER="postgres"
    export POSTGRES_PASSWORD="postgres"
    export POSTGRES_DB="app"
    export FIRST_SUPERUSER="admin@decadriver.com"
    export FIRST_SUPERUSER_PASSWORD="changethis"
    export BACKEND_CORS_ORIGINS="http://localhost:3000"
    export AI_S3_BUCKET=""
    log "Mode: MOCK (demo returns fake results)"
  else
    if [[ ! -f "$REPO_ROOT/apps/.env" ]]; then
      echo -e "${RED}  ✗ apps/.env not found!${NC}" >&2
      echo "  Create it with DB + AWS config, or use: ./scripts/dev.sh mock" >&2
      exit 1
    fi
    log "Mode: AWS (using apps/.env)"
  fi

  uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
  API_PID=$!

  cd "$REPO_ROOT"
  ok "API started (PID $API_PID)"
}

# ── Web ───────────────────────────────────────────────────────────────────────

start_web() {
  log "Starting Web (Next.js) on :3000..."
  cd "$REPO_ROOT/apps/web"
  bun run dev &
  WEB_PID=$!
  cd "$REPO_ROOT"
  ok "Web started (PID $WEB_PID)"
}

# ── Wait & Report ────────────────────────────────────────────────────────────

wait_for_services() {
  log "Waiting for services..."

  if [[ -n "$API_PID" ]]; then
    for i in {1..20}; do
      if curl -s -o /dev/null http://localhost:8000/api/v1/health/ 2>/dev/null; then
        ok "API ready at http://localhost:8000"
        break
      fi
      sleep 1
    done
  fi

  if [[ -n "$WEB_PID" ]]; then
    for i in {1..30}; do
      if curl -s -o /dev/null http://localhost:3000 2>/dev/null; then
        ok "Web ready at http://localhost:3000"
        break
      fi
      sleep 1
    done
  fi

  echo ""
  echo -e "${GREEN}══════════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  DecaDriver running!${NC}"
  [[ -n "$WEB_PID" ]] && echo -e "  ${CYAN}Web:${NC}      http://localhost:3000"
  [[ -n "$API_PID" ]] && echo -e "  ${CYAN}API:${NC}      http://localhost:8000"
  [[ -n "$API_PID" ]] && echo -e "  ${CYAN}Swagger:${NC}  http://localhost:8000/docs"
  if [[ "$MOCK_MODE" == true ]]; then
    echo -e "  ${CYAN}Mode:${NC}     ${YELLOW}mock${NC} (demo returns fake images)"
  else
    echo -e "  ${CYAN}Mode:${NC}     ${GREEN}AWS${NC} (real SageMaker + S3)"
  fi
  echo -e "${GREEN}══════════════════════════════════════════════════════════════${NC}"
  echo ""
  echo "  Press Ctrl+C to stop"
  echo ""
}

# ── Main ──────────────────────────────────────────────────────────────────────

main() {
  local target="${1:-all}"

  # Kill existing processes on our ports
  lsof -ti:8000 2>/dev/null | xargs kill 2>/dev/null || true
  lsof -ti:3000 2>/dev/null | xargs kill 2>/dev/null || true
  sleep 1

  case "$target" in
    all)
      ensure_db
      run_migrations
      start_api
      start_web
      ;;
    mock)
      MOCK_MODE=true
      ensure_db
      run_migrations
      start_api
      start_web
      ;;
    api)
      start_api
      ;;
    web)
      start_web
      ;;
    db)
      ensure_db
      run_migrations
      log "Database ready. Ctrl+C to exit."
      sleep infinity
      ;;
    *)
      echo "Usage: $0 [all|mock|api|web|db]"
      echo ""
      echo "  all   — API + Web with AWS (requires apps/.env)"
      echo "  mock  — API + Web with mock AI (no AWS needed)"
      echo "  api   — API only"
      echo "  web   — Web only"
      echo "  db    — PostgreSQL Docker only"
      exit 1
      ;;
  esac

  wait_for_services
  wait
}

main "$@"
