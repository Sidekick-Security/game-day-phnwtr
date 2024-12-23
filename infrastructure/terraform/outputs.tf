# VPC Infrastructure Outputs
output "vpc_id" {
  description = "ID of the VPC for network isolation and security group configuration"
  value       = module.vpc.vpc_id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs for internal service deployment"
  value       = module.vpc.private_subnet_ids
}

output "public_subnet_ids" {
  description = "List of public subnet IDs for load balancer and NAT gateway deployment"
  value       = module.vpc.public_subnet_ids
}

output "availability_zones" {
  description = "List of availability zones used for multi-AZ deployment"
  value       = module.vpc.subnet_availability_zones
}

# EKS Cluster Outputs
output "eks_cluster_endpoint" {
  description = "Endpoint for EKS control plane access with kubectl and service integration"
  value       = module.eks.cluster_endpoint
}

output "eks_cluster_name" {
  description = "Name of the EKS cluster for AWS CLI and kubectl configuration"
  value       = module.eks.cluster_name
}

output "eks_cluster_version" {
  description = "Kubernetes version running on the EKS cluster"
  value       = module.eks.cluster_version
}

output "eks_security_group_id" {
  description = "Security group ID for EKS cluster network access control"
  value       = module.eks.cluster_security_group_id
}

# Database Infrastructure Outputs
output "docdb_primary_endpoint" {
  description = "Primary endpoint for DocumentDB cluster write operations"
  value       = module.rds.cluster_endpoint
  sensitive   = true
}

output "docdb_reader_endpoint" {
  description = "Reader endpoint for DocumentDB cluster read operations load balancing"
  value       = module.rds.reader_endpoint
  sensitive   = true
}

output "docdb_cluster_id" {
  description = "Identifier of the DocumentDB cluster for AWS CLI and monitoring configuration"
  value       = module.rds.cluster_identifier
}

output "docdb_security_group_id" {
  description = "Security group ID for DocumentDB cluster network access control"
  value       = module.rds.security_group_id
}

# Network Configuration Outputs
output "vpc_network_config" {
  description = "VPC network configuration details for service deployment"
  value = {
    vpc_id             = module.vpc.vpc_id
    private_subnets    = module.vpc.private_subnet_ids
    public_subnets     = module.vpc.public_subnet_ids
    availability_zones = module.vpc.subnet_availability_zones
  }
}

# Cluster Access Configuration
output "cluster_access_config" {
  description = "EKS cluster access configuration for service deployment"
  value = {
    endpoint           = module.eks.cluster_endpoint
    security_group_id  = module.eks.cluster_security_group_id
    cluster_name       = module.eks.cluster_name
    kubernetes_version = module.eks.cluster_version
  }
}

# Database Access Configuration
output "database_access_config" {
  description = "DocumentDB access configuration for application services"
  value = {
    cluster_id         = module.rds.cluster_identifier
    security_group_id  = module.rds.security_group_id
    port              = module.rds.port
  }
  sensitive = false
}

# Security Groups Configuration
output "security_groups_config" {
  description = "Security group IDs for network access control"
  value = {
    eks_security_group_id     = module.eks.cluster_security_group_id
    docdb_security_group_id   = module.rds.security_group_id
  }
}

# High Availability Configuration
output "ha_config" {
  description = "High availability configuration details"
  value = {
    availability_zones = module.vpc.subnet_availability_zones
    database_instances = module.rds.number_of_instances
  }
}