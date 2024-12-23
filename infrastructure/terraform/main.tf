# GameDay Platform Infrastructure Configuration
# Version: 1.0.0
# Terraform Version: >= 1.5.0
# Provider Versions: AWS ~> 5.0, Kubernetes ~> 2.23, Helm ~> 2.11

terraform {
  required_version = ">= 1.5.0"
  
  # Enhanced backend configuration with encryption and state locking
  backend "s3" {
    bucket         = "gameday-platform-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    kms_key_id     = "alias/terraform-state-key"
    dynamodb_table = "gameday-platform-terraform-lock"
  }

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

# VPC Module for Network Infrastructure
module "vpc" {
  source = "./modules/vpc"

  project_name      = var.project_name
  environment       = var.environment
  vpc_cidr         = var.vpc_cidr
  availability_zones = var.availability_zones

  # Enhanced networking features
  enable_flow_logs     = true
  flow_logs_retention  = 30
  enable_nat_gateway   = true
  single_nat_gateway   = false
  enable_vpn_gateway   = true

  # Security features
  enable_network_firewall = true
  enable_transit_gateway  = true

  tags = merge(var.tags, {
    "Compliance" = "SOC2"
    "Encryption" = "Required"
  })
}

# EKS Module for Container Orchestration
module "eks" {
  source = "./modules/eks"

  project_name    = var.project_name
  environment     = var.environment
  cluster_version = var.eks_cluster_version
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnets

  # Node group configurations
  node_groups = {
    web = {
      instance_types = var.eks_node_instance_types["web"]
      min_size      = var.min_capacity["web"]
      max_size      = var.max_capacity["web"]
      desired_size  = var.min_capacity["web"]
    }
    application = {
      instance_types = var.eks_node_instance_types["application"]
      min_size      = var.min_capacity["application"]
      max_size      = var.max_capacity["application"]
      desired_size  = var.min_capacity["application"]
    }
  }

  # Enhanced security features
  enable_irsa                    = true
  enable_pod_security_policy     = true
  cluster_encryption_config      = true
  endpoint_private_access        = true
  endpoint_public_access         = false
  enable_container_insights      = true

  tags = var.tags
}

# DocumentDB Module for Database Layer
module "documentdb" {
  source = "./modules/documentdb"

  project_name    = var.project_name
  environment     = var.environment
  instance_class  = var.db_instance_class
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnets

  # High availability configuration
  cluster_size                = 3
  backup_retention_period     = var.backup_retention_period
  preferred_backup_window     = "02:00-04:00"
  preferred_maintenance_window = "mon:04:00-mon:06:00"

  # Enhanced security features
  storage_encrypted          = true
  enable_performance_insights = true
  enable_audit_logging       = true
  
  tags = var.tags
}

# ElastiCache Module for Caching Layer
module "elasticache" {
  source = "./modules/elasticache"

  project_name   = var.project_name
  environment    = var.environment
  node_type     = var.redis_node_type
  vpc_id        = module.vpc.vpc_id
  subnet_ids    = module.vpc.private_subnets

  # High availability configuration
  num_cache_clusters      = 3
  automatic_failover     = true
  multi_az_enabled       = true
  
  # Performance and security features
  transit_encryption_enabled = true
  auth_token_enabled        = true
  snapshot_retention_limit  = 7
  
  tags = var.tags
}

# Monitoring and Logging Module
module "monitoring" {
  source = "./modules/monitoring"

  project_name = var.project_name
  environment  = var.environment

  # Enhanced monitoring configuration
  enable_enhanced_monitoring = var.enable_enhanced_monitoring
  monitoring_interval       = var.monitoring_interval

  # Log aggregation
  retention_in_days        = 30
  enable_audit_logging     = true
  enable_alarm_actions     = true

  # Metrics configuration
  metrics_namespace        = "GameDayPlatform"
  detailed_monitoring      = true

  tags = var.tags
}

# Security Module for Platform-wide Security Controls
module "security" {
  source = "./modules/security"

  project_name = var.project_name
  environment  = var.environment
  vpc_id      = module.vpc.vpc_id

  # WAF configuration
  enable_waf                = true
  waf_block_mode           = true
  enable_rate_limiting     = true

  # GuardDuty configuration
  enable_guardduty         = true
  enable_threat_intel      = true
  enable_s3_protection     = true

  # KMS configuration
  enable_kms              = true
  key_rotation_enabled    = true
  enable_key_admin_policy = true

  tags = var.tags
}

# Outputs for cross-module references
output "vpc_id" {
  description = "ID of the created VPC"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "Endpoint for EKS cluster"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "documentdb_endpoint" {
  description = "Endpoint for DocumentDB cluster"
  value       = module.documentdb.cluster_endpoint
  sensitive   = true
}

output "elasticache_endpoint" {
  description = "Endpoint for ElastiCache cluster"
  value       = module.elasticache.cluster_endpoint
  sensitive   = true
}

output "monitoring_dashboard_url" {
  description = "URL for CloudWatch dashboard"
  value       = module.monitoring.dashboard_url
}