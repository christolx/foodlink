output "project_id" {
  description = "Vercel project ID."
  value       = vercel_project.frontend.id
}

output "project_name" {
  description = "Vercel project name."
  value       = vercel_project.frontend.name
}

output "frontend_domain" {
  description = "Configured custom frontend domain, when provided."
  value       = try(vercel_project_domain.frontend[0].domain, null)
}
