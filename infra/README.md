# FoodLink Infrastructure

Infrastructure for Vercel frontend and self-hosted k3s backend. AWS EC2/RDS deployment has been retired.

## Layout

- `aws/`: historical backend EC2 and PostgreSQL RDS Terraform.
- `vercel/`: frontend project/config target.
- `../deploy/k8s/`: self-hosted API and PostgreSQL manifests for CartLabs k3s host.
- `shared/`: notes or reusable modules later.

## Current Deployment

- Existing CartLabs k3s host runs FoodLink API and PostgreSQL in `foodlink` namespace. Existing Cloudflare Tunnel and Traefik publish API hostname.
- Vercel owns Next.js frontend project, domains, and frontend env vars.

## Usage

Backend deploy and operations: `deploy/k8s/README.md`. Vercel origin and rollback: `vercel/README.md`. Current Vercel project has no Terraform state in this checkout; import its resources before any Terraform apply. `infra/vercel/` Terraform remains a template for new projects or imported state.

Keep provider credentials, JWT secret, real `*.tfvars`, and Terraform state outside git. `infra/aws/` remains as historical configuration; its live resources were destroyed.
