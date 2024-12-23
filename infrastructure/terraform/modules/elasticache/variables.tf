# Core variables imported from root module
variable "project_name" {
  description = "Name of the GameDay Platform project"
  type        = string
}

variable "environment" {
  description = "Deployment environment (production, staging, development)"
  type        = string
}

# Redis node configuration
variable "redis_node_type" {
  description = "Instance type for Redis nodes"
  type        = string
  default     = "r6g.large"
  validation {
    condition     = can(regex("^[a-z][0-9][a-z]\\.(small|medium|large|xlarge|[2-9]?xlarge)$", var.redis_node_type))
    error_message = "Redis node type must be a valid AWS instance type."
  }
}

variable "redis_port" {
  description = "Port number for Redis connections"
  type        = number
  default     = 6379
  validation {
    condition     = var.redis_port > 0 && var.redis_port < 65536
    error_message = "Redis port must be between 1 and 65535."
  }
}

variable "redis_num_cache_clusters" {
  description = "Number of cache clusters for replication group"
  type        = number
  default     = 3
  validation {
    condition     = var.redis_num_cache_clusters >= 2 && var.redis_num_cache_clusters <= 6
    error_message = "Number of cache clusters must be between 2 and 6 for high availability."
  }
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
  validation {
    condition     = can(regex("^7\\.0", var.redis_engine_version))
    error_message = "Redis engine version must be 7.0 or higher as per technical specifications."
  }
}

variable "redis_parameter_group_family" {
  description = "Redis parameter group family"
  type        = string
  default     = "redis7"
  validation {
    condition     = can(regex("^redis[0-9]", var.redis_parameter_group_family))
    error_message = "Parameter group family must match Redis version (e.g., redis7)."
  }
}

variable "redis_maintenance_window" {
  description = "Preferred maintenance window"
  type        = string
  default     = "sun:05:00-sun:09:00"
  validation {
    condition     = can(regex("^(mon|tue|wed|thu|fri|sat|sun):[0-9]{2}:[0-9]{2}-(mon|tue|wed|thu|fri|sat|sun):[0-9]{2}:[0-9]{2}$", var.redis_maintenance_window))
    error_message = "Maintenance window must be in the format day:HH:MM-day:HH:MM."
  }
}

variable "redis_snapshot_retention_limit" {
  description = "Number of days to retain Redis backups"
  type        = number
  default     = 30
  validation {
    condition     = var.redis_snapshot_retention_limit >= 7
    error_message = "Snapshot retention limit must be at least 7 days for production workloads."
  }
}

variable "redis_snapshot_window" {
  description = "Daily time range for backups"
  type        = string
  default     = "03:00-05:00"
  validation {
    condition     = can(regex("^[0-9]{2}:[0-9]{2}-[0-9]{2}:[0-9]{2}$", var.redis_snapshot_window))
    error_message = "Snapshot window must be in the format HH:MM-HH:MM."
  }
}

variable "redis_automatic_failover_enabled" {
  description = "Enable automatic failover for high availability"
  type        = bool
  default     = true
}

variable "redis_multi_az_enabled" {
  description = "Enable multi-AZ deployment"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Resource tags for ElastiCache components"
  type        = map(string)
  default     = {}
  validation {
    condition     = length(var.tags) > 0
    error_message = "At least one tag must be provided for resource management."
  }
}