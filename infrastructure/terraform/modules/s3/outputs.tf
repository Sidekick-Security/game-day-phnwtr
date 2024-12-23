# Output definitions for AWS S3 bucket module
# Version: ~> 5.0
# Purpose: Exposes essential S3 bucket attributes for integration with other platform components

output "bucket_id" {
  description = "The unique identifier of the S3 bucket used for direct bucket references and access"
  value       = aws_s3_bucket.main.id
  sensitive   = false
}

output "bucket_arn" {
  description = "The ARN of the S3 bucket used for IAM policy configuration and cross-account access"
  value       = aws_s3_bucket.main.arn
  sensitive   = false
}

output "bucket_domain_name" {
  description = "The domain name of the S3 bucket used for constructing URLs for object access"
  value       = aws_s3_bucket.main.bucket_domain_name
  sensitive   = false
}