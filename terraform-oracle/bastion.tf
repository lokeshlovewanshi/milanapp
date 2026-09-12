# ---------------------------------------------------------------------------
# OCI Managed Bastion (Free, native serverless service - 0 GB storage).
#
# Provides secure, ephemeral SSH and port-forwarding sessions into the
# private app and database subnets without running a dedicated Bastion VM.
# ---------------------------------------------------------------------------
resource "oci_bastion_bastion" "main" {
  bastion_type                 = "STANDARD"
  compartment_id               = var.compartment_ocid
  target_subnet_id             = oci_core_subnet.public.id
  name                         = "${var.project}-bastion"
  client_cidr_block_allow_list = var.bastion_ssh_allowed_cidrs
  max_session_ttl_in_seconds   = 10800 # 3 hours
}

