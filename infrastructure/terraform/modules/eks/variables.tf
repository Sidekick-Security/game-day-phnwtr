# Core Terraform functionality for variable definitions
# terraform ~> 1.5

variable "cluster_name" {
  type        = string
  description = "Name of the EKS cluster for the GameDay Platform"
}

variable "cluster_version" {
  type        = string
  description = "Kubernetes version for the EKS cluster - must be 1.27 or higher for production requirements"
  default     = "1.27"

  validation {
    condition     = can(regex("^1\\.(2[7-9]|[3-9][0-9])$", var.cluster_version))
    error_message = "Cluster version must be 1.27 or higher for production use."
  }
}

variable "vpc_id" {
  type        = string
  description = "ID of the VPC where EKS cluster will be deployed for network isolation"
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs across multiple AZs for high availability EKS deployment"

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least 2 subnets across different AZs are required for high availability."
  }
}

variable "node_groups" {
  type        = map(any)
  description = "Configuration for EKS managed node groups including web and application tiers"
}

variable "instance_types" {
  type        = map(list(string))
  description = "Instance types for different node groups optimized for workload requirements"
  default = {
    web = ["t3.large"]
    application = ["c5.xlarge"]
    analytics = ["r5.2xlarge"]
  }

  validation {
    condition     = can([for k, v in var.instance_types : length(v) > 0])
    error_message = "Each node group must specify at least one instance type."
  }
}

variable "scaling_config" {
  type = map(object({
    min_size     = number
    max_size     = number
    desired_size = number
  }))
  description = "Auto-scaling configuration for node groups to handle varying workloads"

  validation {
    condition     = alltrue([for k, v in var.scaling_config : v.min_size <= v.desired_size && v.desired_size <= v.max_size])
    error_message = "For each node group: min_size <= desired_size <= max_size must be true."
  }
}

variable "encryption_config" {
  type = object({
    kms_key_id = string
    resources  = list(string)
  })
  description = "KMS encryption configuration for EKS secrets and sensitive data"

  validation {
    condition     = length(var.encryption_config.resources) > 0
    error_message = "At least one resource type must be specified for encryption."
  }
}

variable "tags" {
  type        = map(string)
  description = "Resource tags for EKS cluster and associated resources for organization and cost tracking"
  default = {
    Environment = "production"
    Platform    = "GameDay"
    Terraform   = "true"
  }
}

variable "cluster_addons" {
  type = map(object({
    version               = string
    resolve_conflicts    = string
  }))
  description = "AWS EKS add-ons configuration for enhanced cluster functionality"
  default = {
    vpc-cni = {
      version            = "v1.12.0"
      resolve_conflicts = "OVERWRITE"
    }
    coredns = {
      version            = "v1.9.3"
      resolve_conflicts = "OVERWRITE"
    }
    kube-proxy = {
      version            = "v1.27.1"
      resolve_conflicts = "OVERWRITE"
    }
  }
}

variable "cluster_security_group_rules" {
  type = map(object({
    description = string
    cidr_blocks = list(string)
    from_port   = number
    to_port     = number
    protocol    = string
  }))
  description = "Security group rules for the EKS cluster control plane"
  default = {
    api_server = {
      description = "Allow API server access"
      cidr_blocks = ["0.0.0.0/0"]  # Should be restricted in production
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
    }
  }
}

variable "node_security_group_rules" {
  type = map(object({
    description = string
    cidr_blocks = list(string)
    from_port   = number
    to_port     = number
    protocol    = string
  }))
  description = "Security group rules for the EKS worker nodes"
  default = {
    ingress_self_all = {
      description = "Allow nodes to communicate with each other"
      cidr_blocks = ["0.0.0.0/0"]
      from_port   = 0
      to_port     = 0
      protocol    = "-1"
    }
  }
}