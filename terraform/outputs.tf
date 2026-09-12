output "api_public_ip" {
  description = "Point your domain's A record at this."
  value       = aws_eip.app.public_ip
}

output "ssh_command" {
  value = "ssh -i ~/.ssh/${var.key_pair_name}.pem ubuntu@${aws_eip.app.public_ip}"
}

output "database_endpoint" {
  description = "Private hostname; reachable only from the app server."
  value       = local.db_endpoint
}

output "database_jdbc_url" {
  description = "Paste into DB_URL in /etc/gahoi-milan/gahoi-milan.env."
  value       = local.db_url
}

output "artifacts_bucket" {
  description = "Set as AWS_S3_ARTIFACT_BUCKET in the GitHub workflow."
  value       = aws_s3_bucket.artifacts.id
}

output "codedeploy_application" {
  value = aws_codedeploy_app.api.name
}

output "codedeploy_deployment_group" {
  value = aws_codedeploy_deployment_group.api.deployment_group_name
}

output "github_actions_role_arn" {
  description = "Add as the AWS_DEPLOY_ROLE_ARN repository secret or variable."
  value       = aws_iam_role.github_actions.arn
}

output "next_steps" {
  value = <<-EOT

    1. GoDaddy DNS: add an A record for "api" -> ${aws_eip.app.public_ip}

       Wait for `dig +short ${var.api_domain}` to answer, then on the server:
         sudo certbot --nginx -d ${var.api_domain}

    2. Fill in the secrets:
         ssh -i ~/.ssh/${var.key_pair_name}.pem ubuntu@${aws_eip.app.public_ip}
         sudo nano /etc/gahoi-milan/gahoi-milan.env
         sudo systemctl restart gahoi-milan

    3. In GitHub -> Settings -> Secrets and variables -> Actions, add:
         AWS_DEPLOY_ROLE_ARN   = ${aws_iam_role.github_actions.arn}
         AWS_ARTIFACT_BUCKET   = ${aws_s3_bucket.artifacts.id}

    4. Load the schema from the server (RDS is private):
         mysql -h ${local.db_endpoint} -u ${var.db_username} -p ${var.db_name} < schema.sql

    5. Push to ${var.github_branch} - the workflow builds and deploys.
  EOT
}
