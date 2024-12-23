# VPC Core Outputs
output "vpc_id" {
  description = "ID of the created VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "vpc_dns_settings" {
  description = "DNS settings of the VPC including hostname and support flags"
  value = {
    enable_dns_hostnames = aws_vpc.main.enable_dns_hostnames
    enable_dns_support   = aws_vpc.main.enable_dns_support
  }
}

# Subnet IDs by Tier
output "public_subnet_ids" {
  description = "List of public subnet IDs for load balancer and NAT gateway deployment"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs for application workload deployment"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "List of database subnet IDs for RDS and ElastiCache deployment"
  value       = aws_subnet.database[*].id
}

# Availability Zone Mappings
output "subnet_availability_zones" {
  description = "Map of subnet tiers to their availability zones for HA planning"
  value = {
    public   = aws_subnet.public[*].availability_zone
    private  = aws_subnet.private[*].availability_zone
    database = aws_subnet.database[*].availability_zone
  }
}

# CIDR Block Information
output "public_subnet_cidrs" {
  description = "List of public subnet CIDR blocks"
  value       = aws_subnet.public[*].cidr_block
}

output "private_subnet_cidrs" {
  description = "List of private subnet CIDR blocks"
  value       = aws_subnet.private[*].cidr_block
}

output "database_subnet_cidrs" {
  description = "List of database subnet CIDR blocks"
  value       = aws_subnet.database[*].cidr_block
}

# Gateway Resources
output "nat_gateway_ids" {
  description = "List of NAT Gateway IDs for private subnet internet access"
  value       = aws_nat_gateway.main[*].id
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway for public subnet internet access"
  value       = aws_internet_gateway.main.id
}

# Route Table IDs
output "route_table_ids" {
  description = "Map of route table IDs by subnet tier"
  value = {
    public   = aws_route_table.public.id
    private  = aws_route_table.private[*].id
    database = aws_route_table.database[*].id
  }
}

# VPC Endpoint Information
output "vpc_endpoint_s3_id" {
  description = "ID of the S3 VPC Endpoint for secure AWS service access"
  value       = aws_vpc_endpoint.s3.id
}

# Flow Logs Configuration (if enabled)
output "flow_logs_config" {
  description = "VPC Flow Logs configuration details when enabled"
  value = var.enable_flow_logs ? {
    log_group_name = aws_cloudwatch_log_group.flow_logs[0].name
    log_group_arn  = aws_cloudwatch_log_group.flow_logs[0].arn
    role_arn       = aws_iam_role.flow_logs[0].arn
  } : null
}