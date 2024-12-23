# Connection Endpoints
output "cluster_endpoint" {
  description = "The primary endpoint for the DocumentDB cluster used for write operations"
  value       = aws_docdb_cluster.main.endpoint
  sensitive   = false
}

output "reader_endpoint" {
  description = "The reader endpoint for the DocumentDB cluster used for read-only operations in multi-AZ deployments"
  value       = aws_docdb_cluster.main.reader_endpoint
  sensitive   = false
}

# Cluster Information
output "cluster_identifier" {
  description = "The unique identifier of the DocumentDB cluster"
  value       = aws_docdb_cluster.main.cluster_identifier
  sensitive   = false
}

output "cluster_resource_id" {
  description = "The immutable identifier of the DocumentDB cluster (region-unique)"
  value       = aws_docdb_cluster.main.cluster_resource_id
  sensitive   = false
}

# Security Configuration
output "security_group_id" {
  description = "The ID of the security group controlling access to the DocumentDB cluster"
  value       = aws_security_group.docdb.id
  sensitive   = false
}

output "port" {
  description = "The port number on which the DocumentDB cluster accepts connections"
  value       = 27017
  sensitive   = false
}

# Connection String
output "connection_string" {
  description = "MongoDB-compatible connection string for applications (includes authentication)"
  value       = format("mongodb://%s:%s@%s:27017/?replicaSet=rs0&tls=true", 
                      var.master_username,
                      var.master_password,
                      aws_docdb_cluster.main.endpoint)
  sensitive   = true
}

output "connection_string_without_credentials" {
  description = "MongoDB-compatible connection string without credentials for documentation purposes"
  value       = format("mongodb://<username>:<password>@%s:27017/?replicaSet=rs0&tls=true",
                      aws_docdb_cluster.main.endpoint)
  sensitive   = false
}

# High Availability Configuration
output "availability_zones" {
  description = "The Availability Zones in which cluster instances are deployed"
  value       = distinct([for instance in aws_docdb_cluster_instance.instances : instance.availability_zone])
  sensitive   = false
}

output "number_of_instances" {
  description = "The number of instances in the DocumentDB cluster"
  value       = var.cluster_size
  sensitive   = false
}

# Monitoring and Maintenance
output "maintenance_window" {
  description = "The maintenance window for the DocumentDB cluster"
  value       = var.preferred_maintenance_window
  sensitive   = false
}

output "backup_window" {
  description = "The daily time range during which automated backups are created"
  value       = var.preferred_backup_window
  sensitive   = false
}

output "backup_retention_period" {
  description = "The number of days for which automated backups are retained"
  value       = var.backup_retention_period
  sensitive   = false
}