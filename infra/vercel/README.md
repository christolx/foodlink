# Vercel IaC

Frontend project configuration.

Resources:

- Vercel project for `frontend/`
- Git repository link
- server-side API origin env var
- optional Cloudinary env vars
- optional custom domain

## Usage

```sh
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars with repo, backend API origin, Cloudinary values, optional domain
terraform init
terraform plan
terraform apply
```

Use AWS output for `api_url`:

```sh
cd ../aws
terraform output -raw backend_api_url
```

Keep `vercel_api_token` outside committed files. Prefer `TF_VAR_vercel_api_token`.
