# Redis Primary Endpoint
output "redis_endpoint" {
  description = "Primary endpoint address for Redis cluster connection"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
  sensitive   = true # Marked sensitive to prevent exposure in logs
}

# Redis Reader Endpoint
output "redis_reader_endpoint" {
  description = "Reader endpoint address for Redis cluster read operations"
  value       = aws_elasticache_replication_group.redis.reader_endpoint_address
  sensitive   = true
}

# Redis Port
output "redis_port" {
  description = "Port number for Redis cluster connection"
  value       = aws_elasticache_replication_group.redis.port
}

# Security Group Information
output "redis_security_group_id" {
  description = "ID of the security group controlling Redis cluster access"
  value       = aws_security_group.redis.id
}

output "redis_security_group_name" {
  description = "Name of the security group controlling Redis cluster access"
  value       = aws_security_group.redis.name
}

# Subnet Group Information
output "redis_subnet_group_id" {
  description = "ID of the subnet group where Redis cluster is deployed"
  value       = aws_elasticache_subnet_group.redis.id
}

output "redis_subnet_group_name" {
  description = "Name of the subnet group where Redis cluster is deployed"
  value       = aws_elasticache_subnet_group.redis.name
}

# Formatted Connection String
output "redis_connection_string" {
  description = "Formatted connection string for Redis cluster access"
  value       = format(
    "redis://%s:%d",
    aws_elasticache_replication_group.redis.primary_endpoint_address,
    aws_elasticache_replication_group.redis.port
  )
  sensitive = true # Marked sensitive to prevent exposure in logs
}

# Additional Metadata
output "redis_cluster_metadata" {
  description = "Metadata about the Redis cluster deployment"
  value = {
    id                = aws_elasticache_replication_group.redis.id
    num_cache_nodes   = aws_elasticache_replication_group.redis.num_cache_clusters
    engine_version    = aws_elasticache_replication_group.redis.engine_version
    node_type        = aws_elasticache_replication_group.redis.node_type
    multi_az_enabled = aws_elasticache_replication_group.redis.multi_az_enabled
  }
}