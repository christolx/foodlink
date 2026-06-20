# FoodLink

FoodLink is a demo-first food rescue app for connecting surplus food with people
who need it, coordinated through donors, receivers, and volunteers.

![FoodLink landing page preview](frontend/public/preview/uz3hu39s7mqbylgyoefz.webp)

## What is included

- `frontend/` - Next.js app with React, TypeScript, Tailwind CSS, and Biome.
- `backend/` - Go API service with demo JWT auth and PostgreSQL persistence.
- `contracts/` - shared OpenAPI contract for `/api/v1`.
- `docs/` - product scope, architecture, frontend, backend, and contract notes.

## Current direction

- Demo-first workflow with one volunteer-driven matching path end to end.
- Monolith-first backend, service-ready later.
- One repo with separate frontend and backend deploys.
- In-app map planned with Leaflet and OpenStreetMap.
- Volunteer navigation can hand off to Google Maps links.

## Tech stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS, Biome.
- Backend: Go, GORM, PostgreSQL.
- Contracts: OpenAPI 3.0.
- Maps: Leaflet with OpenStreetMap tiles.

## Local development

Run frontend commands from `frontend/`:

```bash
pnpm install
pnpm dev
```

Frontend runs at `http://localhost:3000`.

Run backend commands from `backend/`:

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

## Environment configuration

Frontend variables:

- `NEXT_PUBLIC_API_BASE_URL` - optional backend origin when API is on another host, for example `http://localhost:8080`.
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name for client-side image uploads.
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` - unsigned upload preset for client-side image uploads.

See [frontend/README.md](frontend/README.md) for Cloudinary setup details.

Backend variables:

- `PORT` - API port, default `8080`.
- `DATABASE_URL` - PostgreSQL connection string.
- `DEMO_JWT_SECRET` - JWT signing secret for demo auth.

See [backend/README.md](backend/README.md) for backend usage examples.

## Docs

- [Project docs](docs/README.md)
- [Scope](docs/scope.md)
- [Architecture](docs/architecture.md)
- [Contracts](contracts/README.md)
