# FoodLink Architecture

## Current Direction

- Frontend: Next.js shell
- UI: React + TypeScript + Tailwind
- Backend: Go core service
- Database: PostgreSQL
- Map UI: Leaflet with OpenStreetMap tiles
- Navigation handoff: Google Maps deep links for volunteers
- Repo: one monorepo
- Deploy: one frontend deploy, one backend deploy, managed DB

## Principle

- Monolith-first
- Service-ready later
- Split only when boundary and load justify it

## Why

- Demo speed
- Lower sync risk
- Easier contract reuse
- Cleaner local dev

## Planned Repo Shape

- `frontend/` for Next.js
- `backend/` for Go service
- `contracts/` for shared API contracts
- `docs` for scope and decisions

## Future Split Candidates

- Notifications
- File upload
- Search
- Analytics
- Admin tooling
