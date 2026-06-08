# FoodLink

Monorepo for FoodLink demo app.

## Layout

- `frontend` - Next.js app shell
- `backend` - Go API service
- `contracts` - shared API contracts
- `docs` - scope, architecture, contracts

## Current Rules

- demo-first
- monolith-first backend
- service-ready later
- one repo, separate deploys
- in-app map uses Leaflet + OpenStreetMap
- volunteer routing can hand off to Google Maps links

## Environment Configuration

Both frontend and backend services can be configured via environment variables.

### Frontend (`frontend/`)
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name for client-side image uploads.
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`: Unsigned upload preset for client-side image uploads.

See [frontend/README.md](file:///home/icemotion/CodeProjects/foodlink/frontend/README.md) for detailed configuration instructions.

### Backend (`backend/`)
- `PORT`: Port to run the Go API service on (default: `8080`).
- `DATABASE_URL`: Connection string for PostgreSQL database.
- `DEMO_JWT_SECRET`: Secret key for JWT signing.

See [backend/README.md](file:///home/icemotion/CodeProjects/foodlink/backend/README.md) for usage examples.
