# ECC Workflow Guide — DecaDriver AI Try-On Platform

> Hướng dẫn dùng Everything Claude Code để build & maintain hệ thống AI Virtual Try-On

---

## Project Overview

**Goal:** Build AI-powered virtual try-on fashion platform — users create avatars, browse garments, generate try-on images

**Core Modules:**
- **Avatar** — DreamBooth LoRA training per user
- **Try-On** — FASHN v1.5 inference (576×864)
- **Stylist** — Qwen2.5-VL-7B body/style analysis
- **Recommendations** — CLIP embeddings + pgvector similarity

**Tech Stack:**

| Layer | Stack |
|-------|-------|
| Web | Next.js 15 (App Router, React 19, Tailwind v4) |
| Mobile | Expo 55, React Native, NativeWind |
| Backend | FastAPI, SQLModel, Alembic |
| AI | SageMaker (CLIP real-time, FASHN async, Qwen async) |
| Infra | AWS (ECS Fargate, RDS+pgvector, S3, CloudFront), Terraform |
| CI/CD | GitHub Actions |

---

## Development Workflows

---

### Workflow A: New Feature (Full Pipeline)

**Example:** Add garment category filtering

```
/plan Add garment filtering by category, brand, and price range.
Requirements:
- Backend: new query params on GET /api/v1/garments (category, brand, min_price, max_price)
- Frontend: filter panel in wardrobe page
- Mobile: bottom sheet filter on wardrobe tab
- Use existing SQLModel Garment model
```

**ECC flow:**
```
/plan → confirm → /tdd → implement → /verify → /code-review → /prp-commit → /prp-pr
```

---

### Workflow B: AI Feature Development

**Example:** Add video try-on (CatV2TON)

```
/feature-dev Add video try-on using CatV2TON model:
Requirements:
- New SageMaker async endpoint for CatV2TON
- Route: POST /api/v1/tryon/video — accepts user avatar + garment
- Poll job status same pattern as image try-on
- Frontend: video player component for results
- Terraform: new endpoint resource (conditional, like FASHN)

Test cases:
  Submit video try-on job → returns job_id with status "pending"
  Poll completed job → returns S3 video URL
  Invalid garment_id → returns 404
```

**ECC flow:**
```
/feature-dev → (Discovery: reads existing tryon route) → (Architecture: mirrors FASHN pattern) → (TDD) → (Review)
```

---

### Workflow C: Infrastructure Changes

**Example:** Add new SageMaker endpoint

```
/plan Add CatV2TON SageMaker endpoint to Terraform:
- Mirror fashn pattern (conditional with create_ai_endpoints)
- Async endpoint, ml.g5.2xlarge
- S3 output path: results/catvton/
- Update deploy.sh Phase 2 to build and push CatV2TON image
- Update ECS task definition environment vars
```

**After plan confirmed:**
```bash
cd infra/environments/prod
terraform init
terraform plan
terraform apply
```

---

### Workflow D: Bug Fix

**Example:** Try-on result URL returns 403

```
/tdd Fix try-on result S3 URL returning 403:
Reproduce:
  - Create try-on job → completes → result_url is pre-signed but expired
Expected:
  - Generate fresh pre-signed URL on each GET /api/v1/tryon/{job_id}
  - URL valid for 1 hour
Test:
  - GET completed job → result_url starts with https:// and has X-Amz-Signature
  - URL is different on each request (fresh pre-sign)
```

**ECC flow:**
```
/tdd (reproduce) → fix → /verify → /prp-commit
```

---

### Workflow E: Frontend UI

**Example:** Redesign try-on page

```
/gan-design "Try-on page with split view — person on left, garment selector on right, result appears with reveal animation. Dark luxury aesthetic with violet accents."
```

**Or multi-model approach:**
```
/multi-frontend Redesign try-on page:
- Split view layout (person | garment selector)
- Drag-and-drop garment onto avatar
- Loading skeleton with shimmer during inference
- Before/after slider for result comparison
- Mobile: swipe between person and result
```

---

### Workflow F: API Endpoint

**Example:** Add stylist profile history

```
/tdd Add style analysis history endpoint:
Route: GET /api/v1/stylist/history
Auth: requires CurrentUser
Returns: list of past StyleProfile records ordered by created_at desc
Pagination: limit/offset query params

Test cases:
  User with 3 analyses → returns 3 records, newest first
  User with no analyses → returns empty list
  Unauthenticated → returns 401
  limit=1 → returns exactly 1 record
```

---

## ECC Commands by Phase

### Planning Phase

| Action | Command |
|--------|---------|
| Plan a feature | `/plan <requirements>` |
| Deep plan with codebase analysis | `/prp-plan <feature>` |
| Quick question about codebase | `/aside <question>` |
| Look up library docs | `/docs how does SageMaker async inference work` |
| Multi-model planning | `/multi-plan <feature>` |

### Build Phase

| Action | Command |
|--------|---------|
| TDD (tests first) | `/tdd <description + test cases>` |
| Full feature dev (7 phases) | `/feature-dev <description>` |
| Fix build/runtime errors | `/build-fix` |
| Multi-model backend work | `/multi-backend <task>` |
| Multi-model frontend work | `/multi-frontend <task>` |
| Iterative UI build | `/gan-design "brief"` |
| Fleet of parallel agents | `/devfleet <task>` |

