resource "oci_core_vcn" "main" {
  compartment_id = var.compartment_ocid
  display_name   = "${var.project}-vcn"
  cidr_blocks    = ["10.30.0.0/16"]
  dns_label      = "lovewanshidev"
}

resource "oci_core_internet_gateway" "main" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.project}-igw"
  enabled        = true
}

# ---------------------------------------------------------------------------
# NAT Gateway - lets app instances reach the internet outbound (S3 signed
# URLs, AWS SDK calls, OS updates) without having a public IP themselves.
# ---------------------------------------------------------------------------
resource "oci_core_nat_gateway" "main" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.project}-nat"
}

# ---------------------------------------------------------------------------
# Route tables
# ---------------------------------------------------------------------------

# Public subnets (LB + bastion) - route internet traffic through IGW.
resource "oci_core_route_table" "public" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.project}-public-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.main.id
  }
}

# App subnet (instances) - outbound via NAT so instances can reach S3, AWS,
# OS package mirrors etc. without a public IP. Inbound only from LB/bastion.
resource "oci_core_route_table" "app" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.project}-app-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_nat_gateway.main.id
  }
}

# ---------------------------------------------------------------------------
# LB + Bastion public subnet security list (10.30.3.0/24)
# Faces the internet: allows HTTP/HTTPS for LB, SSH for bastion VM.
# ---------------------------------------------------------------------------
resource "oci_core_security_list" "lb" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.project}-lb-sl"

  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }

  # HTTPS - LB listener
  ingress_security_rules {
    source   = "0.0.0.0/0"
    protocol = "6" # TCP
    tcp_options {
      min = 443
      max = 443
    }
  }

  # HTTP - LB listener (for ACME challenge and HTTP → HTTPS redirect)
  ingress_security_rules {
    source   = "0.0.0.0/0"
    protocol = "6"
    tcp_options {
      min = 80
      max = 80
    }
  }

  # SSH - Bastion VM only. Allowed CIDRs from var.bastion_ssh_allowed_cidrs.
  # Run ./allow-my-ip.sh to automatically point this rule at your current PC's IP.
  dynamic "ingress_security_rules" {
    for_each = var.bastion_ssh_allowed_cidrs
    content {
      source   = ingress_security_rules.value
      protocol = "6" # TCP
      tcp_options {
        min = 22
        max = 22
      }
    }
  }

  # ICMP type 3/4 - path MTU discovery (large TLS handshakes hang without it)
  ingress_security_rules {
    source   = "0.0.0.0/0"
    protocol = "1" # ICMP
    icmp_options {
      type = 3
      code = 4
    }
  }
}

# LB + Bastion public subnet. Both the flexible LB and the bastion VM live
# here so their public IPs stay separate from the app instances.
resource "oci_core_subnet" "lb" {
  compartment_id             = var.compartment_ocid
  vcn_id                     = oci_core_vcn.main.id
  display_name               = "${var.project}-lb-subnet"
  cidr_block                 = "10.30.3.0/24"
  route_table_id             = oci_core_route_table.public.id
  security_list_ids          = [oci_core_security_list.lb.id]
  dns_label                  = "lbsubnet"
  prohibit_public_ip_on_vnic = false
}

# ---------------------------------------------------------------------------
# App subnet security list (10.30.1.0/24) - instances live here.
# No public IPs on instances. Inbound traffic accepted only from the LB
# subnet (port 8080 for app, port 22 for bastion SSH). Everything else is
# blocked at the security list even if someone guessed a private IP.
# ---------------------------------------------------------------------------
resource "oci_core_security_list" "public" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.project}-app-sl"

  # Outbound: unrestricted so instances can call AWS S3 (pre-signed URLs,
  # SDK), reach Let's Encrypt ACME endpoint, pull OS updates via NAT, and
  # talk to HeatWave MySQL on the private subnet.
  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }

  # Spring Boot JAR (port 8080) - only from the LB subnet. The LB health
  # checker and forwarded traffic both originate from 10.30.3.0/24.
  ingress_security_rules {
    source   = "10.30.3.0/24" # LB + bastion subnet
    protocol = "6"             # TCP
    tcp_options {
      min = 8080
      max = 8080
    }
  }

  # SSH - from OCI Managed Bastion and intra-VCN
  ingress_security_rules {
    source   = "10.30.0.0/16" # VCN CIDR
    protocol = "6"
    tcp_options {
      min = 22
      max = 22
    }
  }

  # ICMP path MTU discovery
  ingress_security_rules {
    source   = "0.0.0.0/0"
    protocol = "1"
    icmp_options {
      type = 3
      code = 4
    }
  }
}

# App subnet - instances stay here. Route table now points to NAT (not IGW)
# so outbound S3/AWS calls still work without a public IP.
resource "oci_core_subnet" "public" {
  compartment_id             = var.compartment_ocid
  vcn_id                     = oci_core_vcn.main.id
  display_name               = "${var.project}-public-subnet"
  cidr_block                 = "10.30.1.0/24"
  route_table_id             = oci_core_route_table.app.id
  security_list_ids          = [oci_core_security_list.public.id]
  dns_label                  = "public"
  prohibit_public_ip_on_vnic = false
}

# ---------------------------------------------------------------------------
# Private subnet - MySQL HeatWave only. No changes from original.
# ---------------------------------------------------------------------------

resource "oci_core_service_gateway" "main" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.project}-sgw"

  services {
    service_id = data.oci_core_services.all_oci_services.services[0].id
  }
}

data "oci_core_services" "all_oci_services" {
}

resource "oci_core_route_table" "private" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.project}-private-rt"

  route_rules {
    destination       = data.oci_core_services.all_oci_services.services[0].cidr_block
    destination_type  = "SERVICE_CIDR_BLOCK"
    network_entity_id = oci_core_service_gateway.main.id
  }
}

# Only the app subnet (10.30.1.0/24) and the LB subnet (for bastion DB
# tunnels, 10.30.3.0/24) may reach MySQL - never 0.0.0.0/0.
resource "oci_core_security_list" "private" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "${var.project}-private-sl"

  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }

  # App instances → MySQL
  ingress_security_rules {
    source   = oci_core_subnet.public.cidr_block # 10.30.1.0/24
    protocol = "6"
    tcp_options {
      min = 3306
      max = 3306
    }
  }

  ingress_security_rules {
    source   = oci_core_subnet.public.cidr_block
    protocol = "6"
    tcp_options {
      min = 33060 # MySQL X Protocol
      max = 33060
    }
  }

  # Bastion VM → MySQL (for local dev DB tunnel via SSH port-forwarding)
  ingress_security_rules {
    source   = "10.30.3.0/24" # LB + bastion subnet
    protocol = "6"
    tcp_options {
      min = 3306
      max = 3306
    }
  }

  ingress_security_rules {
    source   = "10.30.3.0/24"
    protocol = "6"
    tcp_options {
      min = 33060
      max = 33060
    }
  }
}

resource "oci_core_subnet" "private" {
  compartment_id             = var.compartment_ocid
  vcn_id                     = oci_core_vcn.main.id
  display_name               = "${var.project}-private-subnet"
  cidr_block                 = "10.30.2.0/24"
  route_table_id             = oci_core_route_table.private.id
  security_list_ids          = [oci_core_security_list.private.id]
  dns_label                  = "private"
  prohibit_public_ip_on_vnic = true
}
