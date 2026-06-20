# FoodLink Infrastructure

Terraform for deploying FoodLink frontend and backend.

## Layout

- `aws/`: backend EC2 runtime.
- `vercel/`: frontend project/config target.
- `shared/`: notes or reusable modules later.

## Intended Split

- AWS owns backend runtime and networking.
- Supabase owns PostgreSQL through `DATABASE_URL`.
- Vercel owns Next.js frontend project, domains, and public frontend env vars.

## Usage

Deploy backend first, then pass its output to Vercel.

```sh
cd infra/aws
cp terraform.tfvars.example terraform.tfvars
# edit terraform.tfvars
terraform init
terraform plan
terraform apply

terraform output -raw backend_api_url
```

```sh
cd ../vercel
cp terraform.tfvars.example terraform.tfvars
# set api_url to backend_api_url
terraform init
terraform plan
terraform apply
```

Keep provider credentials, `DATABASE_URL`, JWT secret, and real `*.tfvars` outside git.
