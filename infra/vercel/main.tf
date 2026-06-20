resource "vercel_project" "frontend" {
  name           = var.project_name
  framework      = "nextjs"
  root_directory = var.frontend_root_directory

  git_repository = {
    type = var.git_provider
    repo = var.git_repo
  }
}

resource "vercel_project_environment_variable" "api_base_url" {
  project_id = vercel_project.frontend.id
  key        = "NEXT_PUBLIC_API_BASE_URL"
  value      = var.api_url
  target     = var.environment_targets
}

resource "vercel_project_environment_variable" "cloudinary_cloud_name" {
  count = var.cloudinary_cloud_name == null ? 0 : 1

  project_id = vercel_project.frontend.id
  key        = "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"
  value      = var.cloudinary_cloud_name
  target     = var.environment_targets
}

resource "vercel_project_environment_variable" "cloudinary_upload_preset" {
  count = var.cloudinary_upload_preset == null ? 0 : 1

  project_id = vercel_project.frontend.id
  key        = "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET"
  value      = var.cloudinary_upload_preset
  target     = var.environment_targets
}

resource "vercel_project_domain" "frontend" {
  count = var.domain == null ? 0 : 1

  project_id = vercel_project.frontend.id
  domain     = var.domain
}
