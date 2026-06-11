# Backend

Go core service for FoodLink.

## Current Contents

- REST API generated from `contracts/openapi.yaml`.
- Demo JWT auth and role gates.
- PostgreSQL persistence through GORM.
- `.env` loading through `godotenv`.
- GORM migrations, nuke, seeding, and smoke cleanup flags.
- Volunteer-driven proposal flow.
- Donor and receiver proposal accept/reject flow.
- Pickup assignment and status transitions.
- Role-scoped pickup listing for dashboards.
- Notification listing, read marking, and server-sent notification stream.

## Runtime Configuration

- `DATABASE_URL` is required.
- `PORT` defaults to `8080`.
- `DEMO_JWT_SECRET` defaults to `foodlink-local-demo-secret` when unset.

## Local Operations

- `go run ./cmd/api --migrate`: run GORM migrations and seed demo data.
- `go run ./cmd/api --nuke`: drop all database tables and exit.
- `go run ./cmd/api --nuke --migrate`: drop, recreate, and seed clean demo data.
- `go run ./cmd/api --cleanup-smoke`: remove smoke-test donations and related records.
- `go run ./cmd/api`: start the API server.

## Seeded Demo Data

- Users: `user_donor`, `user_receiver`, and `user_volunteer`.
- Profiles include Jakarta-area coordinates for donor and receiver examples.
- Seed data includes available, pending, accepted, rejected, delivered, pickup, and notification examples.
- Demo login accepts either a seeded user ID or a role.

## Role And State Rules

- Donor only: create donations.
- Volunteer only: list receivers, create proposals, mark pickups picked up.
- Donor or receiver: accept or reject delivery proposals.
- Volunteer or receiver: mark pickups delivered.
- Proposal becomes accepted only after donor and receiver both accept.
- Pickup is created when both proposal sides have accepted.

## Dashboard API Notes

- `GET /delivery-proposals` returns proposals visible to the current role.
- `GET /pickups` returns pickups visible to the current role, with optional `status` filtering.
- Proposal and pickup DTOs embed related donation/profile data when available so frontend dashboards do not render raw IDs.
- `POST /donations` requires `imageUrl`; the server validates it as an HTTPS Cloudinary URL.

## Verification Notes

- `go test ./...` runs backend unit tests.
- `backend/smoke/api.hurl` covers the happy path plus auth, role-gate, and conflict checks.
- Current smoke file should include `imageUrl` for donation creation to match the contract and server validation.
