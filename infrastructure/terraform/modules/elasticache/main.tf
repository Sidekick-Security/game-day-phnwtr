# Core Terraform configuration
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"  # AWS provider version ~> 5.0
      version = "~> 5.0"
    }
  }
}

# ElastiCache subnet group for multi-AZ deployment
resource "aws_elasticache_subnet_group" "redis" {
  name        = "${var.project_name}-${var.environment}-redis-subnet-group"
  description = "Subnet group for Redis cluster in ${var.environment} environment"
  subnet_ids  = var.database_subnet_ids

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-redis-subnet-group"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  )
}

# Redis parameter group with optimized settings
resource "aws_elasticache_parameter_group" "redis" {
  family      = "redis7"
  name        = "${var.project_name}-${var.environment}-redis-params"
  description = "Redis parameter group for ${var.environment} environment"

  # Performance and memory optimization parameters
  parameter {
    name  = "maxmemory-policy"
    value = "volatile-lru"  # Evict keys with TTL using LRU
  }

  parameter {
    name  = "activedefrag"
    value = "yes"  # Enable active defragmentation
  }

  parameter {
    name  = "maxmemory-samples"
    value = "10"  # Increase sample size for better LRU accuracy
  }

  # Session management and real-time data parameters
  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"  # Enable keyspace notifications for expired events
  }

  parameter {
    name  = "timeout"
    value = "300"  # Connection timeout in seconds
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-redis-params"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  )
}

# Security group for Redis cluster
resource "aws_security_group" "redis" {
  name        = "${var.project_name}-${var.environment}-redis-sg"
  description = "Security group for Redis cluster in ${var.environment} environment"
  vpc_id      = var.vpc_id

  # Ingress rule for Redis port
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = var.allowed_security_groups
    description     = "Allow Redis traffic from application tier"
  }

  # Egress rule for Redis cluster
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow outbound traffic"
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-redis-sg"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  )
}

# Redis replication group with multi-AZ support
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${var.project_name}-${var.environment}-redis"
  description         = "Redis cluster for ${var.environment} environment"

  # Node configuration
  node_type                  = "r6g.large"
  num_cache_clusters         = var.environment == "production" ? 3 : 2
  port                      = 6379
  preferred_cache_cluster_azs = var.availability_zones

  # Engine configuration
  engine                     = "redis"
  engine_version            = "7.0"
  parameter_group_name      = aws_elasticache_parameter_group.redis.name
  subnet_group_name         = aws_elasticache_subnet_group.redis.name
  security_group_ids        = [aws_security_group.redis.id]

  # High availability settings
  automatic_failover_enabled = true
  multi_az_enabled          = var.environment == "production" ? true : false
  maintenance_window        = "mon:03:00-mon:04:00"
  snapshot_window          = "02:00-03:00"
  snapshot_retention_limit = var.environment == "production" ? 7 : 1

  # Security settings
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = var.auth_token
  kms_key_id               = var.kms_key_id

  # Notification configuration
  notification_topic_arn    = var.sns_topic_arn

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-redis"
      Environment = var.environment
      ManagedBy   = "terraform"
      Purpose     = "session-and-realtime-cache"
    }
  )

  # Apply changes during maintenance window
  apply_immediately = var.environment != "production"

  lifecycle {
    prevent_destroy = var.environment == "production"
  }
}

# CloudWatch alarms for Redis monitoring
resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-cpu-utilization"
  alarm_description   = "Redis cluster CPU utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "CPUUtilization"
  namespace          = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "75"
  alarm_actions      = [var.sns_topic_arn]
  ok_actions         = [var.sns_topic_arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-redis-cpu-alarm"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  )
}

resource "aws_cloudwatch_metric_alarm" "redis_memory" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-memory"
  alarm_description   = "Redis cluster memory usage"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "DatabaseMemoryUsagePercentage"
  namespace          = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_actions      = [var.sns_topic_arn]
  ok_actions         = [var.sns_topic_arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.project_name}-${var.environment}-redis-memory-alarm"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  )
}