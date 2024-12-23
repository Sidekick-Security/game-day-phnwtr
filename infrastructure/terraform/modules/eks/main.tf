# AWS Provider configuration
# version: ~> 5.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

# Data sources for availability zones and KMS key
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_kms_key" "eks" {
  key_id = var.encryption_config.kms_key_id
}

# IAM role for EKS cluster
resource "aws_iam_role" "cluster_role" {
  name = "${var.cluster_name}-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-cluster-role"
  })
}

# Attach required policies to cluster role
resource "aws_iam_role_policy_attachment" "cluster_policies" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
    "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  ])

  policy_arn = each.value
  role       = aws_iam_role.cluster_role.name
}

# EKS cluster security group
resource "aws_security_group" "cluster_sg" {
  name        = "${var.cluster_name}-cluster-sg"
  description = "Security group for GameDay Platform EKS cluster"
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = var.cluster_security_group_rules
    content {
      description = ingress.value.description
      from_port   = ingress.value.from_port
      to_port     = ingress.value.to_port
      protocol    = ingress.value.protocol
      cidr_blocks = ingress.value.cidr_blocks
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-cluster-sg"
  })
}

# EKS cluster
resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  version  = var.cluster_version
  role_arn = aws_iam_role.cluster_role.arn

  vpc_config {
    subnet_ids              = var.subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = true
    security_group_ids      = [aws_security_group.cluster_sg.id]
  }

  encryption_config {
    provider {
      key_arn = data.aws_kms_key.eks.arn
    }
    resources = var.encryption_config.resources
  }

  enabled_cluster_log_types = [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler"
  ]

  # Enable EKS add-ons
  dynamic "addon" {
    for_each = var.cluster_addons
    content {
      addon_name           = addon.key
      addon_version       = addon.value.version
      resolve_conflicts   = addon.value.resolve_conflicts
    }
  }

  tags = var.tags

  depends_on = [
    aws_iam_role_policy_attachment.cluster_policies
  ]
}

# IAM role for node groups
resource "aws_iam_role" "node_role" {
  name = "${var.cluster_name}-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(var.tags, {
    Name = "${var.cluster_name}-node-role"
  })
}

# Attach required policies to node role
resource "aws_iam_role_policy_attachment" "node_policies" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  ])

  policy_arn = each.value
  role       = aws_iam_role.node_role.name
}

# EKS managed node groups
resource "aws_eks_node_group" "main" {
  for_each = var.node_groups

  cluster_name    = aws_eks_cluster.main.name
  node_group_name = each.key
  node_role_arn   = aws_iam_role.node_role.arn
  subnet_ids      = var.subnet_ids

  instance_types = lookup(var.instance_types, each.key, ["t3.large"])
  capacity_type  = lookup(each.value, "capacity_type", "ON_DEMAND")

  scaling_config {
    desired_size = var.scaling_config[each.key].desired_size
    max_size     = var.scaling_config[each.key].max_size
    min_size     = var.scaling_config[each.key].min_size
  }

  update_config {
    max_unavailable = 1
  }

  labels = merge(
    lookup(each.value, "labels", {}),
    {
      "role" = each.key
      "environment" = var.tags["Environment"]
    }
  )

  tags = merge(var.tags, {
    "NodeGroupType" = each.key
  })

  depends_on = [
    aws_iam_role_policy_attachment.node_policies
  ]

  lifecycle {
    ignore_changes = [scaling_config[0].desired_size]
  }
}

# Outputs
output "cluster_endpoint" {
  description = "EKS cluster endpoint URL for service connectivity"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_security_group_id" {
  description = "Security group ID for cluster network access control"
  value       = aws_security_group.cluster_sg.id
}

output "cluster_certificate_authority_data" {
  description = "Cluster CA certificate for client authentication"
  value       = aws_eks_cluster.main.certificate_authority[0].data
}