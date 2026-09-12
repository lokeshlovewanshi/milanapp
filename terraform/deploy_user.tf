# ---------------------------------------------------------------------------
# Static credentials for GitHub Actions.
#
# The OIDC role in codedeploy.tf is the safer option - it issues short-lived
# credentials per workflow run and there is no secret to leak. This IAM user
# exists because you asked for a plain access key in GitHub Secrets.
#
# Two consequences worth knowing:
#   - the secret is written to terraform.tfstate in plaintext, so that file
#     must stay out of git and ideally live in the encrypted S3 backend
#   - the key never expires on its own; rotate it with
#     `terraform taint aws_iam_access_key.deploy && terraform apply`
#
# The policy below is the narrowest set that still lets a deploy work: put an
# object in the artifact bucket, and ask SSM to run the install script on the
# one tagged instance. It cannot create instances, read the database, or touch
# the photo bucket.
# ---------------------------------------------------------------------------

resource "aws_iam_user" "deploy" {
  name = "${local.name}-github-deploy"
  path = "/service/"

  tags = { Purpose = "GitHub Actions deployment" }
}

resource "aws_iam_user_policy" "deploy" {
  name = "${local.name}-github-deploy"
  user = aws_iam_user.deploy.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "UploadReleaseBundles"
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject"]
        Resource = "${aws_s3_bucket.artifacts.arn}/*"
      },
      {
        Sid      = "ListArtifactBucket"
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.artifacts.arn
      },
      {
        # Scoped to this one instance by ARN. Without the Resource block a
        # leaked key could run arbitrary commands as root on every instance in
        # the account.
        Sid    = "RunDeployOnTheApiInstance"
        Effect = "Allow"
        Action = ["ssm:SendCommand"]
        Resource = [
          aws_instance.app.arn,
          "arn:aws:ssm:${var.region}::document/AWS-RunShellScript"
        ]
      },
      {
        # Reading command results needs no resource scope - the caller can only
        # see invocations it started.
        Sid    = "ReadCommandResults"
        Effect = "Allow"
        Action = [
          "ssm:GetCommandInvocation",
          "ssm:ListCommandInvocations",
          "ssm:ListCommands"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_access_key" "deploy" {
  user = aws_iam_user.deploy.name
}

output "github_aws_access_key_id" {
  description = "Add as the AWS_ACCESS_KEY_ID repository secret."
  value       = aws_iam_access_key.deploy.id
}

output "github_aws_secret_access_key" {
  description = "Add as AWS_SECRET_ACCESS_KEY. Read with: terraform output -raw github_aws_secret_access_key"
  value       = aws_iam_access_key.deploy.secret
  sensitive   = true
}

output "api_instance_id" {
  description = "Add as the EC2_INSTANCE_ID repository secret."
  value       = aws_instance.app.id
}
