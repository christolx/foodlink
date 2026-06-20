# Backend

Go core service for FoodLink.

## Local commands

- `DATABASE_URL=postgres://... go run ./cmd/api --migrate`: run GORM migrations and seed demo users.
- `DATABASE_URL=postgres://... go run ./cmd/api --nuke`: drop all database tables. Combine with `--migrate` to re-create and re-seed clean vanilla data.
- `DATABASE_URL=postgres://... go run ./cmd/api --cleanup-smoke`: delete Hurl smoke test records.
- `DATABASE_URL=postgres://... DEMO_JWT_SECRET=local-secret go run ./cmd/api`: start API on `:8080`.
- `go test ./...`: run backend tests.
- `hurl --test --variable base_url=http://localhost:8080 backend/smoke/api.hurl`: run local API smoke tests against a running backend.

## Docker

Build:

```bash
docker build -t foodlink-api .
```

Run migrations and seed demo data:

```bash
docker run --rm --env-file .env foodlink-api --migrate
```

Run API:

```bash
docker run --rm --env-file .env -p 8080:8080 foodlink-api
```

Smoke tests create donations with a `[SMOKE_TEST]` title prefix. Use `--cleanup-smoke` with the same `DATABASE_URL` to delete those donations and related proposals, pickups, and notifications.


## Implemented scaffold

- OpenAPI-generated types and strict server interface from `contracts/openapi.yaml`
- Demo JWT auth
- PostgreSQL via GORM
- Profile, donation, delivery proposal, pickup, and notification happy path
- `GET /health`
