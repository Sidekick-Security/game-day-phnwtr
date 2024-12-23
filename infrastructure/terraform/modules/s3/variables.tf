# Terraform AWS S3 Module Variables
# Version: ~> 1.5

variable "project_name" {
  description = "Name of the project used for bucket naming (gameday-platform)"
  type        = string
  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens."
  }
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod", "dr"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod, dr."
  }
}

variable "force_destroy" {
  description = "Boolean flag to indicate if the bucket can be destroyed even if it contains objects"
  type        = bool
  default     = false
}

variable "versioning_enabled" {
  description = "Boolean flag to enable versioning on the bucket"
  type        = bool
  default     = true
}

variable "lifecycle_rules" {
  description = "List of lifecycle rules to configure for the bucket"
  type = list(object({
    id                                     = string
    enabled                               = bool
    prefix                                = optional(string)
    tags                                  = optional(map(string))
    abort_incomplete_multipart_upload_days = optional(number)

    expiration = optional(object({
      days                         = optional(number)
      expired_object_delete_marker = optional(bool)
    }))

    transition = optional(list(object({
      days          = number
      storage_class = string
    })))

    noncurrent_version_expiration = optional(object({
      days = number
    }))

    noncurrent_version_transition = optional(list(object({
      days          = number
      storage_class = string
    })))
  }))
  default = [
    {
      id      = "default-lifecycle"
      enabled = true
      
      transition = [
        {
          days          = 90
          storage_class = "STANDARD_IA"
        },
        {
          days          = 180
          storage_class = "GLACIER"
        }
      ]
      
      noncurrent_version_expiration = {
        days = 90
      }
      
      abort_incomplete_multipart_upload_days = 7
    }
  ]
}

variable "tags" {
  description = "Map of tags to assign to the bucket"
  type        = map(string)
  default = {
    Terraform   = "true"
    Service     = "gameday-platform"
    Environment = "prod"
  }
  validation {
    condition     = length(var.tags) > 0
    error_message = "At least one tag must be specified."
  }
}

variable "encryption_configuration" {
  description = "Server-side encryption configuration for the bucket"
  type = object({
    sse_algorithm     = string
    kms_master_key_id = optional(string)
  })
  default = {
    sse_algorithm = "AES256"
  }
  validation {
    condition     = contains(["AES256", "aws:kms"], var.encryption_configuration.sse_algorithm)
    error_message = "SSE algorithm must be either AES256 or aws:kms."
  }
}

variable "cors_rules" {
  description = "List of CORS rules for the bucket"
  type = list(object({
    allowed_headers = list(string)
    allowed_methods = list(string)
    allowed_origins = list(string)
    expose_headers  = optional(list(string))
    max_age_seconds = optional(number)
  }))
  default = [
    {
      allowed_headers = ["*"]
      allowed_methods = ["GET", "HEAD"]
      allowed_origins = ["https://*.gameday-platform.com"]
      max_age_seconds = 3600
    }
  ]
}

variable "block_public_access" {
  description = "Settings for bucket public access blocking"
  type = object({
    block_public_acls       = bool
    block_public_policy     = bool
    ignore_public_acls      = bool
    restrict_public_buckets = bool
  })
  default = {
    block_public_acls       = true
    block_public_policy     = true
    ignore_public_acls      = true
    restrict_public_buckets = true
  }
}