# ---------------------------------------------------------------------------
# OCI account/auth - all come from an API signing key you generate yourself
# in the OCI console (Profile -> User Settings -> API Keys -> Add API Key).
# Never hardcode these; set via terraform.tfvars (gitignored) or TF_VAR_*.
# ---------------------------------------------------------------------------

variable "tenancy_ocid" {
  description = "Tenancy OCID, shown on the API Keys page when you add a key."
  type        = string
}

variable "user_ocid" {
  description = "Your user OCID, same page as tenancy_ocid."
  type        = string
}

variable "fingerprint" {
  description = "Fingerprint of the API signing key, shown after you add it."
  type        = string
}

variable "oci_private_key_path" {
  description = "Path to the private key half of the API signing key (the .pem OCI console had you download or generate)."
  type        = string
}

variable "region" {
  description = "e.g. ap-mumbai-1, ap-hyderabad-1 - whichever region you created the tenancy in."
  type        = string
}

variable "compartment_ocid" {
  description = "Compartment to create resources in. The root compartment OCID (same as tenancy_ocid) works fine for a single dev box."
  type        = string
}

# ---------------------------------------------------------------------------
# Project
# ---------------------------------------------------------------------------

variable "project" {
  description = "Prefix for every resource name."
  type        = string
  default     = "lovewanshi-milan-dev"
}

variable "ssh_public_key_path" {
  description = "Path to the SSH public key that will be allowed to log into the instances and bastion as 'ubuntu'."
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "bastion_ssh_allowed_cidrs" {
  description = "List of IPv4 CIDR blocks allowed to SSH into the bastion VM (port 22). Default is 0.0.0.0/0, or run ./allow-my-ip.sh to restrict to your PC."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# ---------------------------------------------------------------------------
# Compute - Always Free Ampere A1 allows up to 4 OCPU / 24GB total across all
# A1 instances in a tenancy. Oracle quietly halved this from 4 OCPU/24GB to
# 2 OCPU/12GB on 2026-06-15 with no announcement, and started terminating
# Always Free instances still over the new limit on 2026-08-18 - so this
# targets the current real ceiling, not the old commonly-cited one. Recheck
# https://www.oracle.com/cloud/free/ before raising these.
# ---------------------------------------------------------------------------

variable "instance_count" {
  description = "Split across smaller instances rather than one big one - smaller shape requests often succeed when Ampere A1 capacity can't fit the full budget as a single instance."
  type        = number
  default     = 2
}

variable "instance_ocpus" {
  description = "Per instance. instance_count x this must not exceed the 2 OCPU Always Free ceiling."
  type        = number
  default     = 1
}

variable "instance_memory_gb" {
  description = "Per instance. instance_count x this must not exceed the 12GB Always Free ceiling."
  type        = number
  default     = 6
}

variable "instance_boot_volume_gb" {
  description = "Always Free covers up to 200GB total boot volume across instances."
  type        = number
  default     = 100
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
  default = "lovewanshi_dev"
}

variable "db_password" {
  description = "Set via TF_VAR_db_password, never in a committed .tfvars file."
  type        = string
  sensitive   = true
}

# ---------------------------------------------------------------------------
# SSL / TLS certificate for the Load Balancer HTTPS listener.
#
# Generate a 90-day Let's Encrypt certificate using the DNS-01 challenge
# (no need to expose port 80 on your laptop):
#
#   brew install certbot
#   sudo certbot certonly --manual --preferred-challenges dns \
#     -d api.lovewanshisamaj.in
#
# Follow the prompt to add a _acme-challenge TXT record in your DNS provider,
# then wait ~30 seconds for propagation before pressing Enter.
#
# After success the files are at:
#   /etc/letsencrypt/live/api.lovewanshisamaj.in/fullchain.pem  <- ssl_certificate_pem
#   /etc/letsencrypt/live/api.lovewanshisamaj.in/privkey.pem    <- ssl_private_key_pem
#
# Paste the file contents (with literal \n newlines) into terraform.tfvars:
#   ssl_certificate_pem = <<-EOT
#     -----BEGIN CERTIFICATE-----
#     ...
#     -----END CERTIFICATE-----
#   EOT
#   ssl_private_key_pem = <<-EOT
#     -----BEGIN PRIVATE KEY-----
#     ...
#     -----END PRIVATE KEY-----
#   EOT
#
# Leave both empty ("") to skip HTTPS and run HTTP-only during bootstrap.
# ---------------------------------------------------------------------------

variable "ssl_certificate_pem" {
  description = "Full-chain PEM from Let's Encrypt (contents of fullchain.pem). Leave empty to skip HTTPS listener."
  type        = string
  sensitive   = true
  default     = ""
}

variable "ssl_private_key_pem" {
  description = "Private key PEM from Let's Encrypt (contents of privkey.pem). Leave empty to skip HTTPS listener."
  type        = string
  sensitive   = true
  default     = ""
}

variable "domain_name" {
  description = "Domain name for the SSL certificate, e.g. api.lovewanshisamaj.in."
  type        = string
  default     = "api.lovewanshisamaj.in"
}
