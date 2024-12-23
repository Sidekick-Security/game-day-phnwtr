# Configure Terraform version and required providers
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
}

# Primary AWS provider configuration for main region
provider "aws" {
  region = var.aws_region

  # Enhanced security configurations
  default_tags {
    tags = {
      Project     = "GameDay Platform"
      Terraform   = "true"
      Environment = var.environment
    }
  }

  assume_role {
    role_arn = var.assume_role_arn
  }
}

# Secondary AWS provider configuration for multi-region high availability
provider "aws" {
  alias  = "secondary"
  region = var.secondary_aws_region

  # Enhanced security configurations
  default_tags {
    tags = {
      Project     = "GameDay Platform"
      Terraform   = "true"
      Environment = var.environment
    }
  }

  assume_role {
    role_arn = var.assume_role_arn
  }
}

# Kubernetes provider configuration for EKS management
provider "kubernetes" {
  # Configuration will be populated by AWS EKS authentication
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.cluster.token

  # Enhanced security settings
  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args = [
      "eks",
      "get-token",
      "--cluster-name",
      data.aws_eks_cluster.cluster.name,
      "--region",
      var.aws_region
    ]
  }
}

# Helm provider configuration for application deployment
provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.cluster.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.cluster.token

    # Enhanced security settings
    exec {
      api_version = "client.authentication.k8s.io/v1beta1"
      command     = "aws"
      args = [
        "eks",
        "get-token",
        "--cluster-name",
        data.aws_eks_cluster.cluster.name,
        "--region",
        var.aws_region
      ]
    }
  }
}

# Data sources for EKS cluster authentication
data "aws_eks_cluster" "cluster" {
  name = local.cluster_name
}

data "aws_eks_cluster_auth" "cluster" {
  name = local.cluster_name
}

# Local variables
locals {
  cluster_name = "${var.project_name}-${var.environment}-eks"
}