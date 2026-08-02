# FoodLink Architecture

## Current Direction

- Frontend: Next.js App Router app
- UI: React + TypeScript + Tailwind
- Backend: Go core service
- Database: PostgreSQL
- Map UI: Leaflet with OpenStreetMap tiles
- Navigation handoff: Google Maps deep links for volunteers
- Repo: one monorepo
- Deploy: one frontend deploy, one backend deploy, managed DB

## Principle

- Monolith-first
- Modular-monolith boundaries: each feature owns its use cases and repository interface.
- Service-ready later
- Split only when boundary and load justify it

## Module Boundaries

- HTTP handlers adapt OpenAPI requests and responses only.
- Feature services own validation and application use cases.
- Feature repositories are interfaces owned by the feature; PostgreSQL/GORM remains an adapter.
- `internal/donations` is first migrated boundary. Other feature areas migrate incrementally without changing API contracts.

## Why

- Demo speed
- Lower sync risk
- Easier contract reuse
- Cleaner local dev

## Runtime Shape

- `frontend/` owns the landing page, demo role picker, and authenticated dashboard.
- `backend/` owns API routing, auth, role gates, persistence, seeding, and state transitions.
- `contracts/openapi.yaml` is the API shape source of truth.
- `docs/` tracks scope and implementation decisions.
- Frontend calls `/api/v1` by default. Next.js rewrites proxy to `FOODLINK_API_ORIGIN` when set.
- Browser sessions store the demo JWT in `localStorage` under `foodlink.demoToken`.
- Donation image upload uses Cloudinary on the client; backend validates Cloudinary HTTPS image URLs.

## Current Frontend Surfaces

- `/` - landing page with role entry points and preview content.
- `/demo` - demo account picker for donor, receiver, and volunteer.
- `/app` - authenticated role dashboard.
- Dashboard maps load client-side only to avoid SSR issues with Leaflet.

## Current Backend Surfaces

- `GET /health`
- `/api/v1/auth/demo-login`
- `/api/v1/me` and `/api/v1/me/profile`
- `/api/v1/donations`
- `/api/v1/receivers`
- `/api/v1/delivery-proposals`
- `/api/v1/pickups`
- `/api/v1/notifications`
- `/api/v1/notifications/stream`

## Future Split Candidates

- Notifications
- File upload
- Search
- Analytics
- Admin tooling
