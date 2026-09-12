variable "project" {
  description = "Prefix for every resource name."
  type        = string
  default     = "gahoi-milan"
}

variable "region" {
  description = "Must match the S3 photo bucket, or every upload pays a cross-region hop."
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  type    = string
  default = "prod"
}

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

variable "db_name" {
  type    = string
  default = "marriage_portal"
}

variable "db_username" {
  type    = string
  default = "admin"
}

variable "db_password" {
  description = "Set via TF_VAR_db_password, never in a .tfvars file that git can see."
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "db.t3.micro is the only free-tier-eligible size."
  type        = string
  default     = "db.t3.micro"
}

# ---------------------------------------------------------------------------
# Compute
# ---------------------------------------------------------------------------

variable "instance_type" {
  description = <<-EOT
    t3.small: 2 vCPU, 2 GB RAM, about $16.40/month in ap-south-1.

    Not free-tier eligible - that covers t2.micro and t3.micro only - which is
    fine while promotional credits are paying, but worth remembering when they
    expire.

    The 2 GB is the point. On a 1 GB t3.micro the JVM gets roughly 400 MB after
    the OS and nginx: enough to run, not enough to run comfortably, and swap
    becomes part of normal operation. 2 GB lets the heap go to 1 GB.

    The systemd unit is tuned to match (-Xmx1g, G1GC, MemoryMax=1600M).
    Changing this back to t3.micro means changing those too.
  EOT
  type        = string
  default     = "t3.small"
}

variable "key_pair_name" {
  description = "Existing EC2 key pair for SSH. Create it in the console first."
  type        = string
}

variable "ssh_allowed_cidr" {
  description = <<-EOT
    Your public IP as a /32, e.g. "203.0.113.4/32". Find it with:
      curl -s https://checkip.amazonaws.com

    Opening 22 to 0.0.0.0/0 attracts continuous credential-stuffing within
    minutes of the instance booting.
  EOT
  type        = string

  validation {
    condition     = var.ssh_allowed_cidr != "0.0.0.0/0"
    error_message = "Refusing to open SSH to the whole internet. Use your own IP with /32."
  }
}

# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

variable "api_domain" {
  description = <<-EOT
    Hostname the API is served on. A subdomain of the registered domain, not
    the apex: the apex is left free for a marketing site or a Play Store
    landing page later, and moving an apex record afterwards means reissuing
    the certificate.
  EOT
  type        = string
  default     = "api.gahoimarriage.in"
}

variable "s3_photo_bucket" {
  description = "Existing bucket holding profile photos. Terraform grants access, it does not create it."
  type        = string
  default     = "gahoi-milan-photos"
}

variable "github_repository" {
  description = "owner/repo, for the OIDC trust policy."
  type        = string
  default     = "harshsijariya/milanapp"
}

variable "github_branch" {
  description = "Only this branch may assume the deploy role."
  type        = string
  default     = "main"
}

variable "create_github_oidc_provider" {
  description = <<-EOT
    Create the GitHub OIDC provider, or reuse an existing one.

    An AWS account may hold only one provider per URL. If another project
    already created it, set this to false and Terraform will look it up
    instead of failing with EntityAlreadyExists.
  EOT
  type        = bool
  default     = true
}

# ---------------------------------------------------------------------------
# Values stored in Secrets Manager
#
# All sensitive ones are marked sensitive so Terraform never prints them, and
# all default to "" so a first apply works before you have every value. The
# app fails fast on a blank required value, which is the right time to find out.
#
# Pass them through the environment rather than terraform.tfvars:
#   export TF_VAR_jwt_secret="$(openssl rand -base64 48)"
# ---------------------------------------------------------------------------

variable "jwt_secret" {
  description = "Must be NEW - the old one is public in git history."
  type        = string
  sensitive   = true
  default     = ""
}

variable "notifications_admin_secret" {
  description = "Guards the broadcast endpoint. Blank disables it."
  type        = string
  sensitive   = true
  default     = ""
}

variable "mail_username" {
  type    = string
  default = ""
}

variable "mail_password" {
  description = "Gmail App Password, not the account password."
  type        = string
  sensitive   = true
  default     = ""
}

variable "google_oauth_client_ids" {
  description = "Comma-separated Web + Android IDs. Public values."
  type        = string
  default     = ""
}

variable "firebase_enabled" {
  type    = bool
  default = false
}

variable "cors_allowed_origins" {
  description = "Only matters once a web build exists."
  type        = string
  default     = "*"
}

variable "lambda_log_retention_days" {
  description = <<-EOT
    How long Lambda logs are kept.

    Set explicitly because a log group Lambda creates for itself never expires,
    so it bills forever and survives a `terraform destroy`.
  EOT
  type        = number
  default     = 14
}

variable "lambda_reserved_concurrency" {
  description = <<-EOT
    Concurrency cap on each Lambda. -1 means no reservation.

    Intended as a safety valve rather than a performance setting: the image
    compression function writes back to the bucket that triggers it, so a cap
    limits how fast a failed recursion guard could run away.

    Defaults to -1 because this account's total Lambda concurrency is 10, and
    AWS refuses any reservation that would leave fewer than 10 unreserved -
    so reserving even 1 is rejected outright.

    That is less alarming than it sounds. The account limit is itself the cap:
    a runaway loop can reach 10 concurrent executions and no further. Once you
    raise the account limit (Service Quotas -> Lambda -> Concurrent
    executions), set this to something small and the per-function valve comes
    back.
  EOT
  type        = number
  default     = -1
}

variable "enable_photo_compression_trigger" {
  description = <<-EOT
    Whether to wire the S3 ObjectCreated notification to the compression
    Lambda.

    Off by default, deliberately. This is the one resource here that can cost
    real money if the handler misbehaves - it writes into the bucket that
    triggers it. Deploy the function, invoke it by hand on one object, confirm
    it does not re-trigger, then set this true.
  EOT
  type        = bool
  default     = false
}

variable "cloudfront_public_key" {
  description = <<-EOT
    PEM public key CloudFront uses to verify signed photo URLs.

    The private half is a deploy secret and never appears here - it lives in
    the API's environment file and, once CI takes over, in a GitHub secret.
    See cloudfront.tf for the rotation procedure.
  EOT
  type        = string
}
