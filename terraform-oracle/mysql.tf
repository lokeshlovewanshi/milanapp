# Always Free managed MySQL (HeatWave) - one per tenancy, home region only,
# 50GB fixed storage, single node (standalone, no HA). This is a completely
# separate free allocation from the Ampere A1 compute limit in compute.tf, so
# using it doesn't cost any of that budget.
#
# If this fails with a capacity/limit error, MySQL.Free may not be available
# in local.availability_domain (data.oci_identity_availability_domains.ads,
# defined in compute.tf) - try a different index there, same as the Ampere A1
# fallback.
resource "oci_mysql_mysql_db_system" "dev" {
  compartment_id      = var.compartment_ocid
  availability_domain = local.availability_domain
  subnet_id           = oci_core_subnet.private.id
  shape_name          = "MySQL.Free"

  display_name            = "${var.project}-mysql"
  admin_username          = var.db_username
  admin_password          = var.db_password
  data_storage_size_in_gb = 50
  is_highly_available     = false

  lifecycle {
    # STRICT: never destroy the database. All production data lives here.
    # To change admin_password, do it via the OCI Console, not Terraform.
    prevent_destroy = true
    ignore_changes  = [admin_password]
  }
}
