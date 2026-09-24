# Vercel IaC

Frontend project configuration.

Resources:

- Vercel project for `frontend/`
- Git repository link
- server-side API origin env var
- optional Cloudinary env vars
- optional custom domain

## Existing Vercel project

Project `foodlink` already exists in Vercel. This checkout has no Terraform state for it; **do not run `terraform apply`** against existing project without importing resources first. Current project env is managed directly in Vercel. `FOODLINK_API_ORIGIN` now has separate preview and production records. If they are merged into one record again, split targets in Vercel first: `vercel env update ... preview` updates the whole record even when that record also targets production.

Preview and production were redeployed with `FOODLINK_API_ORIGIN=https://api-foodlink.christofletjhai.dev`. Production alias `https://foodlink.christofletjhai.dev` points to the new deployment. Both frontends created temporary donations visible through the k3s API. Old AWS origin `http://16.79.8.241:8080` has been retired and cannot serve as rollback.

For future origin changes, update preview first, then production:

```sh
vercel env update FOODLINK_API_ORIGIN preview --project foodlink \
  --value https://api-foodlink.christofletjhai.dev --yes
# Redeploy a current FoodLink deployment with --target preview; test preview URL.
vercel env update FOODLINK_API_ORIGIN production --project foodlink \
  --value https://api-foodlink.christofletjhai.dev --yes
# Redeploy current production deployment; test https://foodlink.christofletjhai.dev.
```

After each update, run `vercel env pull` for **both** environments to verify their values. Vercel env changes affect new deployments only. Existing Next.js rewrite sends browser requests to same-origin `/api/v1`, then proxies to this origin. Leave `NEXT_PUBLIC_API_BASE_URL` unset. Only use a reachable API origin for rollback; prior AWS IP no longer works.

## Terraform for new projects or imported state

```sh
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars with repo, backend API origin, Cloudinary values, optional domain
terraform init
terraform plan
terraform apply
```

For self-hosted k3s backend, set `api_url` to `https://api-foodlink.christofletjhai.dev`. If Terraform later manages existing project, import project and environment resources before `plan`/`apply`; reconcile current production/preview targets with Terraform defaults. To roll back a future CLI-managed origin change, set `FOODLINK_API_ORIGIN` to a known reachable API and redeploy.

Keep `vercel_api_token` outside committed files. Prefer `TF_VAR_vercel_api_token`.
