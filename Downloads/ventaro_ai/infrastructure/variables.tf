# Ventaro AI - Terraform Variables Configuration
# Comprehensive variable definitions for infrastructure deployment

variable "aws_region" {
  description = "AWS region for primary deployment"
  type        = string
  default     = "us-west-2"
  
  validation {
    condition = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.aws_region))
    error_message = "AWS region must be in the format 'us-west-2'."
  }
}

variable "dr_region" {
  description = "AWS region for disaster recovery"
  type        = string
  default     = "us-east-1"
  
  validation {
    condition = can(regex("^[a-z]{2}-[a-z]+-[0-9]$", var.dr_region))
    error_message = "DR region must be in the format 'us-east-1'."
  }
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"
  
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production."
  }
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "ventaro-ai"
  
  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "Project name must contain only lowercase letters, numbers, and hyphens."
  }
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
  
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  
  validation {
    condition     = length(var.public_subnet_cidrs) >= 2
    error_message = "At least 2 public subnets are required for high availability."
  }
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
  
  validation {
    condition     = length(var.private_subnet_cidrs) >= 2
    error_message = "At least 2 private subnets are required for high availability."
  }
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]
  
  validation {
    condition     = length(var.database_subnet_cidrs) >= 2
    error_message = "At least 2 database subnets are required for RDS multi-AZ."
  }
}

# EKS Configuration
variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
  default     = "ventaro-ai-cluster"
  
  validation {
    condition     = can(regex("^[a-zA-Z0-9-]+$", var.cluster_name))
    error_message = "Cluster name must contain only alphanumeric characters and hyphens."
  }
}

variable "kubernetes_version" {
  description = "Kubernetes version for EKS cluster"
  type        = string
  default     = "1.28"
  
  validation {
    condition     = can(regex("^[0-9]+\\.[0-9]+$", var.kubernetes_version))
    error_message = "Kubernetes version must be in format 'X.Y'."
  }
}

variable "cluster_endpoint_public_access_cidrs" {
  description = "List of CIDR blocks that can access the EKS cluster endpoint"
  type        = list(string)
  default     = ["0.0.0.0/0"]
  
  validation {
    condition = alltrue([
      for cidr in var.cluster_endpoint_public_access_cidrs : can(cidrhost(cidr, 0))
    ])
    error_message = "All CIDR blocks must be valid IPv4 CIDR blocks."
  }
}

# Node Group Configuration
variable "general_node_instance_types" {
  description = "Instance types for general node group"
  type        = list(string)
  default     = ["t3.large", "t3.xlarge"]
  
  validation {
    condition     = length(var.general_node_instance_types) > 0
    error_message = "At least one instance type must be specified."
  }
}

variable "general_node_desired_size" {
  description = "Desired number of nodes in general node group"
  type        = number
  default     = 3
  
  validation {
    condition     = var.general_node_desired_size >= 1
    error_message = "Desired size must be at least 1."
  }
}

variable "general_node_max_size" {
  description = "Maximum number of nodes in general node group"
  type        = number
  default     = 10
  
  validation {
    condition     = var.general_node_max_size >= var.general_node_desired_size
    error_message = "Max size must be greater than or equal to desired size."
  }
}

variable "general_node_min_size" {
  description = "Minimum number of nodes in general node group"
  type        = number
  default     = 1
  
  validation {
    condition     = var.general_node_min_size >= 1 && var.general_node_min_size <= var.general_node_desired_size
    error_message = "Min size must be at least 1 and not greater than desired size."
  }
}

variable "gpu_node_instance_types" {
  description = "Instance types for GPU node group"
  type        = list(string)
  default     = ["g4dn.xlarge", "g4dn.2xlarge"]
  
  validation {
    condition     = length(var.gpu_node_instance_types) > 0
    error_message = "At least one GPU instance type must be specified."
  }
}

variable "gpu_node_desired_size" {
  description = "Desired number of nodes in GPU node group"
  type        = number
  default     = 2
  
  validation {
    condition     = var.gpu_node_desired_size >= 0
    error_message = "GPU node desired size must be non-negative."
  }
}