### Quality Phase

| Action | Command |
|--------|---------|
| Code review | `/code-review` |
| Full verification | `/verify` |
| Adversarial dual review | `/santa-loop` |
| PR review | `/review-pr <number>` |
| Test coverage check | `/test-coverage` |
| Remove dead code | `/refactor-clean` |

### Ship Phase

| Action | Command |
|--------|---------|
| Smart commit | `/prp-commit "message"` |
| Create PR | `/prp-pr` |
| Save progress | `/save-session` |
| Resume next time | `/resume-session` |

---

## Architecture-Specific Patterns

### Backend (FastAPI) Pattern

When adding a new route:
1. Add model to `app/models.py` (SQLModel with `table=True`)
2. Add route file in `app/api/routes/`
3. Register router in `app/api/main.py`
4. Use `SessionDep` and `CurrentUser` from `app/api/deps.py`
5. Run migrations if DB schema changed

```
/tdd Add <route> endpoint following existing pattern in app/api/routes/tryon.py:
- Use SessionDep for database
- Use CurrentUser for auth
- Return SQLModel response schema
- Handle errors with HTTPException
```

### SageMaker Integration Pattern

When adding a new AI model:
1. Handler in `app/services/sagemaker_handlers/`
2. Client method in `app/services/sagemaker_client.py`
3. Terraform resource in `infra/environments/prod/sagemaker.tf`
4. Environment var in ECS task definition

```
/feature-dev Add <model> SageMaker integration:
- Handler: app/services/sagemaker_handlers/inference_<model>.py
- Client: add invoke method to sagemaker_client.py
- Pattern: async endpoint with S3 output polling (mirror FASHN)
- Terraform: conditional resource (create_ai_endpoints flag)
```

### Frontend (Next.js) Pattern

When adding a new page:
1. Route file in `apps/web/app/(app)/<route>/page.tsx`
2. Components in same directory or `components/`
3. Use server components by default, client only for interactivity
4. Import UI from `@workspace/ui/components/<name>`

```
/multi-frontend Add <page> following App Router conventions:
- Route group: (app) with bottom nav
- Use existing UI components from @workspace/ui
- Responsive: mobile-first with Tailwind breakpoints
- Dark theme with violet accent colors
```

---

## Common Tasks & Commands

| I want to... | Command |
|--------------|---------|
| Plan a feature | `/plan` |
| Build with tests first | `/tdd` |
| Full feature pipeline | `/feature-dev` |
| Fix build errors | `/build-fix` |
| Review my code | `/code-review` |
| Verify before commit | `/verify` |
| Smart commit | `/prp-commit` |
| Create PR | `/prp-pr` |
| Design-quality UI | `/gan-design "brief"` |
| Multi-model build | `/multi-execute` |
| Adversarial review | `/santa-loop` |
| Remove dead code | `/refactor-clean` |
| Save progress | `/save-session` |
| Resume tomorrow | `/resume-session` |
| Quick question | `/aside <q>` |
| Look up docs | `/docs <query>` |
| Deploy infra | `bash infra/deploy.sh` |

---

## Infrastructure Commands

```bash
# Full deploy (both phases)
bash infra/deploy.sh

# Manual terraform
cd infra/environments/prod
terraform init
terraform plan
terraform apply

# Deploy only AI endpoints (phase 2)
terraform apply -var="create_ai_endpoints=true"
```

---

## CI/CD Triggers

| Change | Workflow | Action |
|--------|---------|--------|
| Any PR to main | `ci.yml` | Lint + typecheck + build |
| `apps/web/**` pushed to main | `deploy-web.yml` | S3 + CloudFront |
| `apps/api/**` pushed to main | `deploy-api.yml` | ECR + ECS Fargate |
| `sagemaker_handlers/**` pushed | `deploy-ai.yml` | FASHN image + Qwen to S3 |

---

## Dev Environment Quick Start

```bash
# Install deps
bun install

# Start everything
bun run dev

# Or individually:
cd apps/web && bun run dev          # Web
cd apps/mobile && bun run dev       # Mobile
cd apps/api && docker compose watch # Backend + DB

# Python backend without Docker
cd apps/api && uv sync && uv run uvicorn app.main:app --reload
```

---

## Session Management

| When | Command | Why |
|------|---------|-----|
| Starting work | `/resume-session` | Pick up where you left off |
| Completed a milestone | `/checkpoint create "feature done"` | Mark progress |
| End of session | `/save-session` | Persist state for next time |
| Before deploy | `/verify` | Final quality gate |

---

## Agents Auto-Dispatch (no manual action needed)

| Trigger | Agent |
|---------|-------|
| Python code written | `python-reviewer` |
| TypeScript code written | `typescript-reviewer` |
| Build fails | `build-error-resolver` |
| Auth/payment code touched | `security-reviewer` |
| Complex feature request | `planner` |
| Bug fix | `tdd-guide` |
| Architecture question | `architect` |
| Database schema change | `database-reviewer` |
