# ---------------------------------------------------------------------------
# Lambdas: image compression and kundali generation.
#
# The split between this file and .github/workflows/deploy-lambdas.yml is
# deliberate, and it is the usual one for serverless:
#
#   Terraform owns the SHAPE   - the role, the functions, the S3 trigger, log
#                                retention, concurrency limits
#   CI owns the CODE           - the handler zip and the dependency layer,
#                                which change on every merge
#
# Mixing them means either Terraform reverting CI's code on the next apply, or
# CI needing permission to rewrite infrastructure. Hence the lifecycle blocks
# below: Terraform creates each function with a placeholder and then stops
# caring what code is in it.
# ---------------------------------------------------------------------------

locals {
  lambda_functions = {
    image_compression = {
      name = "${local.name}-image-compression"
      # Sharp runs on arm64 with libvips native prebuilt binaries for high performance.
      architecture = "arm64"
      runtime      = "nodejs20.x"
      timeout      = 30
      # Lambda scales CPU with memory; 1024MB provides multi-core acceleration for Sharp.
      memory = 1024
    }
    kundali_match = {
      # Pure stdlib - every koota is a table lookup or small arithmetic on two
      # integers, so there is no layer and no ephemeris. That is also why it
      # can stay on arm64/3.12 while kundali cannot.
      architecture = "arm64"
      runtime      = "python3.12"
      name         = "${local.name}-kundali-match"
      timeout      = 5
      memory       = 256
    }
    welcome_email = {
      name         = "${local.name}-welcome-email"
      architecture = "arm64"
      runtime      = "python3.12"
      timeout      = 15
      memory       = 256
    }
    kundali = {
      name = "${local.name}-kundali"
      # x86_64 and 3.11, forced by pyswisseph: it publishes no aarch64 wheels
      # at all, and none for 3.12 on any platform. Building it from source in
      # CI would need a Lambda-matching container for a C extension - more
      # machinery than picking the architecture its wheels exist for.
      architecture = "x86_64"
      runtime      = "python3.11"
      timeout      = 10
      memory       = 512
    }
  }
}

# --- execution role --------------------------------------------------------

resource "aws_iam_role" "lambda" {
  name = "${local.name}-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "lambda_photos" {
  name = "${local.name}-lambda-photos"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      # Object-level only, and only this bucket. The function reads an upload
      # and writes back a compressed copy plus a thumbnail; it has no reason to
      # list the bucket, delete anything, or see any other bucket.
      Sid      = "ReadAndWriteProfilePhotos"
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:PutObject"]
      Resource = "arn:aws:s3:::${var.s3_photo_bucket}/*"
    }]
  })
}

# --- log groups ------------------------------------------------------------
#
# Created explicitly rather than left to Lambda. An implicitly created group
# has no expiry, so logs accumulate and bill forever - and being outside
# Terraform, a `destroy` leaves them behind.

resource "aws_cloudwatch_log_group" "lambda" {
  for_each = local.lambda_functions

  name              = "/aws/lambda/${each.value.name}"
  retention_in_days = var.lambda_log_retention_days
}

# --- placeholder package ---------------------------------------------------
#
# A function cannot be created without code, but the real code comes from CI.
# This is a stub that exists only so the resource can be created; the lifecycle
# block below then ignores every subsequent change to it.

data "archive_file" "lambda_placeholder" {
  type        = "zip"
  output_path = "${path.module}/.terraform/lambda-placeholder.zip"

  source {
    filename = "lambda_function.py"
    content  = <<-PY
      def lambda_handler(event, context):
          # Replaced on the first CI deploy. If you are reading this in a live
          # invocation, deploy-lambdas.yml has never run successfully.
          raise RuntimeError("Placeholder - no code has been deployed yet")
    PY
  }
}

# --- functions -------------------------------------------------------------

