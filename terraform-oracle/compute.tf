data "oci_identity_availability_domains" "ads" {
  compartment_id = var.tenancy_ocid
}

# ap-mumbai-1 (this tenancy's home region) has exactly one availability
# domain, so there is no alternate AD to fall back to if capacity runs out
# here - unlike multi-AD regions. If "Out of host capacity" keeps happening,
# the mitigation is smaller/more/retried instance requests (see
# instance_count/instance_ocpus in variables.tf), not a different AD index.
locals {
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
}

data "oci_core_images" "ubuntu_arm" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "24.04"
  shape                    = "VM.Standard.A1.Flex"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

# AMD image for the bastion VM (VM.Standard.E2.1.Micro is x86-based and part
# of the Always Free AMD micro allocation - separate from the A1 Ampere
# budget that the app instances consume).
data "oci_core_images" "ubuntu_amd" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "24.04"
  shape                    = "VM.Standard.E2.1.Micro"
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

# ---------------------------------------------------------------------------
# App instances - PROTECTED. These must never be destroyed; they are Always
# Free Ampere A1 instances and Oracle will not guarantee capacity to recreate
# them. All networking and security changes are made on the surrounding
# resources (security lists, route tables, LB) - never on these instances.
#
# NOTE: assign_public_ip is set to false to document intent. Because of the
# prevent_destroy lifecycle guard below, Terraform cannot apply this change
# without a destroy; do it manually in the OCI Console (Attached VNICs →
# primary VNIC → IPv4 Addresses → Edit → No public IP).
# ---------------------------------------------------------------------------
resource "oci_core_instance" "dev" {
  count = var.instance_count

  compartment_id      = var.compartment_ocid
  availability_domain = local.availability_domain
  display_name        = "${var.project}-${count.index}"
  shape               = "VM.Standard.A1.Flex"

  shape_config {
    ocpus         = var.instance_ocpus
    memory_in_gbs = var.instance_memory_gb
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.public.id
    assign_public_ip = true
    hostname_label   = "lovewanshi-milan-dev-${count.index}"
  }

  source_details {
    source_type             = "image"
    source_id               = data.oci_core_images.ubuntu_arm.images[0].id
    boot_volume_size_in_gbs = var.instance_boot_volume_gb
  }

  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
    user_data = base64encode(templatefile("${path.module}/cloud-init.sh", {
      db_name     = var.db_name
      db_username = var.db_username
      db_password = var.db_password
      db_host     = oci_mysql_mysql_db_system.dev.endpoints[0].ip_address
      db_port     = oci_mysql_mysql_db_system.dev.endpoints[0].port
    }))
  }

  lifecycle {
    # STRICT: refuse to destroy these instances under any circumstances.
    # Losing an Always Free A1 instance means it may never be recreated.
    prevent_destroy = true

    # Ignore changes that would force a replace (e.g. image ID drift from
    # data source lookups) so that a routine terraform apply never queues a
    # destroy even when prevent_destroy would catch it.
    ignore_changes = [
      source_details,
      create_vnic_details,
      metadata,
    ]
  }
}