variable "gpu_node_max_size" {
  description = "Maximum number of nodes in GPU node group"
  type        = number
  default     = 5
  
  validation {
    condition     = var.gpu_node_max_size >= var.gpu_node_desired_size
    error_message = "GPU node max size must be greater than or equal to desired size."
  }
}

variable "gpu_node_min_size" {
  description = "Minimum number of nodes in GPU node group"
  type        = number
  default     = 0
  
  validation {
    condition     = var.gpu_node_min_size >= 0 && var.gpu_node_min_size <= var.gpu_node_desired_size
    error_message = "GPU node min size must be non-negative and not greater than desired size."
  }
}

# RDS Configuration
variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6g.large"
  
  validation {
    condition     = can(regex("^db\\.[a-z0-9]+\\.[a-z0-9]+$", var.rds_instance_class))
    error_message = "RDS instance class must be in format 'db.family.size'."
  }
}

variable "rds_allocated_storage" {
  description = "Initial allocated storage for RDS instance (GB)"
  type        = number
  default     = 100
  
  validation {
    condition     = var.rds_allocated_storage >= 20
    error_message = "RDS allocated storage must be at least 20 GB."
  }
}

variable "rds_max_allocated_storage" {
  description = "Maximum allocated storage for RDS instance (GB)"
  type        = number
  default     = 1000
  
  validation {
    condition     = var.rds_max_allocated_storage >= var.rds_allocated_storage
    error_message = "RDS max allocated storage must be greater than or equal to allocated storage."
  }
}

variable "rds_backup_retention_period" {
  description = "Number of days to retain RDS backups"
  type        = number
  default     = 30
  
  validation {
    condition     = var.rds_backup_retention_period >= 1 && var.rds_backup_retention_period <= 35
    error_message = "RDS backup retention period must be between 1 and 35 days."
  }
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ deployment for RDS"
  type        = bool
  default     = true
}

variable "rds_deletion_protection" {
  description = "Enable deletion protection for RDS"
  type        = bool
  default     = true
}

# ElastiCache Configuration
variable "redis_node_type" {
  description = "ElastiCache Redis node type"
  type        = string
  default     = "cache.r6g.large"
  
  validation {
    condition     = can(regex("^cache\\.[a-z0-9]+\\.[a-z0-9]+$", var.redis_node_type))
    error_message = "Redis node type must be in format 'cache.family.size'."
  }
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes in Redis cluster"
  type        = number
  default     = 3
  
  validation {
    condition     = var.redis_num_cache_nodes >= 1
    error_message = "Number of Redis cache nodes must be at least 1."
  }
}

variable "redis_automatic_failover" {
  description = "Enable automatic failover for Redis"
  type        = bool
  default     = true
}

variable "redis_multi_az" {
  description = "Enable Multi-AZ for Redis"
  type        = bool
  default     = true
}

# S3 Configuration
variable "s3_versioning_enabled" {
  description = "Enable versioning for S3 buckets"
  type        = bool
  default     = true
}

variable "s3_lifecycle_enabled" {
  description = "Enable lifecycle management for S3 buckets"
  type        = bool
  default     = true
}

variable "s3_transition_to_ia_days" {
  description = "Number of days before transitioning objects to IA storage class"
  type        = number
  default     = 30
  
  validation {
    condition     = var.s3_transition_to_ia_days >= 30
    error_message = "Transition to IA must be at least 30 days."
  }
}

variable "s3_transition_to_glacier_days" {
  description = "Number of days before transitioning objects to Glacier storage class"
  type        = number
  default     = 90
  
  validation {
    condition     = var.s3_transition_to_glacier_days >= 90
    error_message = "Transition to Glacier must be at least 90 days."
  }
}

variable "s3_expiration_days" {
  description = "Number of days before objects expire"
  type        = number
  default     = 2555  # 7 years
  
  validation {
    condition     = var.s3_expiration_days > var.s3_transition_to_glacier_days
    error_message = "Expiration days must be greater than Glacier transition days."
  }
}

