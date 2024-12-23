# terraform ~> 1.5

variable "environment" {
  description = "Deployment environment (production, staging, development)"
  type        = string
  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be one of: production, staging, development"
  }
}

variable "instance_class" {
  description = "DocumentDB instance class. Production recommends r5.2xlarge for optimal performance"
  type        = string
  default     = "r5.2xlarge"
  validation {
    condition     = can(regex("^[a-z][0-9]\\.[0-9]*xlarge$", var.instance_class))
    error_message = "Instance class must be a valid AWS instance type (e.g., r5.2xlarge)"
  }
}

variable "vpc_id" {
  description = "ID of the VPC where DocumentDB cluster will be deployed"
  type        = string
  validation {
    condition     = can(regex("^vpc-[a-z0-9]+$", var.vpc_id))
    error_message = "VPC ID must be a valid AWS VPC identifier"
  }
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for DocumentDB cluster deployment (minimum 2 for high availability)"
  type        = list(string)
  validation {
    condition     = length(var.private_subnet_ids) >= 2
    error_message = "At least 2 private subnets are required for high availability"
  }
}

variable "backup_retention_period" {
  description = "Number of days to retain automated backups (1-35 days)"
  type        = number
  default     = 35
  validation {
    condition     = var.backup_retention_period >= 1 && var.backup_retention_period <= 35
    error_message = "Backup retention period must be between 1 and 35 days"
  }
}

variable "preferred_backup_window" {
  description = "Daily time range during which automated backups are created (UTC)"
  type        = string
  default     = "03:00-04:00"
  validation {
    condition     = can(regex("^([0-1][0-9]|2[0-3]):[0-5][0-9]-([0-1][0-9]|2[0-3]):[0-5][0-9]$", var.preferred_backup_window))
    error_message = "Backup window must be in format HH:MM-HH:MM (UTC)"
  }
}

variable "master_username" {
  description = "Username for the master database user"
  type        = string
  sensitive   = true
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]{2,63}$", var.master_username))
    error_message = "Master username must be 3-64 characters long, begin with a letter, and contain only alphanumeric characters or underscores"
  }
}

variable "master_password" {
  description = "Password for the master database user (minimum 8 characters)"
  type        = string
  sensitive   = true
  validation {
    condition     = length(var.master_password) >= 8
    error_message = "Master password must be at least 8 characters long"
  }
}

variable "engine_version" {
  description = "DocumentDB engine version"
  type        = string
  default     = "5.0"
  validation {
    condition     = can(regex("^[0-9]\\.[0-9]$", var.engine_version))
    error_message = "Engine version must be in format X.Y"
  }
}

variable "cluster_size" {
  description = "Number of instances in the DocumentDB cluster (minimum 2 for high availability)"
  type        = number
  default     = 3
  validation {
    condition     = var.cluster_size >= 2
    error_message = "Cluster size must be at least 2 for high availability"
  }
}

variable "encryption_enabled" {
  description = "Enable encryption at rest for DocumentDB cluster"
  type        = bool
  default     = true
}

variable "kms_key_id" {
  description = "ARN of KMS key for encryption at rest (optional, uses default key if not specified)"
  type        = string
  default     = null
}

variable "tags" {
  description = "Map of tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "deletion_protection" {
  description = "Enable deletion protection for the DocumentDB cluster"
  type        = bool
  default     = true
}

variable "auto_minor_version_upgrade" {
  description = "Enable automatic minor version upgrades during maintenance window"
  type        = bool
  default     = true
}

variable "preferred_maintenance_window" {
  description = "Weekly time range during which system maintenance can occur (UTC)"
  type        = string
  default     = "sun:04:00-sun:05:00"
  validation {
    condition     = can(regex("^(mon|tue|wed|thu|fri|sat|sun):[0-2][0-9]:[0-5][0-9]-(mon|tue|wed|thu|fri|sat|sun):[0-2][0-9]:[0-5][0-9]$", var.preferred_maintenance_window))
    error_message = "Maintenance window must be in format ddd:hh:mm-ddd:hh:mm (UTC)"
  }
}