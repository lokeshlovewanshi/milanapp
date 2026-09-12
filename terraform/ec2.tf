# ---------------------------------------------------------------------------
# Application server
# ---------------------------------------------------------------------------

resource "aws_iam_role" "app" {
  name = "${local.name}-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# This role is what replaces the long-lived AWS access key. Credentials are
# delivered by the instance metadata service, rotate automatically, and never
# exist in a file that can be committed.
resource "aws_iam_role_policy" "app_s3" {
  name = "${local.name}-s3-photos"
  role = aws_iam_role.app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
        Resource = "arn:aws:s3:::${var.s3_photo_bucket}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = "arn:aws:s3:::${var.s3_photo_bucket}"
      },
      {
        # The CodeDeploy agent pulls the release bundle from here.
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "${aws_s3_bucket.artifacts.arn}/*"
      }
    ]
  })
}

# Lets the CodeDeploy agent register and report deployment status.
resource "aws_iam_role_policy_attachment" "app_codedeploy" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2RoleforAWSCodeDeploy"
}

# Session Manager: shell access without opening SSH at all. Worth having as a
# fallback for the day your home IP changes and locks you out of port 22.
resource "aws_iam_role_policy_attachment" "app_ssm" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "app" {
  name = "${local.name}-app-profile"
  role = aws_iam_role.app.name
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = var.key_pair_name
  subnet_id              = aws_subnet.public[0].id
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = aws_iam_instance_profile.app.name

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  # IMDSv2 only. The v1 endpoint can be reached through a server-side request
  # forgery bug, which hands an attacker the instance role's credentials -
  # exactly how the 2019 Capital One breach worked.
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  user_data = templatefile("${path.module}/user-data.sh", {
    region = var.region
  })

  # Changing user_data would otherwise replace the running server. Bootstrap
  # is one-time; everything after it goes through CodeDeploy.
  user_data_replace_on_change = false

  tags = {
    Name = "${local.name}-api"
    # CodeDeploy finds its targets by this tag, so it must match the
    # deployment group's ec2_tag_filter exactly.
    App = local.name
  }

  lifecycle {
    ignore_changes = [ami]
  }
}

# A stable address. Without one the public IP changes on every stop/start and
# the DNS record silently stops resolving.
resource "aws_eip" "app" {
  instance = aws_instance.app.id
  domain   = "vpc"

  tags = { Name = "${local.name}-eip" }
}
