# AWS Provider version ~> 5.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Local variables for resource naming and tagging
locals {
  cluster_name = "${var.environment}-gameday-docdb"
  default_tags = merge(
    {
      Environment     = var.environment
      Terraform      = "true"
      Service        = "gameday-platform"
      Backup         = "required"
      Encryption     = "required"
      MultiAZ        = "enabled"
    },
    var.tags
  )
}

# Security group for DocumentDB cluster
resource "aws_security_group" "docdb" {
  name        = "${local.cluster_name}-sg"
  description = "Security group for GameDay Platform DocumentDB cluster"
  vpc_id      = var.vpc_id

  ingress {
    description = "MongoDB port access"
    from_port   = 27017
    to_port     = 27017
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.selected.cidr_block]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    local.default_tags,
    {
      Name = "${local.cluster_name}-sg"
    }
  )

  lifecycle {
    create_before_destroy = true
  }
}

# Subnet group for DocumentDB cluster
resource "aws_docdb_subnet_group" "docdb" {
  name        = "${local.cluster_name}-subnet-group"
  subnet_ids  = var.private_subnet_ids
  description = "Subnet group for GameDay Platform DocumentDB cluster"

  tags = merge(
    local.default_tags,
    {
      Name = "${local.cluster_name}-subnet-group"
    }
  )
}

# DocumentDB cluster
resource "aws_docdb_cluster" "main" {
  cluster_identifier              = local.cluster_name
  engine                         = "docdb"
  engine_version                 = var.engine_version
  master_username                = var.master_username
  master_password                = var.master_password
  backup_retention_period        = var.backup_retention_period
  preferred_backup_window        = var.preferred_backup_window
  preferred_maintenance_window   = var.preferred_maintenance_window
  db_subnet_group_name          = aws_docdb_subnet_group.docdb.name
  vpc_security_group_ids        = [aws_security_group.docdb.id]
  storage_encrypted             = var.encryption_enabled
  kms_key_id                    = var.kms_key_id
  deletion_protection           = var.deletion_protection
  skip_final_snapshot          = var.environment != "production"
  apply_immediately            = var.environment != "production"
  enabled_cloudwatch_logs_exports = ["audit", "profiler"]

  tags = merge(
    local.default_tags,
    {
      Name = local.cluster_name
    }
  )
}

# DocumentDB cluster instances
resource "aws_docdb_cluster_instance" "instances" {
  count                   = var.cluster_size
  identifier              = "${local.cluster_name}-${count.index + 1}"
  cluster_identifier      = aws_docdb_cluster.main.id
  instance_class          = var.instance_class
  auto_minor_version_upgrade = var.auto_minor_version_upgrade
  
  # Distribute instances across AZs for high availability
  availability_zone       = element(data.aws_availability_zones.available.names, count.index % length(data.aws_availability_zones.available.names))
  
  # Set promotion tier (0 for primary, higher numbers for replicas)
  promotion_tier         = count.index

  tags = merge(
    local.default_tags,
    {
      Name = "${local.cluster_name}-${count.index + 1}"
    }
  )
}

# Data sources for VPC and AZ information
data "aws_vpc" "selected" {
  id = var.vpc_id
}

data "aws_availability_zones" "available" {
  state = "available"
}

# Outputs
output "cluster_endpoint" {
  description = "The cluster endpoint"
  value       = aws_docdb_cluster.main.endpoint
}

output "reader_endpoint" {
  description = "The cluster reader endpoint"
  value       = aws_docdb_cluster.main.reader_endpoint
}

output "cluster_identifier" {
  description = "The cluster identifier"
  value       = aws_docdb_cluster.main.cluster_identifier
}

output "security_group_id" {
  description = "The security group ID"
  value       = aws_security_group.docdb.id
}

output "port" {
  description = "The port on which the DB accepts connections"
  value       = 27017
}

output "cluster_resource_id" {
  description = "The Resource ID of the cluster"
  value       = aws_docdb_cluster.main.cluster_resource_id
}