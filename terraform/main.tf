terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
    # Builds the placeholder zip that lets a Lambda be created before CI has
    # ever deployed real code to it. See lambdas.tf.
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  # Uncomment once the bucket exists, so state is shared and locked rather than
  # living on one laptop. Local state means a lost laptop is a lost record of
  # what is actually deployed, and two people applying at once corrupt it.
  #
  # backend "s3" {
  #   bucket       = "gahoi-milan-tfstate"
  #   key          = "prod/terraform.tfstate"
  #   region       = "ap-south-1"
  #   encrypt      = true
  #   use_lockfile = true
  # }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Ubuntu 24.04 LTS, arm64 excluded: the app runs on x86 t3 instances and a
# mismatched AMI architecture fails at launch with a confusing error.
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

locals {
  name = "${var.project}-${var.environment}"

  # Two AZs is the minimum RDS accepts for a subnet group, even for a
  # single-AZ instance. Deploying into one AZ and hoping is not an option the
  # API allows.
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
}