# CloudWatch Configuration
variable "cloudwatch_log_retention_days" {
  description = "Number of days to retain CloudWatch logs"
  type        = number
  default     = 30
  
  validation {
    condition = contains([
      1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653
    ], var.cloudwatch_log_retention_days)
    error_message = "CloudWatch log retention must be a valid retention period."
  }
}

variable "enable_detailed_monitoring" {
  description = "Enable detailed monitoring for EC2 instances"
  type        = bool
  default     = true
}

# Security Configuration
variable "enable_waf" {
  description = "Enable AWS WAF for the application"
  type        = bool
  default     = true
}

variable "waf_rate_limit" {
  description = "Rate limit for WAF (requests per 5 minutes)"
  type        = number
  default     = 2000
  
  validation {
    condition     = var.waf_rate_limit >= 100
    error_message = "WAF rate limit must be at least 100 requests per 5 minutes."
  }
}

variable "enable_guardduty" {
  description = "Enable AWS GuardDuty for threat detection"
  type        = bool
  default     = true
}

variable "enable_config" {
  description = "Enable AWS Config for compliance monitoring"
  type        = bool
  default     = true
}

variable "enable_cloudtrail" {
  description = "Enable AWS CloudTrail for audit logging"
  type        = bool
  default     = true
}

# SSL/TLS Configuration
variable "ssl_certificate_arn" {
  description = "ARN of the SSL certificate for HTTPS"
  type        = string
  default     = ""
}

variable "domain_name" {
  description = "Primary domain name for the application"
  type        = string
  default     = "ventaro.ai"
  
  validation {
    condition     = can(regex("^[a-z0-9.-]+\\.[a-z]{2,}$", var.domain_name))
    error_message = "Domain name must be a valid domain format."
  }
}

variable "subdomain_names" {
  description = "List of subdomain names"
  type        = list(string)
  default     = ["app", "api", "ai", "edge", "iot", "admin"]
}

# Auto Scaling Configuration
variable "enable_cluster_autoscaler" {
  description = "Enable Kubernetes Cluster Autoscaler"
  type        = bool
  default     = true
}

variable "enable_horizontal_pod_autoscaler" {
  description = "Enable Horizontal Pod Autoscaler"
  type        = bool
  default     = true
}

variable "enable_vertical_pod_autoscaler" {
  description = "Enable Vertical Pod Autoscaler"
  type        = bool
  default     = true
}

# Backup Configuration
variable "backup_retention_period" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
  
  validation {
    condition     = var.backup_retention_period >= 1
    error_message = "Backup retention period must be at least 1 day."
  }
}

variable "enable_cross_region_backup" {
  description = "Enable cross-region backup replication"
  type        = bool
  default     = true
}

# Cost Optimization
variable "enable_spot_instances" {
  description = "Enable Spot instances for cost optimization"
  type        = bool
  default     = false
}

variable "spot_instance_percentage" {
  description = "Percentage of Spot instances in node groups"
  type        = number
  default     = 50
  
  validation {
    condition     = var.spot_instance_percentage >= 0 && var.spot_instance_percentage <= 100
    error_message = "Spot instance percentage must be between 0 and 100."
  }
}

