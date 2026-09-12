# ---------------------------------------------------------------------------
# Database: RDS MySQL.
#
# Aurora was removed - it is excluded from the free tier under every AWS
# account and starts around $44/month at the 0.5 ACU floor, against roughly $17
# here. It buys fast failover and read replicas, neither of which a 1000-user
# app needs. Revisit when read traffic actually justifies a replica.
# ---------------------------------------------------------------------------

resource "aws_db_instance" "main" {

  identifier     = "${local.name}-db"
  engine         = "mysql"
  engine_version = "8.0"
  instance_class = var.db_instance_class

  # gp3 costs the same as gp2 here and gives a higher IOPS floor. 20 GB is the
  # free-tier allowance and holds far more than 1000 profiles; autoscaling is
  # off so a runaway query cannot quietly grow the bill.
  allocated_storage     = 20
  max_allocated_storage = 0
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password
  port     = 3306

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]

  # The single most important line here. A public RDS endpoint with a
  # guessable password is found by scanners within hours.
  publicly_accessible = false

  # Single-AZ: Multi-AZ doubles the cost and this app can tolerate the minutes
  # of downtime a restore would take. Revisit when it cannot.
  multi_az = false

  backup_retention_period = 7
  backup_window           = "18:00-19:00" # 23:30 IST, after the evening peak
  maintenance_window      = "sun:19:30-sun:20:30"
  copy_tags_to_snapshot   = true

  auto_minor_version_upgrade = true
  deletion_protection        = false

  # A final snapshot on destroy. Without it, `terraform destroy` silently
  # takes the production database with it.
  skip_final_snapshot       = false
  final_snapshot_identifier = "${local.name}-final-${formatdate("YYYYMMDDhhmmss", timestamp())}"

  performance_insights_enabled = false # Not free on db.t3.micro
  enabled_cloudwatch_logs_exports = ["error", "slowquery"]

  parameter_group_name = aws_db_parameter_group.mysql.name

  tags = { Name = "${local.name}-db" }

  lifecycle {
    # timestamp() changes on every plan, which would otherwise show a
    # permanent diff on the snapshot name.
    ignore_changes = [final_snapshot_identifier]
  }
}

resource "aws_db_parameter_group" "mysql" {
  # name_prefix, not name. With create_before_destroy below, any change that
  # forces replacement would otherwise try to create a second group with the
  # identical name and fail with DBParameterGroupAlreadyExists. AWS appends a
  # unique suffix to a prefix, so replacements just work.
  name_prefix = "${local.name}-mysql8-"
  family      = "mysql8.0"

  # The app writes and reads IST timestamps; leaving the server on UTC makes
  # "newest first" ordering disagree with what users see.
  #
  # "Asia/Calcutta", not "Asia/Kolkata". RDS validates this against its own
  # fixed list, which still carries the pre-2001 name and rejects the modern
  # one outright. Same zone, same UTC+05:30 - only the label differs. Java
  # accepts either, so the JDBC URL and the JVM flag keep saying Asia/Kolkata.
  parameter {
    name  = "time_zone"
    value = "Asia/Calcutta"
  }

  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }

  parameter {
    name  = "collation_server"
    value = "utf8mb4_0900_ai_ci"
  }

  # Log anything slower than 2s so a bad query is visible before users report
  # it. Cheap: slow queries should be rare.
  parameter {
    name  = "slow_query_log"
    value = "1"
  }

  parameter {
    name  = "long_query_time"
    value = "2"
  }

  lifecycle {
    create_before_destroy = true
  }
}

locals {
  db_endpoint = aws_db_instance.main.address

  # useSSL=true encrypts the hop to RDS. requireSSL=false keeps a plain
  # connection working if the certificate bundle is missing, rather than
  # taking the whole app down over it.
  db_url = "jdbc:mysql://${local.db_endpoint}:3306/${var.db_name}?useSSL=true&requireSSL=false&serverTimezone=Asia/Kolkata&allowPublicKeyRetrieval=true"
}
