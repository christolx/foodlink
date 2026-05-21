# Backend

Go core service for FoodLink.

## Local commands

- `DATABASE_URL=postgres://... go run ./cmd/api --migrate`: run GORM migrations and seed demo users.
- `DATABASE_URL=postgres://... DEMO_JWT_SECRET=local-secret go run ./cmd/api`: start API on `:8080`.
- `go test ./...`: run backend tests.

## Implemented scaffold

- OpenAPI-generated types and strict server interface from `contracts/openapi.yaml`
- Demo JWT auth
- PostgreSQL via GORM
- Donation, claim, pickup, and notification happy path
- `GET /health`
