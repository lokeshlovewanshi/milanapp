output "load_balancer_public_ip" {
  description = "Point api.gahoimarriage.in's A record at this IP - it round-robins across both backend instances."
  value       = oci_load_balancer_load_balancer.app.ip_address_details[0].ip_address
}

output "bastion_id" {
  description = "OCID of the OCI Managed Bastion service."
  value       = oci_bastion_bastion.main.id
}

output "instance_private_ips" {
  description = "Private IPs of the app instances."
  value       = [for i in oci_core_instance.dev : i.private_ip]
}

output "mysql_tunnel_command" {
  description = "OCI CLI command to create an SSH port-forwarding session to MySQL Workbench."
  value       = "oci bastion session create-port-forwarding --bastion-id ${oci_bastion_bastion.main.id} --display-name mysql-tunnel --ssh-public-key-file ${var.ssh_public_key_path} --session-ttl 10800 --target-private-ip ${oci_mysql_mysql_db_system.dev.endpoints[0].ip_address} --target-port 3306 --wait-for-state SUCCEEDED"
}

output "mysql_endpoint" {
  description = "Private IP:port of the MySQL DB system - only reachable from inside the VCN."
  value       = "${oci_mysql_mysql_db_system.dev.endpoints[0].ip_address}:${oci_mysql_mysql_db_system.dev.endpoints[0].port}"
}

output "github_actions_instance_hosts" {
  description = "Paste this value into INSTANCE_HOSTS in deploy-backend-oracle.yml (private IPs)."
  value       = join(" ", [for i in oci_core_instance.dev : i.private_ip])
}

