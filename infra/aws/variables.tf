variable "aws_region" {
  description = "AWS region for backend infrastructure."
  type        = string
}

variable "project_name" {
  description = "Project name used for resource naming."
  type        = string
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type for the API host."
  type        = string
  default     = "t3.micro"
}

variable "ssh_key_name" {
  description = "Existing EC2 key pair name for SSH access."
  type        = string
}

variable "ssh_allowed_cidr_blocks" {
  description = "CIDR blocks allowed to SSH into the API host."
  type        = list(string)
}

variable "api_allowed_cidr_blocks" {
  description = "CIDR blocks allowed to reach the API port."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "api_port" {
  description = "Public API port."
  type        = number
  default     = 8080
}

variable "container_image" {
  description = "Backend container image reference pulled by EC2."
  type        = string
}

variable "registry_server" {
  description = "Container registry server."
  type        = string
  default     = "ghcr.io"
}

variable "registry_username" {
  description = "Optional registry username for private images."
  type        = string
  default     = null
  sensitive   = true
}

variable "registry_token" {
  description = "Optional registry token for private images."
  type        = string
  default     = null
  sensitive   = true
}

variable "database_url" {
  description = "Supabase PostgreSQL connection string used by the API."
  type        = string
  sensitive   = true
}

variable "demo_jwt_secret" {
  description = "JWT signing secret for demo auth."
  type        = string
  sensitive   = true
}

variable "allowed_origins" {
  description = "CORS origins allowed by the API."
  type        = list(string)
  default     = []
}

variable "run_migrations_on_boot" {
  description = "Run backend migrations and seed demo data during EC2 bootstrap."
  type        = bool
  default     = true
}

variable "root_volume_size_gb" {
  description = "Root EBS volume size."
  type        = number
  default     = 16
}
