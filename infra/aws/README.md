# AWS EC2 IaC

Backend deployment infrastructure.

Scope:

- EC2 only
- Supabase PostgreSQL via provided connection string
- backend image pulled from GHCR or another container registry
- no custom domain
- no HTTPS
- API reached by public EC2 IP and backend port

Resources:

- EC2 instance for Dockerized Go API
- security group for SSH and API port
- Elastic IP

## Target Shape

```txt
Vercel frontend
  NEXT_PUBLIC_API_BASE_URL=http://<elastic-ip>:8080

AWS EC2 backend
  Docker container listens on :8080
  public access allowed to :8080
  SSH access restricted to local IP

Supabase
  PostgreSQL connection string passed as DATABASE_URL
```

## Terraform Resources

- `aws_security_group`
- `aws_instance`
- `aws_eip`
- `aws_eip_association`

## Security Group Rules

- inbound SSH: TCP `22`, source = your current public IP only
- inbound API: TCP `8080`, source = `0.0.0.0/0`
- outbound: all traffic

No inbound `80` or `443` needed unless adding reverse proxy later.

## Deployment Plan

1. Terraform creates EC2, security group, and Elastic IP.
2. EC2 installs Docker, pulls the configured backend image, runs migrations, and starts a systemd-managed container.
3. Backend connects to Supabase through `DATABASE_URL`.
4. Terraform outputs `backend_public_ip` and `backend_api_url`.
5. Vercel uses `NEXT_PUBLIC_API_BASE_URL=http://<elastic-ip>:8080`.

## Usage

```sh
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars with SSH CIDR, container image, Supabase DATABASE_URL, JWT secret, and allowed origins
terraform init
terraform plan
terraform apply
```

After apply:

```sh
curl "$(terraform output -raw backend_api_url)/health"
```

Logs:

```sh
ssh ec2-user@$(terraform output -raw backend_public_ip)
sudo journalctl -u foodlink-api -f
```

`database_url`, `demo_jwt_secret`, and optional registry credentials are sensitive Terraform variables, but Terraform state still contains values used in EC2 user data. Store state somewhere private.

## GHCR Image

Use the image published by GitHub Actions:

```hcl
container_image = "ghcr.io/christolx/foodlink-api:latest"
```

If the package is private, set `registry_username` and `registry_token`. If public, omit them.

## Later Upgrades

- add Caddy/Nginx reverse proxy
- add HTTPS
- add custom domain
- add deploy IAM role
- use SSM Parameter Store or Secrets Manager for runtime secrets

Do not commit real `*.tfvars` files or Terraform state.
