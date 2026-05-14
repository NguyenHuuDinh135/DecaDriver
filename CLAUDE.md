# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DecaDriver is a virtual try-on fashion platform. Users create AI avatars (DreamBooth LoRA), browse garments, and generate try-on images via FASHN v1.5 inference. The system includes AI styling (Qwen2.5-VL-7B), CLIP-based recommendations, and video try-on (CatV2TON).

## Monorepo Structure

- **apps/web** — Next.js 15 (App Router, Turbopack, React 19, Tailwind CSS v4)
- **apps/mobile** — Expo 55 / React Native 0.83 (NativeWind, expo-router)
- **apps/api** — Python FastAPI (SQLModel, Alembic, SageMaker integration)
- **packages/ui** — Shared shadcn/ui components (imported as `@workspace/ui`)
- **packages/eslint-config** — Shared ESLint config
- **packages/typescript-config** — Shared tsconfig
- **infra/** — Terraform (AWS: ECS Fargate, RDS PostgreSQL+pgvector, SageMaker, S3+CloudFront)

## Commands

### Root (Bun + Turborepo)

```bash
bun install              # Install all workspace deps
bun run dev              # Start all apps in dev mode
bun run build            # Build all
bun run lint             # Lint all workspaces
bun run typecheck        # TypeScript check all workspaces
bun run format           # Prettier format all
```

### Backend — apps/api (Python, managed with `uv`)

```bash
cd apps/api
uv sync                  # Install Python deps
bash ./scripts/test.sh   # Run tests with coverage report

# Single test
uv run pytest tests/path_to_test.py -v

# Linting
uv run ruff check .
uv run ruff format .
uv run mypy .

# Migrations
docker compose exec backend alembic revision --autogenerate -m "description"
docker compose exec backend alembic upgrade head
```

### Web — apps/web

```bash
cd apps/web
bun run dev              # Next.js dev with Turbopack
bun run build            # Production build (standalone output)
bun run typecheck        # Type check

# Testing
bun run test             # Vitest unit tests (single run)
bun run test:watch       # Vitest in watch mode
bun run test:e2e         # Playwright E2E (starts dev server automatically)
```

### Mobile — apps/mobile

```bash
cd apps/mobile
bun run dev              # Expo start (clears cache)
bun run android          # Start on Android
bun run ios              # Start on iOS
```

### Adding shadcn/ui components

```bash
pnpm dlx shadcn@latest add <component> -c apps/web
```

Components land in `packages/ui/src/components/` and are imported as `@workspace/ui/components/<name>`.

## Architecture

### Backend (apps/api)

```
app/
├── main.py              # FastAPI app, CORS, Sentry
├── models.py            # All SQLModel models (User, Garment, TryOnJob, VideoTryOnJob, StyleProfile, AvatarJob)
├── crud.py              # Generic CRUD operations
├── api/
│   ├── main.py          # Router registration (all routes under /api/v1)
│   ├── deps.py          # DI: SessionDep, CurrentUser (JWT-based)
│   └── routes/          # Route modules (14 total)
│       ├── tryon.py         # POST/GET/DELETE image try-on jobs (FASHN)
│       ├── video_tryon.py   # POST/GET/DELETE video try-on jobs (CatV2TON)
│       ├── avatar.py        # DreamBooth LoRA avatar training
│       ├── stylist.py       # Qwen2.5-VL style analysis
│       ├── recommend.py     # CLIP-based garment recommendations
│       ├── garments.py      # Garment CRUD + image upload
│       ├── demo.py          # Free try-on (mock mode or real SageMaker)
│       ├── login.py         # JWT auth (login/refresh/password-reset)
│       ├── users.py         # User CRUD + registration
│       ├── health.py        # /health endpoint
│       ├── items.py         # Legacy items CRUD
│       ├── utils.py         # Email test utility
│       └── private.py       # Dev-only routes (ENVIRONMENT=local)
├── core/
│   ├── config.py        # Pydantic Settings (env-driven)
│   ├── db.py            # SQLModel engine
│   └── security.py      # JWT + password hashing (argon2/bcrypt via pwdlib)
└── services/
    ├── sagemaker_client.py          # Singleton: async/realtime endpoints, training jobs, S3 upload
    └── sagemaker_handlers/          # Deployed to SageMaker as inference code
        ├── inference_fashn.py       # FASHN v1.5 try-on
        ├── inference_clip.py        # CLIP embeddings for garment similarity
        ├── inference_qwen.py        # Qwen2.5-VL style analysis
        └── inference_catvton.py     # CatV2TON video try-on
```

Key patterns:
- Routes use `SessionDep` and `CurrentUser` type aliases from `deps.py`
- AI inference is async via SageMaker: submit job → poll for result
- Models use SQLModel (SQLAlchemy + Pydantic unified): table models have `table=True`, response schemas are plain SQLModel classes
- `private` routes only load when `ENVIRONMENT=local`

### Web (apps/web)

Uses Next.js App Router with route groups:
- `(auth)/` — Login, register, onboarding (fullscreen, no nav)
- `(app)/` — Main app with bottom nav: feed, try-on, create, wardrobe, profile
  - `try-on/` — Garment selection + image generation
  - `try-on/result/` — Image result + "Generate Video" button
  - `try-on/video/` — Video result page (CatV2TON MP4)

Data flow:
- **State**: Zustand for auth (persisted to localStorage), TanStack Query for server state
- **API client**: `lib/api/client.ts` — thin fetch wrapper with auto-auth headers and 401 logout
- **Hooks**: `lib/hooks/use-*.ts` — TanStack Query hooks per domain (tryon, video-tryon, wardrobe, avatar, stylist)
- **Auth middleware**: `middleware.ts` — redirects unauthenticated users to `/login` for protected routes
- **Tests**: Vitest + Testing Library + MSW (`tests/mocks/handlers.ts` for API mocking)
- **E2E**: Playwright (`tests/e2e/`) — video try-on flow, critical user paths

### Infrastructure

AWS us-east-1, deployed via GitHub Actions:
- `deploy-web.yml` → ECR + ECS Fargate (Next.js standalone container)
- `deploy-api.yml` → ECR + ECS Fargate
- `deploy-ai.yml` → S3 model artifacts for SageMaker
- Terraform in `infra/` for all AWS resources

SageMaker endpoints:
- CLIP — real-time (ml.g4dn.xlarge)
- FASHN + Qwen + CatV2TON — async with scale-to-zero (ml.g5.2xlarge)

### Deploy Script

```bash
./scripts/deploy.sh              # Full deploy (base infra → AI images → SageMaker → API → Web)
./scripts/deploy.sh infra        # Terraform only (all resources incl. SageMaker)
./scripts/deploy.sh ai           # SageMaker handler images only (push to ECR + S3)
./scripts/deploy.sh api          # API container + DB migrations
./scripts/deploy.sh web          # Web container only
./scripts/deploy.sh app          # API + Web (skip infra/AI)
./scripts/deploy.sh verify       # Post-deploy health check
```

Full `all` deploy order: `deploy_infra_base` → `deploy_ai` → `deploy_infra_ai_endpoints` → `deploy_api` → `run_migrations` → `deploy_web` → `verify`. This ensures ECR images exist before SageMaker endpoints reference them.

Requires: `aws` CLI authenticated, `docker` running, `terraform` installed.

### Dev Script

```bash
./scripts/dev.sh              # Start all (API + Web + DB) with real AWS
./scripts/dev.sh mock         # Start all in mock mode (no AWS needed)
./scripts/dev.sh api          # API only
./scripts/dev.sh web          # Web only
./scripts/dev.sh db           # PostgreSQL Docker only
```

Requires: `apps/.env` for real AWS mode (see Environment Variables below).

## Key Config

- **Package manager**: Bun (lockfile: `bun.lock`)
- **Node**: >= 20
- **Python**: >= 3.10
- **Prettier**: no semi, double quotes, trailing comma es5, tabWidth 2, tailwind plugin
- **Python linting**: ruff (select E/W/F/I/B/C4/UP/ARG001/T201), mypy strict
- **Python testing**: pytest with coverage
- **Web testing**: Vitest (jsdom) + MSW for unit, Playwright for E2E
- **CI**: On push to main — deploy-api.yml, deploy-web.yml, deploy-ai.yml (GitHub Actions)
- **CI**: On PR to main — ci.yml: lint → typecheck → unit test → build → E2E (Playwright on Chromium)
- **Path alias**: `@/` maps to `apps/web/` root in both source and tests
- **Env var**: `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000/api/v1`)

## Environment Variables

Required in `apps/.env` for local development with real AWS:

| Variable | Required | Description |
|----------|----------|-------------|
| `PROJECT_NAME` | Yes | App name (DecaDriver) |
| `ENVIRONMENT` | Yes | `local`, `staging`, or `production` |
| `POSTGRES_SERVER` | Yes | PostgreSQL host |
| `POSTGRES_PORT` | No | Default: 5432 |
| `POSTGRES_USER` | Yes | DB username |
| `POSTGRES_PASSWORD` | Yes | DB password |
| `POSTGRES_DB` | Yes | DB name |
| `SECRET_KEY` | Yes | JWT signing key |
| `FIRST_SUPERUSER` | Yes | Admin email |
| `FIRST_SUPERUSER_PASSWORD` | Yes | Admin password |
| `BACKEND_CORS_ORIGINS` | No | Comma-separated origins |
| `AWS_REGION` | No | Default: us-west-2 |
| `AI_S3_BUCKET` | No | S3 bucket for AI assets (empty = mock mode) |
| `SAGEMAKER_CLIP_ENDPOINT` | No | CLIP realtime endpoint name |
| `SAGEMAKER_FASHN_ENDPOINT` | No | FASHN async endpoint name |
| `SAGEMAKER_QWEN_ENDPOINT` | No | Qwen async endpoint name |
| `SAGEMAKER_CATVTON_ENDPOINT` | No | CatV2TON async endpoint name |
| `SAGEMAKER_ROLE_ARN` | No | IAM role for DreamBooth training |
| `DREAMBOOTH_IMAGE_URI` | No | ECR URI for DreamBooth container |

## Database Migrations

Linear chain (current head: `d4e5f6g7h8i9`):

```
e2412789c190  Initialize models
9c0a54914c78  UUID primary keys
d98dd8ec85a3  Cascade delete
1a31ce608336  Add created_at
fe56fa70289e  Add created_at to User/Item
a1b2c3d4e5f6  Add AI models (Garment, TryOnJob, StyleProfile, AvatarJob)
b2c3d4e5f6g7  Convert clip_embedding to vector(768)
c3d4e5f6g7h8  Add video_tryon_job table (CatV2TON)
d4e5f6g7h8i9  Add missing columns (avoid_styles, reference_image_url)
```