resource "aws_lambda_function" "this" {
  for_each = local.lambda_functions

  function_name = each.value.name
  role          = aws_iam_role.lambda.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = each.value.runtime
  # Per function, because the dependency wheels decide it - see the locals
  # block. The CI layer build must match, or the layer imports fine locally
  # and fails inside Lambda.
  architectures = [each.value.architecture]

  timeout     = each.value.timeout
  memory_size = each.value.memory

  filename         = data.archive_file.lambda_placeholder.output_path
  source_code_hash = data.archive_file.lambda_placeholder.output_base64sha256

  # A safety valve, not a performance setting: image_compression writes back to
  # the bucket that triggers it, so a cap limits how fast a failed recursion
  # guard could run away.
  #
  # Defaults to -1 (no reservation) because this account's total Lambda
  # concurrency is 10 and AWS rejects any reservation leaving fewer than 10
  # unreserved. The account limit is doing the same job in the meantime - a
  # runaway can reach 10 executions and no further. See the variable.
  reserved_concurrent_executions = var.lambda_reserved_concurrency

  lifecycle {
    # CI owns all of these. Without this block, every `terraform apply` would
    # roll the deployed code back to the placeholder and strip the layer.
    ignore_changes = [
      filename,
      source_code_hash,
      layers,
      environment,
    ]
  }

  depends_on = [aws_cloudwatch_log_group.lambda]
}

# --- S3 trigger for image compression --------------------------------------

resource "aws_lambda_permission" "photos_invoke" {
  statement_id  = "AllowExecutionFromS3"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this["image_compression"].function_name
  principal     = "s3.amazonaws.com"
  source_arn    = "arn:aws:s3:::${var.s3_photo_bucket}"

  # Without this, another account could point their bucket at this function.
  source_account = data.aws_caller_identity.current.account_id
}

# Only created when explicitly enabled. This is the one resource here that can
# cost real money if the handler misbehaves, because the function writes into
# the bucket that triggers it - so turning it on is a deliberate act after
# watching the first invocations, not something a first `apply` does for you.
resource "aws_s3_bucket_notification" "photos" {
  count = var.enable_photo_compression_trigger ? 1 : 0

  bucket = var.s3_photo_bucket

  lambda_function {
    lambda_function_arn = aws_lambda_function.this["image_compression"].arn
    events              = ["s3:ObjectCreated:*"]

    # No filter_prefix on purpose: photos are stored at the bucket root with
    # UUID keys and usually no extension, so there is nothing to filter on.
    # Recursion is prevented in the handler instead - a metadata marker on
    # everything it writes, plus skipping the thumbs/ prefix.
  }

  depends_on = [aws_lambda_permission.photos_invoke]
}

# --- API permissions -------------------------------------------------------
#
# The app server generates birth charts by invoking the kundali function. It is
# not given invoke on image_compression: that one is driven by S3 and the API
# has no reason to call it, so leaving it out means a compromised API cannot
# drive arbitrary writes into the photo bucket through it.

resource "aws_iam_role_policy" "app_invoke_kundali" {
  name = "${local.name}-invoke-kundali"
  role = aws_iam_role.app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["lambda:InvokeFunction"]
      Resource = [
        aws_lambda_function.this["kundali"].arn,
        aws_lambda_function.this["kundali_match"].arn,
      ]
    }]
  })
}

# --- CI permissions --------------------------------------------------------
#
# Extends the GitHub Actions user so deploy-lambdas.yml can do its job, and no
# more. Notably it can update code and publish layers, but cannot create or
# delete functions - those are Terraform's, and a CI key that can delete a
# production function is a worse problem than a manual apply.

resource "aws_iam_user_policy" "deploy_lambdas" {
  name = "${local.name}-github-deploy-lambdas"
  user = aws_iam_user.deploy.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DeployFunctionCode"
        Effect = "Allow"
        Action = [
          "lambda:GetFunction",
          "lambda:GetFunctionConfiguration",
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:InvokeFunction",
        ]
        Resource = [for f in aws_lambda_function.this : f.arn]
      },
      {
        # Layer versions are immutable and get a new version each publish, so
        # this cannot be scoped to a specific version ARN.
        Sid    = "PublishDependencyLayers"
        Effect = "Allow"
        Action = ["lambda:PublishLayerVersion", "lambda:GetLayerVersion"]
        Resource = [
          "arn:aws:lambda:${var.region}:${data.aws_caller_identity.current.account_id}:layer:${local.name}-*"
        ]
      },
    ]
  })
}

# --- outputs ---------------------------------------------------------------

output "lambda_function_names" {
  description = "Pass these to the CI workflow if you rename anything."
  value       = { for k, f in aws_lambda_function.this : k => f.function_name }
}

output "lambda_execution_role_arn" {
  description = "Not needed by CI any more - Terraform creates the functions."
  value       = aws_iam_role.lambda.arn
}

output "photo_compression_trigger" {
  value = var.enable_photo_compression_trigger ? "ENABLED on ${var.s3_photo_bucket}" : "disabled - set enable_photo_compression_trigger = true once you have verified the recursion guard"
}
