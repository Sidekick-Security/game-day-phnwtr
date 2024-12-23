# Core Terraform functionality for variable definitions
# Version: ~> 1.5
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Project name for resource naming
variable "project_name" {
  description = "Name of the GameDay Platform project used for resource naming"
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9-]*$", var.project_name))
    error_message = "Project name must start with a letter and can only contain letters, numbers, and hyphens."
  }
}

# Deployment environment specification
variable "environment" {
  description = "Deployment environment for the VPC (production, staging, development)"
  type        = string

  validation {
    condition     = contains(["production", "staging", "development"], var.environment)
    error_message = "Environment must be either production, staging, or development."
  }
}

# VPC CIDR block configuration
variable "vpc_cidr" {
  description = "CIDR block for the VPC network"
  type        = string

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

# Availability zones configuration
variable "availability_zones" {
  description = "List of AWS availability zones for subnet distribution"
  type        = list(string)

  validation {
    condition     = length(var.availability_zones) >= 2
    error_message = "At least 2 availability zones must be specified for high availability."
  }
}

# Public subnet CIDR blocks
variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets (load balancers, NAT gateways)"
  type        = list(string)

  validation {
    condition = alltrue([
      for cidr in var.public_subnet_cidrs : can(cidrhost(cidr, 0))
    ])
    error_message = "All public subnet CIDRs must be valid IPv4 CIDR blocks."
  }

  validation {
    condition     = length(var.public_subnet_cidrs) >= 2
    error_message = "At least 2 public subnets must be specified for high availability."
  }
}

# Private subnet CIDR blocks
variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets (application workloads)"
  type        = list(string)

  validation {
    condition = alltrue([
      for cidr in var.private_subnet_cidrs : can(cidrhost(cidr, 0))
    ])
    error_message = "All private subnet CIDRs must be valid IPv4 CIDR blocks."
  }

  validation {
    condition     = length(var.private_subnet_cidrs) >= 2
    error_message = "At least 2 private subnets must be specified for high availability."
  }
}

# Database subnet CIDR blocks
variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets (RDS, ElastiCache)"
  type        = list(string)

  validation {
    condition = alltrue([
      for cidr in var.database_subnet_cidrs : can(cidrhost(cidr, 0))
    ])
    error_message = "All database subnet CIDRs must be valid IPv4 CIDR blocks."
  }

  validation {
    condition     = length(var.database_subnet_cidrs) >= 2
    error_message = "At least 2 database subnets must be specified for high availability."
  }
}

# NAT Gateway configuration
variable "enable_nat_gateway" {
  description = "Flag to enable NAT gateways for private subnet internet access"
  type        = bool
  default     = true
}

# Single NAT Gateway option
variable "single_nat_gateway" {
  description = "Flag to use a single NAT gateway instead of one per AZ (cost optimization for non-prod)"
  type        = bool
  default     = false
}

# Resource tagging
variable "tags" {
  description = "Resource tags to be applied to all VPC resources"
  type        = map(string)
  default     = {}

  validation {
    condition = alltrue([
      for key, value in var.tags : can(regex("^[a-zA-Z][a-zA-Z0-9-_]*$", key)) && length(value) <= 256
    ])
    error_message = "Tag keys must start with a letter and only contain letters, numbers, hyphens, or underscores. Values must not exceed 256 characters."
  }
}

# Additional validation to ensure subnet CIDR counts match AZ count
locals {
  az_count              = length(var.availability_zones)
  public_subnet_count   = length(var.public_subnet_cidrs)
  private_subnet_count  = length(var.private_subnet_cidrs)
  database_subnet_count = length(var.database_subnet_cidrs)

  validate_subnet_counts = (
    local.public_subnet_count == local.az_count &&
    local.private_subnet_count == local.az_count &&
    local.database_subnet_count == local.az_count
  ) ? true : tobool("Subnet CIDR counts must match the number of availability zones")
}