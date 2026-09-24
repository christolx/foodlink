# FoodLink hosting migration summary

## Result

FoodLink frontend stays on Vercel. Go API and PostgreSQL now run on the existing home k3s cluster in the `foodlink` namespace. Browser requests use Vercel's same-origin `/api/v1` rewrite:

```text
Browser -> Vercel -> Cloudflare Tunnel -> Traefik -> FoodLink API -> PostgreSQL
```

Public API hostname: `https://api-foodlink.christofletjhai.dev`. PostgreSQL has no public endpoint.

## Changes made

- Added `deploy/k8s/` manifests for namespace, API Deployment and Service, PostgreSQL StatefulSet and Service with 8Gi local-path PVC, DB NetworkPolicy, Traefik Ingress, and one-off demo bootstrap Job. API image pinned to `ghcr.io/christolx/foodlink-api:sha-c3b396d`.
- Created cluster Secret from ignored `deploy/k8s/secrets.env`; reused previous JWT secret so existing tokens remain valid. Seeded fresh DB with five demo donations. Old RDS data was **not** migrated.
- Added Cloudflare Tunnel route and proxied DNS for API hostname. Removed temporary staging route after validation.
- Set separate Vercel preview and production `FOODLINK_API_ORIGIN` records to API hostname; redeployed both. Left `NEXT_PUBLIC_API_BASE_URL` unset so browser uses `/api/v1` on Vercel.
- Updated deployment, Vercel, and AWS docs. AWS Terraform config remains in repo as historical reference; applying it would recreate retired resources.
- Destroyed all nine FoodLink AWS Terraform resources after cutover: EC2, RDS, Elastic IP, networking resources, and generated DB password. Terraform state is empty. No final RDS snapshot was taken, per approved fresh-seed approach.

## Verification

- Public API health passed; API and PostgreSQL workloads reached `1/1` ready. All 19 Hurl smoke requests passed; test records were cleaned.
- Preview and production Vercel rewrites reached k3s DB. Production demo login and authenticated API checks passed for donor, receiver, and volunteer. Donor dashboard loaded seed data; chat SSE delivered a live message; Cloudinary upload returned HTTP 200.
- After AWS teardown, production frontend and API still returned HTTP 200; all three demo roles authenticated; five seed donations remained.

## Operations notes

- Update both API image tags in `deploy/k8s/kustomization.yaml` and `deploy/k8s/bootstrap-job.yaml` for next release. Bootstrap Job is for fresh DB only.
- Local PVC survives pod restarts but is no off-server backup. Host or volume loss discards writes after seed; add backups if data becomes valuable.
- Vercel env changes require new deployments. Existing Vercel project has no Terraform state in this checkout: import before any `infra/vercel` Terraform apply.
- Old AWS API address cannot serve as rollback. Test Cloudinary asset `k0yrsj1vqvbjj0zrdczi` remains in account `dewgvguem` for manual cleanup.

See [deployment guide](../deploy/k8s/README.md) for commands and detail.
