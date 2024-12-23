# Output definitions for the EKS cluster module
# These outputs expose critical information needed for cluster management and integration

output "cluster_id" {
  description = "The ID/ARN of the EKS cluster for resource referencing and management"
  value       = aws_eks_cluster.main.id
}

output "cluster_endpoint" {
  description = "The endpoint URL for the EKS cluster API server used for kubectl and API interactions"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_security_group_id" {
  description = "The security group ID attached to the EKS cluster for network security configuration"
  value       = aws_security_group.cluster_sg.id
}

output "cluster_iam_role_arn" {
  description = "The IAM role ARN used by the EKS cluster for AWS service permissions"
  value       = aws_iam_role.cluster_role.arn
}

output "node_groups" {
  description = "Map of all EKS node groups with their configurations for scaling and management"
  value = {
    for ng_key, ng in aws_eks_node_group.main : ng_key => {
      arn           = ng.arn
      status        = ng.status
      capacity_type = ng.capacity_type
      scaling_config = {
        desired_size = ng.scaling_config[0].desired_size
        max_size     = ng.scaling_config[0].max_size
        min_size     = ng.scaling_config[0].min_size
      }
      instance_types = ng.instance_types
      labels        = ng.labels
    }
  }
}

output "cluster_certificate_authority_data" {
  description = "The base64 encoded certificate data required for cluster authentication"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

output "cluster_version" {
  description = "The Kubernetes version running on the EKS cluster"
  value       = aws_eks_cluster.main.version
}

output "cluster_addons" {
  description = "Map of enabled EKS cluster add-ons with their versions and configurations"
  value       = aws_eks_cluster.main.addon
}

output "node_role_arn" {
  description = "The IAM role ARN used by the EKS managed node groups"
  value       = aws_iam_role.node_role.arn
}

output "cluster_primary_security_group_id" {
  description = "The ID of the EKS cluster's primary security group for pod communication"
  value       = aws_eks_cluster.main.vpc_config[0].cluster_security_group_id
}