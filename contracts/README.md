# Contracts

Shared API contracts for FoodLink. Contract files are the source of truth for API
shape; backend and frontend implementations must follow generated artifacts from
these files instead of redefining DTOs by hand.

## Files

- `openapi.yaml`: OpenAPI 3.0 contract for `/api/v1`.

Keep the contract single-file until domain split earns its cost.

## Generation targets

- Go backend: generate server/types with `oapi-codegen`.
- TypeScript frontend: generate client/types with `openapi-typescript` or the
  selected `openapi-ts` flow.

Generated files should live in backend/frontend owned output directories and be
treated as build artifacts. Handwritten application code imports those generated
types and handlers instead of duplicating request or response structs.

## Conventions

- Base path is `/api/v1`.
- JSON endpoints use `application/json`.
- `POST /auth/demo-login` is public. Other business endpoints require
  `Authorization: Bearer <token>`.
- Errors use `ErrorResponse` with `code` and `message`.
- Lists return `{ items, page, pageSize, total }`.
- Timestamps use RFC3339 `date-time`.
- IDs are strings until database ID type is fixed.
