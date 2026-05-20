# Repository Guidelines

## Project Structure & Module Organization

FoodLink is a demo-first monorepo with separate frontend and backend deploys.

- `frontend/`: Next.js app using React, TypeScript, Tailwind CSS, and Biome.
- `frontend/src/app/`: App Router entry points, layout, page, and global CSS.
- `frontend/public/`: Static frontend assets.
- `backend/`: Go API service.
- `backend/cmd/api/`: API executable entry point. Current service exposes `GET /health`.
- `backend/internal/`: Private backend packages for domain, persistence, and handlers.
- `contracts/`: Shared API contract notes.
- `docs/`: Scope, architecture, backend/frontend notes, and contract design.

## Build, Test, and Development Commands

Run frontend commands from `frontend/`:

- `pnpm install`: install dependencies.
- `pnpm dev`: start Next.js on `http://localhost:3000`.
- `pnpm build`: create production build.
- `pnpm start`: run built app.
- `pnpm lint`: run Biome checks.
- `pnpm format`: format frontend files with Biome.

Run backend commands from `backend/`:

- `go run ./cmd/api`: start API server. Uses `PORT`, default `8080`.
- `go test ./...`: run all Go tests.
- `go build ./cmd/api`: compile API.

## Coding Style & Naming Conventions

Frontend uses Biome with 2-space indentation, recommended rules, React/Next domains, and import organization. Use TypeScript for new frontend code. Name React components with `PascalCase`; keep route files aligned with App Router conventions such as `page.tsx` and `layout.tsx`.

Backend uses standard Go formatting. Run `gofmt` before committing. Keep executable wiring in `cmd/api`; place reusable application code in `internal/`. Use short, lowercase Go package names.

## Testing Guidelines

No frontend test framework is configured yet. For frontend changes, run `pnpm lint` and `pnpm build`. Add future UI tests near covered code or under a clear test directory, using `*.test.ts` or `*.test.tsx`.

Backend tests use Go's standard testing package. Name files `*_test.go`, prefer table-driven tests, and run `go test ./...` before opening a PR.

## Commit & Pull Request Guidelines

Current history uses Conventional Commit-style `chore:` messages, for example `chore: initial backend setup`. Continue with concise prefixes such as `feat:`, `fix:`, `docs:`, `test:`, and `chore:`.

Pull requests should include summary, changed areas (`frontend`, `backend`, `contracts`, `docs`), verification commands, linked issues when available, and screenshots for visible UI changes. Update `docs/` or `contracts/` when behavior or API shape changes.

## Security & Configuration Tips

Do not commit secrets or local environment files. Configure backend port with `PORT`. Keep generated build output such as `.next`, `dist`, and `build` out of version control.
