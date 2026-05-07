# DecaDriver Project Guide

## Project Overview

DecaDriver is a full-stack, multi-platform monorepo designed for high-performance delivery. It leverages a modern tech stack centered around a Python FastAPI backend and React-based frontends (Web and Mobile).

### Architecture
- **Backend (`apps/api`):** A FastAPI-based REST API using SQLModel (SQLAlchemy + Pydantic) for database interactions and Alembic for migrations. It integrates with AWS SageMaker for AI capabilities.
- **Web (`apps/web`):** A Next.js application using the App Router and shared UI components from the `packages/ui` workspace.
- **Mobile (`apps/mobile`):** An Expo/React Native application utilizing NativeWind for styling and React Native Reusables for UI components.
- **Infrastructure (`infra`):** AWS infrastructure managed by Terraform, including ECS for compute, RDS for the database, and SageMaker for AI endpoints.
- **Monorepo Management:** Powered by Bun and Turborepo for efficient builds and task orchestration.

## Key Technologies
- **Runtime:** Bun
- **Languages:** TypeScript, Python
- **Backend:** FastAPI, SQLModel, Alembic, `uv`
- **Frontend:** Next.js, Expo, React Native, Tailwind CSS (NativeWind)
- **Infrastructure:** Terraform, AWS (ECS, RDS, S3, SageMaker)

## Building and Running

### Monorepo Root
The root workspace uses `bun` and `turbo`.

- **Install Dependencies:** `bun install`
- **Build All:** `bun run build`
- **Development Mode:** `bun run dev`
- **Lint All:** `bun run lint`
- **Format All:** `bun run format`

### Backend (`apps/api`)
Managed with `uv`.

- **Install Dependencies:** `uv sync`
- **Run Tests:** `bash ./scripts/test.sh`
- **Local Dev (Docker):** `docker compose watch`
- **Database Migrations:**
  - Create: `docker compose exec backend alembic revision --autogenerate -m "description"`
  - Upgrade: `docker compose exec backend alembic upgrade head`

### Web (`apps/web`)
- **Dev:** `bun run dev` (uses Next.js Turbopack)
- **Build:** `bun run build`
- **Typecheck:** `bun run typecheck`

### Mobile (`apps/mobile`)
- **Dev:** `bun run dev` (starts Expo server)
- **Android:** `bun run android`
- **iOS:** `bun run ios`

## Development Conventions

### Coding Styles
- **Frontend:** Follows React/Next.js best practices. Components are located in `packages/ui` and imported into `web` and `mobile`.
- **Backend:** Uses SQLModel for unified model definitions. API routes are organized in `app/api/routes/`.
- **Shared Config:** Linting and TypeScript configurations are centralized in `packages/eslint-config` and `packages/typescript-config`.

### Infrastructure Changes
All infrastructure changes should be made via Terraform in the `infra` directory. The production environment is located in `infra/environments/prod`.

### AI Integration
SageMaker handlers and client logic reside in `apps/api/app/services/sagemaker_handlers`. AI endpoint deployment is managed via GitHub Actions (`.github/workflows/deploy-ai.yml`).
