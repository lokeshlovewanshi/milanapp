# Always Free: 1 Flexible Load Balancer, 10Mbps min/max bandwidth.
# Moved to the dedicated LB subnet (10.30.3.0/24) so the app instances'
# subnet stays private with no internet-facing resources in it.
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
    port              = 8080 # Spring Boot JAR port - no nginx on instances
    return_code       = 200
    interval_ms       = 10000
    timeout_in_millis = 3000
    retries           = 3
  }
}

# LB forwards directly to port 8080 (Spring Boot JAR). There is no nginx
# reverse proxy on the instances; the LB terminates HTTP/HTTPS and forwards
# plain HTTP to the backend on 8080.
resource "oci_load_balancer_backend" "app" {
  count            = var.instance_count
  load_balancer_id = oci_load_balancer_load_balancer.app.id
  backendset_name  = oci_load_balancer_backend_set.app.name
  ip_address       = oci_core_instance.dev[count.index].private_ip
  port             = 8080
}

# ---------------------------------------------------------------------------
# TLS certificate - Let's Encrypt 90-day cert uploaded to the LB.
# Set ssl_certificate_pem and ssl_private_key_pem in terraform.tfvars
# (or via TF_VAR_* env vars) before applying. When empty, the HTTPS listener
# and this resource are skipped and only HTTP is active.
# ---------------------------------------------------------------------------
resource "oci_load_balancer_certificate" "app" {
  count = var.ssl_certificate_pem != "" ? 1 : 0

  load_balancer_id   = oci_load_balancer_load_balancer.app.id
  certificate_name   = "letsencrypt"
  public_certificate = var.ssl_certificate_pem
  private_key        = var.ssl_private_key_pem

  lifecycle {
    # OCI requires create_before_destroy when replacing a certificate that is
    # referenced by an active listener - otherwise the listener update races
    # the delete and the apply fails.
    create_before_destroy = true
  }
}

# ---------------------------------------------------------------------------
# HTTP listener - port 80.
# When HTTPS is active this redirects all traffic to https://. When no cert
# is configured it forwards straight to the backend so the API is still
# reachable over plain HTTP during initial setup.
# ---------------------------------------------------------------------------
resource "oci_load_balancer_rule_set" "http_to_https" {
  count            = var.ssl_certificate_pem != "" ? 1 : 0
  load_balancer_id = oci_load_balancer_load_balancer.app.id
  name             = "http_to_https"

  items {
    action = "REDIRECT"
    conditions {
      attribute_name  = "PATH"
      attribute_value = "/"
      operator        = "PREFIX_MATCH"
    }
    redirect_uri {
      protocol = "https"
      host     = "{host}"
      port     = "443"
      path     = "/{path}"
      query    = "?{query}"
    }
    response_code = 301
  }
}

resource "oci_load_balancer_listener" "http" {
  load_balancer_id         = oci_load_balancer_load_balancer.app.id
  name                     = "http"
  default_backend_set_name = oci_load_balancer_backend_set.app.name
  port                     = 80
  protocol                 = "HTTP"

  # If a cert is configured, redirect HTTP → HTTPS; otherwise forward as-is
  # so the API is reachable during initial DNS/cert bootstrap.
  rule_set_names = var.ssl_certificate_pem != "" ? [oci_load_balancer_rule_set.http_to_https[0].name] : []
}

# ---------------------------------------------------------------------------
# HTTPS listener - port 443. Created only when a certificate is provided.
# ---------------------------------------------------------------------------
resource "oci_load_balancer_listener" "https" {
  count = var.ssl_certificate_pem != "" ? 1 : 0

  load_balancer_id         = oci_load_balancer_load_balancer.app.id
  name                     = "https"
  default_backend_set_name = oci_load_balancer_backend_set.app.name
  port                     = 443
  protocol                 = "HTTP"

  ssl_configuration {
    certificate_name        = oci_load_balancer_certificate.app[0].certificate_name
    verify_peer_certificate = false # backend is plain HTTP; no mTLS needed
  }
}