# Notification Configuration
variable "notification_email" {
  description = "Email address for notifications"
  type        = string
  default     = "admin@ventaro.ai"
  
  validation {
    condition     = can(regex("^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.notification_email))
    error_message = "Notification email must be a valid email address."
  }
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for notifications"
  type        = string
  default     = ""
  sensitive   = true
}

# Feature Flags
variable "enable_ai_features" {
  description = "Enable AI/ML specific features and resources"
  type        = bool
  default     = true
}

variable "enable_iot_features" {
  description = "Enable IoT specific features and resources"
  type        = bool
  default     = true
}

variable "enable_edge_computing" {
  description = "Enable edge computing features and resources"
  type        = bool
  default     = true
}

variable "enable_blockchain_features" {
  description = "Enable blockchain specific features and resources"
  type        = bool
  default     = true
}

variable "enable_ar_vr_features" {
  description = "Enable AR/VR specific features and resources"
  type        = bool
  default     = true
}

# Performance Configuration
variable "enable_performance_insights" {
  description = "Enable Performance Insights for RDS"
  type        = bool
  default     = true
}

variable "performance_insights_retention_period" {
  description = "Performance Insights retention period in days"
  type        = number
  default     = 7
  
  validation {
    condition = contains([7, 31, 62, 93, 124, 155, 186, 217, 248, 279, 310, 341, 372, 403, 434, 465, 496, 527, 558, 589, 620, 651, 682, 713, 731], var.performance_insights_retention_period)
    error_message = "Performance Insights retention period must be a valid value."
  }
}

# Disaster Recovery Configuration
variable "enable_disaster_recovery" {
  description = "Enable disaster recovery setup"
  type        = bool
  default     = true
}

variable "dr_backup_schedule" {
  description = "Cron expression for disaster recovery backup schedule"
  type        = string
  default     = "0 2 * * *"  # Daily at 2 AM
  
  validation {
    condition     = can(regex("^[0-9*,-/]+ [0-9*,-/]+ [0-9*,-/]+ [0-9*,-/]+ [0-9*,-/]+$", var.dr_backup_schedule))
    error_message = "DR backup schedule must be a valid cron expression."
  }
}

# Resource Tagging
variable "additional_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "cost_center" {
  description = "Cost center for resource billing"
  type        = string
  default     = "Engineering"
}

variable "owner" {
  description = "Owner of the resources"
  type        = string
  default     = "DevOps Team"
}

variable "compliance_framework" {
  description = "Compliance framework (SOC2, HIPAA, PCI-DSS, etc.)"
  type        = string
  default     = "SOC2"
  
  validation {
    condition     = contains(["SOC2", "HIPAA", "PCI-DSS", "GDPR", "ISO27001", "FedRAMP"], var.compliance_framework)
    error_message = "Compliance framework must be one of: SOC2, HIPAA, PCI-DSS, GDPR, ISO27001, FedRAMP."
  }
}

# Development Configuration
variable "enable_development_tools" {
  description = "Enable development and debugging tools"
  type        = bool
  default     = false
}

variable "enable_bastion_host" {
  description = "Enable bastion host for secure access"
  type        = bool
  default     = false
}

variable "bastion_instance_type" {
  description = "Instance type for bastion host"
  type        = string
  default     = "t3.micro"
}

# API Gateway Configuration
variable "enable_api_gateway" {
  description = "Enable API Gateway for external API access"
  type        = bool
  default     = true
}

variable "api_gateway_throttle_rate" {
  description = "API Gateway throttle rate (requests per second)"
  type        = number
  default     = 1000
  
  validation {
    condition     = var.api_gateway_throttle_rate >= 1
    error_message = "API Gateway throttle rate must be at least 1 request per second."
  }
}

variable "api_gateway_throttle_burst" {
  description = "API Gateway throttle burst limit"
  type        = number
  default     = 2000
  
  validation {
    condition     = var.api_gateway_throttle_burst >= var.api_gateway_throttle_rate
    error_message = "API Gateway throttle burst must be greater than or equal to throttle rate."
  }
}

# Content Delivery Network
variable "enable_cloudfront" {
  description = "Enable CloudFront CDN"
  type        = bool
  default     = true
}

variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_All"
  
  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.cloudfront_price_class)
    error_message = "CloudFront price class must be one of: PriceClass_100, PriceClass_200, PriceClass_All."
  }
}

variable "cloudfront_minimum_protocol_version" {
  description = "Minimum SSL/TLS protocol version for CloudFront"
  type        = string
  default     = "TLSv1.2_2021"
  
  validation {
    condition = contains([
      "SSLv3", "TLSv1", "TLSv1_2016", "TLSv1.1_2016", "TLSv1.2_2018", "TLSv1.2_2019", "TLSv1.2_2021"
    ], var.cloudfront_minimum_protocol_version)
    error_message = "CloudFront minimum protocol version must be a valid SSL/TLS version."
  }
}