# FoodLink

FoodLink is a demo-first food rescue app for connecting surplus food with people
who need it, coordinated through donors, receivers, and volunteers.

<p align="center"><strong>Watch the Demo Video by Clicking the Image Below</strong></p>

[![FoodLink demo preview](frontend/public/preview/uz3hu39s7mqbylgyoefz.webp)](https://youtu.be/67UDlpDQFZc)

## Repo Map

| Path | Purpose |
| --- | --- |
| `frontend/` | Next.js app with React, TypeScript, Tailwind CSS, and Biome. |
| `backend/` | Go API service with demo JWT auth and PostgreSQL persistence. |
| `deploy/k8s/` | FoodLink API and PostgreSQL manifests for existing k3s host. |
| `contracts/` | Shared OpenAPI contract for `/api/v1`. |
| `docs/` | Product scope, architecture, frontend, backend, and contract notes. |
| `infra/` | Vercel Terraform config and existing AWS Terraform deployment. |
| `.github/workflows/` | GitHub Actions CI/CD workflow definitions. |

## Stack & Direction

| Area | Current choice |
| --- | --- |
| Product shape | Demo-first workflow with one volunteer-driven matching path end to end. |
| Repo shape | Monorepo with separate frontend and backend deploys. |
| Backend shape | Monolith-first, service-ready later. |
| Frontend | Next.js, React, TypeScript, Tailwind CSS, Biome. |
| Backend | Go, GORM, PostgreSQL. |
| Contracts | OpenAPI 3.0. |
| Maps | Leaflet with OpenStreetMap tiles, plus Google Maps handoff links for volunteer navigation. |
| Asset storage | Cloudinary for donation image uploads. |
| CI/CD | GitHub Actions for frontend CI, backend CI, and backend image publishing. |
| Deployment | Vercel frontend; self-hosted k3s API/PostgreSQL behind Cloudflare Tunnel and Traefik. Old AWS stack retired. |

## Local Development

1. Start frontend from `frontend/`:

```bash
pnpm install
pnpm dev
```

Frontend runs at `http://localhost:3000`.

2. Start backend from `backend/`:

```bash
go run ./cmd/api
```

Backend uses `PORT` when set and defaults to `8080`.

## Verification

Frontend:

```bash
cd frontend
pnpm lint
pnpm build
```

Backend:

```bash
cd backend
go test ./...
go build ./cmd/api
```

## Environment Configuration

| Variable | App | Required | Notes |
| --- | --- | --- | --- |
| `FOODLINK_API_ORIGIN` | Frontend | No | Server-side backend origin for Next.js rewrites; use Cloudflare Tunnel HTTPS hostname on Vercel. |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend | No | Optional browser-visible API origin. Use only with HTTPS backends in HTTPS deployments. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Frontend | Yes, for uploads | Cloudinary cloud name for client-side image uploads. |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Frontend | Yes, for uploads | Unsigned upload preset for client-side image uploads. |
| `PORT` | Backend | No | API port, default `8080`. |
| `DATABASE_URL` | Backend | Yes | PostgreSQL connection string. |
| `DEMO_JWT_SECRET` | Backend | Yes | JWT signing secret for demo auth. |
| `FOODLINK_ALLOWED_ORIGINS` | Backend | No | CORS allowlist for direct browser-to-API calls; same-origin Vercel rewrite needs no extra origin. |

See [frontend/README.md](frontend/README.md) for Cloudinary setup details and [backend/README.md](backend/README.md) for backend usage examples.

## Docs

| Doc | Purpose |
| --- | --- |
| [Project docs](docs/README.md) | Index for scope, architecture, frontend, backend, and contract notes. |
| [Scope](docs/scope.md) | Demo goals, role flow, status flow, and stretch work. |
| [Architecture](docs/architecture.md) | System shape, runtime boundaries, and split candidates. |
| [Contracts](contracts/README.md) | API contract conventions and generation targets. |
| [OpenAPI spec](contracts/openapi.yaml) | Source of truth for `/api/v1`. |
| [k3s deployment](deploy/k8s/README.md) | API/PostgreSQL manifests, seed bootstrap, and tunnel routing. |
| [Infrastructure](infra/README.md) | Vercel config and existing AWS Terraform. |
