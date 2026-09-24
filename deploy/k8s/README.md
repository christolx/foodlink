# FoodLink on existing k3s host

Manifests deploy one API replica and one PostgreSQL replica in dedicated `foodlink` namespace. Traefik serves API on its HTTP `web` entrypoint; existing host `cloudflared` forwards public HTTPS traffic to `http://localhost:80`. PostgreSQL has no public Service.

## Edit before deploy

1. Manifests pin publicly pullable `ghcr.io/christolx/foodlink-api:sha-c3b396d` (deployed API image, Linux amd64). CI currently publishes `sha-<7-character commit>` tags. On next release, update tag in `kustomization.yaml` and `bootstrap-job.yaml` together. If GHCR package becomes private, create pull Secret and add `imagePullSecrets` to API and bootstrap pod specs.
2. Existing tunnel includes `api-foodlink.christofletjhai.dev` -> `http://localhost:80`; `ingress.yaml` routes that hostname by Host header. Proxied CNAME in Cloudflare DNS zone `christofletjhai.dev` is `api-foodlink` -> `03fa33c6-80f9-444b-99f0-d4a2acd94682.cfargotunnel.com`. Recreate it if rebuilding DNS. Local `cloudflared` certificate belongs to different zone (`christofle.dev`); do not use `cloudflared tunnel route dns` for this hostname. Host architecture is confirmed amd64.
3. Review PostgreSQL `8Gi` PVC, `local-path` storage class, and resource limits in `postgresql.yaml` against host capacity. PVC stays on this node; it is not an off-server backup.
4. Copy `secrets.env.example` to ignored `secrets.env`. Set identical DB password in `POSTGRES_PASSWORD` and `DATABASE_URL` (URL-encode password in URL). Preserve existing `DEMO_JWT_SECRET` if old tokens must keep working. Never commit `secrets.env` or a Secret manifest containing values.

## First deployment

Run from repository root with kubeconfig pointed at CartLabs k3s host:

```sh
kubectl apply -f deploy/k8s/namespace.yaml
kubectl -n foodlink create secret generic foodlink-secrets \
  --from-env-file=deploy/k8s/secrets.env \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl -n foodlink apply -f deploy/k8s/postgresql.yaml
kubectl -n foodlink rollout status statefulset/foodlink-postgresql
```

Bootstrap fresh demo DB from seed:

```sh
kubectl apply -f deploy/k8s/bootstrap-job.yaml
kubectl -n foodlink wait --for=condition=complete job/foodlink-bootstrap --timeout=15m
kubectl -n foodlink logs job/foodlink-bootstrap
```

`--migrate` creates schema and seeds demo data. Delete completed Job before rerunning. Current seed code also assigns existing demo rows, so do not use this command as a routine migration against live data. Split migration from seeding before future schema upgrades.

After DB has schema and data:

```sh
kubectl apply -k deploy/k8s
kubectl -n foodlink rollout status deployment/foodlink-api
kubectl -n foodlink get pods,svc,ingress,pvc
curl -fsS https://<api-hostname>/health
```

`GET /health` confirms API process responds; it does not test DB on every request. Verify authenticated DB-backed endpoint before Vercel cutover. Do not set `NEXT_PUBLIC_API_BASE_URL`; Vercel's same-origin rewrite uses `FOODLINK_API_ORIGIN`. Existing Vercel project lacks Terraform state in this checkout; use Vercel CLI to update env and redeploy. See `infra/vercel/README.md` for cutover order.

For full API smoke, `backend/smoke/api.hurl` makes 19 requests including donation/proposal/pickup writes. Afterward, remove its test records:

```sh
hurl --test --variable base_url=https://api-foodlink.christofletjhai.dev backend/smoke/api.hurl
kubectl -n foodlink exec deployment/foodlink-api -- foodlink-api --cleanup-smoke
```

Before public DNS exists, add `--resolve api-foodlink.christofletjhai.dev:80:<node-LAN-IP>` to Hurl and use `http://api-foodlink.christofletjhai.dev` as `base_url`. This checks Traefik, API, and PostgreSQL through the final Host route.

## Operations

- To update API, change both SHA tags, apply Kustomize, and wait for Deployment rollout. `Recreate` strategy keeps one API instance and causes brief downtime during updates.
- To rotate DB password, update PostgreSQL role password inside DB and `foodlink-secrets` together; changing `POSTGRES_PASSWORD` on existing PVC does not update existing role. Restart API after Secret changes.
- Current deployment treats database as disposable demo state; re-run bootstrap on a new empty PVC to recreate seed data after loss. Any user changes made after seeding will be lost. Cluster `local-path` StorageClass has `Delete` reclaim policy, so deleting PVC deletes its volume. Add off-server DB backups and restore test before treating writes as durable. k3s etcd snapshots and local PVC do not back up DB contents.
- Keep PostgreSQL major at 16 until planned migration. Do not switch image major against same PVC without database upgrade procedure.
