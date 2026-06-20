variable "vercel_api_token" {
  description = "Vercel API token."
  type        = string
  sensitive   = true
}

variable "vercel_team_id" {
  description = "Optional Vercel team ID. Leave null for personal account."
  type        = string
  default     = null
}

variable "project_name" {
  description = "Vercel project name."
  type        = string
}

variable "git_provider" {
  description = "Git provider type used by Vercel."
  type        = string
  default     = "github"
}

variable "git_repo" {
  description = "Git repository in owner/name format."
  type        = string
}

variable "frontend_root_directory" {
  description = "Frontend root directory inside monorepo."
  type        = string
}

variable "api_url" {
  description = "Public backend API URL exposed to frontend."
  type        = string
}

variable "environment_targets" {
  description = "Vercel environments receiving managed env vars."
  type        = list(string)
  default     = ["production", "preview", "development"]
}

variable "cloudinary_cloud_name" {
  description = "Optional Cloudinary cloud name for donation image uploads."
  type        = string
  default     = null
}

variable "cloudinary_upload_preset" {
  description = "Optional unsigned Cloudinary upload preset for donation image uploads."
  type        = string
  default     = null
}

variable "domain" {
  description = "Optional custom domain for the frontend."
  type        = string
  default     = null
}
