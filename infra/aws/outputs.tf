output "backend_public_ip" {
  description = "Elastic IP attached to the API host."
  value       = aws_eip.api.public_ip
}

output "backend_api_url" {
  description = "Public API origin for frontend FOODLINK_API_ORIGIN."
  value       = "http://${aws_eip.api.public_ip}:${var.api_port}"
}

output "ssh_command" {
  description = "SSH command template for the API host."
  value       = "ssh ec2-user@${aws_eip.api.public_ip}"
}
