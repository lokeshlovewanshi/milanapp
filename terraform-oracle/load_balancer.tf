# Always Free OCI Flexible Load Balancer. Keeping both limits at 10 Mbps
# ensures it remains inside the Always Free entitlement in the home region.
resource "oci_load_balancer_load_balancer" "app" {
  compartment_id = var.compartment_ocid
  display_name   = "${var.project}-lb"
  shape          = "flexible"

  shape_details {
    minimum_bandwidth_in_mbps = 10
    maximum_bandwidth_in_mbps = 10
  }

  subnet_ids = [oci_core_subnet.lb.id]
  is_private = false
}

resource "oci_load_balancer_backend_set" "app" {
  name             = "${var.project}-backends"
  load_balancer_id = oci_load_balancer_load_balancer.app.id
  policy           = "ROUND_ROBIN"

  health_checker {
    protocol          = "HTTP"
    url_path          = "/actuator/health"
    port              = 80
    return_code       = 200
    interval_ms       = 10000
    timeout_in_millis = 3000
    retries           = 3
  }
}

# Nginx on each VM terminates the local HTTP connection and proxies to Spring
# Boot. The public load balancer sends traffic to port 80 on each private IP.
resource "oci_load_balancer_backend" "primary" {
  load_balancer_id = oci_load_balancer_load_balancer.app.id
  backendset_name  = oci_load_balancer_backend_set.app.name
  ip_address       = var.primary_backend_private_ip
  port             = 80
}

# A separate resource prevents a temporary capacity shortage for a new VM
# from blocking traffic to the already healthy primary VM.
resource "oci_load_balancer_backend" "additional" {
  count            = max(var.instance_count - 1, 0)
  load_balancer_id = oci_load_balancer_load_balancer.app.id
  backendset_name  = oci_load_balancer_backend_set.app.name
  ip_address       = oci_core_instance.dev[count.index + 1].private_ip
  port             = 80
}

resource "oci_load_balancer_listener" "http" {
  load_balancer_id         = oci_load_balancer_load_balancer.app.id
  name                     = "http"
  default_backend_set_name = oci_load_balancer_backend_set.app.name
  port                     = 80
  protocol                 = "HTTP"
}
