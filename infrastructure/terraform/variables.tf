# Core project variables
variable "project_name" {
  description = "Name of the GameDay Platform project"
  type        = string
  default     = "gameday-platform"
}

variable "environment" {
  description = "Deployment environment (production, staging, development)"
  type        = string
  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be one of: production, staging, development."
  }
}

# AWS Region Configuration
variable "aws_region" {
  description = "Primary AWS region for deployment"
  type        = string
  default     = "us-west-2"
}

variable "secondary_aws_region" {
  description = "Secondary AWS region for multi-region deployment"
  type        = string
  default     = "us-east-1"
}

# Network Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

variable "availability_zones" {
  description = "List of availability zones for multi-AZ deployment"
  type        = list(string)
  default     = ["us-west-2a", "us-west-2b", "us-west-2c"]
}

# EKS Configuration
variable "eks_cluster_version" {
  description = "Kubernetes version for EKS cluster (1.27+)"
  type        = string
  default     = "1.27"
  validation {
    condition     = tonumber(split(".", var.eks_cluster_version)[0]) >= 1 && tonumber(split(".", var.eks_cluster_version)[1]) >= 27
    error_message = "EKS cluster version must be 1.27 or higher."
  }
}

variable "eks_node_instance_types" {
  description = "Instance types for EKS node groups by tier"
  type        = map(list(string))
  default = {
    web = ["t3.large"]
    application = ["c5.xlarge"]
    data = ["r5.2xlarge"]
  }
}

# Database Configuration
variable "db_instance_class" {
  description = "RDS/DocumentDB instance type (r5.2xlarge)"
  type        = string
  default     = "r5.2xlarge"
}

# Cache Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type (r6g.large)"
  type        = string
  default     = "r6g.large"
}

# Backup Configuration
variable "backup_retention_period" {
  description = "Number of days to retain database backups"
  type        = number
  default     = 30
  validation {
    condition     = var.backup_retention_period >= 7
    error_message = "Backup retention period must be at least 7 days."
  }
}

# Resource Scaling
variable "min_capacity" {
  description = "Minimum number of instances per service"
  type        = map(number)
  default = {
    web         = 2
    application = 2
    worker      = 1
  }
}

variable "max_capacity" {
  description = "Maximum number of instances per service"
  type        = map(number)
  default = {
    web         = 10
    application = 20
    worker      = 5
  }
}

# Resource Tags
variable "tags" {
  description = "Resource tags for all infrastructure components"
  type        = map(string)
  default = {
    Project     = "GameDay Platform"
    Terraform   = "true"
    Environment = "production"
  }
}

# Monitoring Configuration
variable "enable_enhanced_monitoring" {
  description = "Enable enhanced monitoring for RDS instances"
  type        = bool
  default     = true
}

variable "monitoring_interval" {
  description = "Monitoring interval in seconds for enhanced monitoring"
  type        = number
  default     = 30
  validation {
    condition     = contains([0, 1, 5, 10, 15, 30, 60], var.monitoring_interval)
    error_message = "Monitoring interval must be one of: 0, 1, 5, 10, 15, 30, 60."
  }
}

# Security Configuration
variable "allowed_cidr_blocks" {
  description = "List of CIDR blocks allowed to access the infrastructure"
  type        = list(string)
  default     = []
  validation {
    condition     = alltrue([for cidr in var.allowed_cidr_blocks : can(cidrhost(cidr, 0))])
    error_message = "All CIDR blocks must be valid IPv4 CIDR notation."
  }
}

variable "ssl_certificate_arn" {
  description = "ARN of the SSL certificate for HTTPS endpoints"
  type        = string
  default     = ""
}