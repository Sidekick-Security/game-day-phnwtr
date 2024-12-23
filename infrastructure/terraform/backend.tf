# Backend configuration for GameDay Platform Terraform state management
# Version: 5.0+ (AWS Provider)
# Purpose: Manages Terraform state with encryption, versioning, and cross-region replication

terraform {
  backend "s3" {
    # Primary state storage configuration
    bucket         = "${var.project_name}-${var.environment}-terraform-state"
    key            = "terraform.tfstate"
    region         = "${var.aws_region}"
    
    # Enhanced encryption configuration
    encrypt        = true
    kms_key_id     = "alias/terraform-state-key"
    
    # State locking configuration using DynamoDB
    dynamodb_table = "${var.project_name}-${var.environment}-terraform-locks"
    
    # Force SSL/TLS for all operations
    force_ssl      = true
    
    # Enable versioning and access logging
    versioning     = true
    
    # Additional security configurations
    block_public_acls       = true
    block_public_policy     = true
    ignore_public_acls      = true
    restrict_public_buckets = true
    
    # Cross-region replication settings
    replica_region = "${var.secondary_aws_region}"
    replica_kms_key_id = "alias/terraform-state-key-replica"
    
    # Access control and authentication
    iam_endpoint    = "sts.amazonaws.com"
    sts_endpoint    = "sts.amazonaws.com"
    
    # Lifecycle rules for state management
    lifecycle_rule = {
      enabled = true
      noncurrent_version_expiration = {
        days = 90
      }
      abort_incomplete_multipart_upload = {
        days_after_initiation = 7
      }
    }
    
    # Server-side encryption configuration
    server_side_encryption_configuration = {
      rule = {
        apply_server_side_encryption_by_default = {
          kms_master_key_id = "alias/terraform-state-key"
          sse_algorithm     = "aws:kms"
        }
      }
    }
  }
}

# Required provider configuration
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  # Terraform version constraint
  required_version = ">= 1.0.0"
}