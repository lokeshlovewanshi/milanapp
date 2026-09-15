output "instance_public_ips" {
  description = "Public IP of the app instance (Always Free Ampere A1 VM)."
  value       = [for i in oci_core_instance.dev : i.public_ip]
}

output "instance_private_ips" {
  description = "Private IP of the app instance."
  value       = [for i in oci_core_instance.dev : i.private_ip]
}

output "mysql_endpoint" {
  description = "Private IP:port of the MySQL DB system - reachable from inside the VCN."
  value       = try("${oci_mysql_mysql_db_system.dev.endpoints[0].ip_address}:${oci_mysql_mysql_db_system.dev.endpoints[0].port}", "provisioning")
}

output "ssh_command" {
  description = "Command to SSH directly into the Always Free VM."
  value       = "ssh -i ~/.ssh/oci_dev ubuntu@${oci_core_instance.dev[0].public_ip}"
}

output "load_balancer_ip" {
  description = "Public IP address of the Always Free OCI load balancer."
  value       = oci_load_balancer_load_balancer.app.ip_address_details[0].ip_address
}
