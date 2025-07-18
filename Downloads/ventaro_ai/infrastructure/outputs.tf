# Ventaro AI - Terraform Outputs Configuration
# Expose important infrastructure values for external use

# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "vpc_arn" {
  description = "ARN of the VPC"
  value       = aws_vpc.main.arn
}

# Subnet Outputs
output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "IDs of the database subnets"
  value       = aws_subnet.database[*].id
}

output "public_subnet_cidrs" {
  description = "CIDR blocks of the public subnets"
  value       = aws_subnet.public[*].cidr_block
}

output "private_subnet_cidrs" {
  description = "CIDR blocks of the private subnets"
  value       = aws_subnet.private[*].cidr_block
}

output "database_subnet_cidrs" {
  description = "CIDR blocks of the database subnets"
  value       = aws_subnet.database[*].cidr_block
}

# Internet Gateway Outputs
output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = aws_internet_gateway.main.id
}

# NAT Gateway Outputs
output "nat_gateway_ids" {
  description = "IDs of the NAT Gateways"
  value       = aws_nat_gateway.main[*].id
}

output "nat_gateway_public_ips" {
  description = "Public IP addresses of the NAT Gateways"
  value       = aws_eip.nat[*].public_ip
}

# Security Group Outputs
output "eks_cluster_security_group_id" {
  description = "Security group ID for EKS cluster"
  value       = aws_security_group.eks_cluster.id
}

output "eks_nodes_security_group_id" {
  description = "Security group ID for EKS nodes"
  value       = aws_security_group.eks_nodes.id
}

output "rds_security_group_id" {
  description = "Security group ID for RDS"
  value       = aws_security_group.rds.id
}

output "elasticache_security_group_id" {
  description = "Security group ID for ElastiCache"
  value       = aws_security_group.elasticache.id
}

output "alb_security_group_id" {
  description = "Security group ID for Application Load Balancer"
  value       = aws_security_group.alb.id
}

# EKS Cluster Outputs
output "eks_cluster_id" {
  description = "EKS cluster ID"
  value       = aws_eks_cluster.main.id
}

output "eks_cluster_arn" {
  description = "EKS cluster ARN"
  value       = aws_eks_cluster.main.arn
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "eks_cluster_version" {
  description = "EKS cluster Kubernetes version"
  value       = aws_eks_cluster.main.version
}

output "eks_cluster_platform_version" {
  description = "EKS cluster platform version"
  value       = aws_eks_cluster.main.platform_version
}

output "eks_cluster_status" {
  description = "EKS cluster status"
  value       = aws_eks_cluster.main.status
}

output "eks_cluster_certificate_authority" {
  description = "EKS cluster certificate authority data"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

output "eks_cluster_security_group_ids" {
  description = "Security group IDs attached to the EKS cluster"
  value       = aws_eks_cluster.main.vpc_config[0].security_group_ids
}

output "eks_cluster_vpc_config" {
  description = "EKS cluster VPC configuration"
  value = {
    subnet_ids              = aws_eks_cluster.main.vpc_config[0].subnet_ids
    endpoint_private_access = aws_eks_cluster.main.vpc_config[0].endpoint_private_access
    endpoint_public_access  = aws_eks_cluster.main.vpc_config[0].endpoint_public_access
    public_access_cidrs     = aws_eks_cluster.main.vpc_config[0].public_access_cidrs
  }
}

# EKS Node Group Outputs
output "eks_node_group_general_arn" {
  description = "ARN of the general EKS node group"
  value       = aws_eks_node_group.general.arn
}

output "eks_node_group_general_status" {
  description = "Status of the general EKS node group"
  value       = aws_eks_node_group.general.status
}

output "eks_node_group_gpu_arn" {
  description = "ARN of the GPU EKS node group"
  value       = aws_eks_node_group.gpu.arn
}

output "eks_node_group_gpu_status" {
  description = "Status of the GPU EKS node group"
  value       = aws_eks_node_group.gpu.status
}

# IAM Role Outputs
output "eks_cluster_role_arn" {
  description = "ARN of the EKS cluster IAM role"
  value       = aws_iam_role.eks_cluster.arn
}

output "eks_nodes_role_arn" {
  description = "ARN of the EKS nodes IAM role"
  value       = aws_iam_role.eks_nodes.arn
}

output "rds_monitoring_role_arn" {
  description = "ARN of the RDS monitoring IAM role"
  value       = aws_iam_role.rds_monitoring.arn
}

# RDS Outputs
output "rds_instance_id" {
  description = "RDS instance ID"
  value       = aws_db_instance.main.id
}

output "rds_instance_arn" {
  description = "RDS instance ARN"
  value       = aws_db_instance.main.arn
}

output "rds_instance_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "rds_instance_port" {
  description = "RDS instance port"
  value       = aws_db_instance.main.port
}

output "rds_instance_address" {
  description = "RDS instance address"
  value       = aws_db_instance.main.address
}

output "rds_instance_hosted_zone_id" {
  description = "RDS instance hosted zone ID"
  value       = aws_db_instance.main.hosted_zone_id
}

output "rds_instance_resource_id" {
  description = "RDS instance resource ID"
  value       = aws_db_instance.main.resource_id
}

output "rds_instance_status" {
  description = "RDS instance status"
  value       = aws_db_instance.main.status
}

output "rds_instance_engine_version" {
  description = "RDS instance engine version"
  value       = aws_db_instance.main.engine_version
}

output "rds_subnet_group_name" {
  description = "RDS subnet group name"
  value       = aws_db_subnet_group.main.name
}

# ElastiCache Outputs
output "elasticache_replication_group_id" {
  description = "ElastiCache replication group ID"
  value       = aws_elasticache_replication_group.main.id
}

output "elasticache_replication_group_arn" {
  description = "ElastiCache replication group ARN"
  value       = aws_elasticache_replication_group.main.arn
}

output "elasticache_primary_endpoint" {
  description = "ElastiCache primary endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "elasticache_reader_endpoint" {
  description = "ElastiCache reader endpoint"
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
}

output "elasticache_port" {
  description = "ElastiCache port"
  value       = aws_elasticache_replication_group.main.port
}

output "elasticache_configuration_endpoint" {
  description = "ElastiCache configuration endpoint"
  value       = aws_elasticache_replication_group.main.configuration_endpoint_address
}

# S3 Bucket Outputs
output "s3_bucket_ventaro_storage_id" {
  description = "Ventaro storage S3 bucket ID"
  value       = aws_s3_bucket.ventaro_storage.id
}

output "s3_bucket_ventaro_storage_arn" {
  description = "Ventaro storage S3 bucket ARN"
  value       = aws_s3_bucket.ventaro_storage.arn
}

output "s3_bucket_ventaro_storage_domain_name" {
  description = "Ventaro storage S3 bucket domain name"
  value       = aws_s3_bucket.ventaro_storage.bucket_domain_name
}

output "s3_bucket_ventaro_storage_regional_domain_name" {
  description = "Ventaro storage S3 bucket regional domain name"
  value       = aws_s3_bucket.ventaro_storage.bucket_regional_domain_name
}

output "s3_bucket_alb_logs_id" {
  description = "ALB logs S3 bucket ID"
  value       = aws_s3_bucket.alb_logs.id
}

output "s3_bucket_alb_logs_arn" {
  description = "ALB logs S3 bucket ARN"
  value       = aws_s3_bucket.alb_logs.arn
}

# Application Load Balancer Outputs
output "alb_id" {
  description = "Application Load Balancer ID"
  value       = aws_lb.main.id
}

output "alb_arn" {
  description = "Application Load Balancer ARN"
  value       = aws_lb.main.arn
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Application Load Balancer zone ID"
  value       = aws_lb.main.zone_id
}

output "alb_hosted_zone_id" {
  description = "Application Load Balancer hosted zone ID"
  value       = aws_lb.main.zone_id
}

# KMS Key Outputs
output "kms_key_id" {
  description = "KMS key ID"
  value       = aws_kms_key.ventaro_key.key_id
}

output "kms_key_arn" {
  description = "KMS key ARN"
  value       = aws_kms_key.ventaro_key.arn
}

output "kms_key_alias" {
  description = "KMS key alias"
  value       = aws_kms_alias.ventaro_key_alias.name
}

# Secrets Manager Outputs
output "secrets_manager_db_password_arn" {
  description = "Secrets Manager database password ARN"
  value       = aws_secretsmanager_secret.db_password.arn
  sensitive   = true
}

output "secrets_manager_redis_password_arn" {
  description = "Secrets Manager Redis password ARN"
  value       = aws_secretsmanager_secret.redis_password.arn
  sensitive   = true
}

# CloudWatch Outputs
output "cloudwatch_log_group_eks_name" {
  description = "CloudWatch log group name for EKS"
  value       = aws_cloudwatch_log_group.eks_cluster.name
}

output "cloudwatch_log_group_eks_arn" {
  description = "CloudWatch log group ARN for EKS"
  value       = aws_cloudwatch_log_group.eks_cluster.arn
}

output "cloudwatch_log_group_redis_name" {
  description = "CloudWatch log group name for Redis"
  value       = aws_cloudwatch_log_group.redis.name
}

output "cloudwatch_log_group_redis_arn" {
  description = "CloudWatch log group ARN for Redis"
  value       = aws_cloudwatch_log_group.redis.arn
}

# SNS Topic Outputs
output "sns_topic_alerts_arn" {
  description = "SNS topic ARN for alerts"
  value       = aws_sns_topic.alerts.arn
}

output "sns_topic_alerts_name" {
  description = "SNS topic name for alerts"
  value       = aws_sns_topic.alerts.name
}

# WAF Outputs
output "waf_web_acl_id" {
  description = "WAF Web ACL ID"
  value       = aws_wafv2_web_acl.main.id
}

output "waf_web_acl_arn" {
  description = "WAF Web ACL ARN"
  value       = aws_wafv2_web_acl.main.arn
}

# Availability Zones
output "availability_zones" {
  description = "List of availability zones used"
  value       = data.aws_availability_zones.available.names
}

# Account Information
output "aws_account_id" {
  description = "AWS Account ID"
  value       = data.aws_caller_identity.current.account_id
}

output "aws_region" {
  description = "AWS Region"
  value       = data.aws_region.current.name
}

# Connection Information for Applications
output "database_connection_info" {
  description = "Database connection information"
  value = {
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    database = aws_db_instance.main.db_name
    username = aws_db_instance.main.username
  }
  sensitive = true
}

output "redis_connection_info" {
  description = "Redis connection information"
  value = {
    primary_endpoint = aws_elasticache_replication_group.main.primary_endpoint_address
    reader_endpoint  = aws_elasticache_replication_group.main.reader_endpoint_address
    port            = aws_elasticache_replication_group.main.port
  }
  sensitive = true
}

# Kubernetes Configuration
output "kubeconfig_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

output "kubectl_config" {
  description = "kubectl config for connecting to the EKS cluster"
  value = {
    cluster_name                     = aws_eks_cluster.main.name
    endpoint                        = aws_eks_cluster.main.endpoint
    certificate_authority_data      = aws_eks_cluster.main.certificate_authority[0].data
    region                         = data.aws_region.current.name
    cluster_arn                    = aws_eks_cluster.main.arn
  }
  sensitive = true
}

# Network Configuration Summary
output "network_configuration" {
  description = "Network configuration summary"
  value = {
    vpc_id                = aws_vpc.main.id
    vpc_cidr             = aws_vpc.main.cidr_block
    public_subnets       = aws_subnet.public[*].id
    private_subnets      = aws_subnet.private[*].id
    database_subnets     = aws_subnet.database[*].id
    internet_gateway_id  = aws_internet_gateway.main.id
    nat_gateway_ids      = aws_nat_gateway.main[*].id
    availability_zones   = data.aws_availability_zones.available.names
  }
}

# Security Configuration Summary
output "security_configuration" {
  description = "Security configuration summary"
  value = {
    kms_key_id                    = aws_kms_key.ventaro_key.key_id
    waf_web_acl_id               = aws_wafv2_web_acl.main.id
    eks_cluster_security_group   = aws_security_group.eks_cluster.id
    eks_nodes_security_group     = aws_security_group.eks_nodes.id
    rds_security_group           = aws_security_group.rds.id
    elasticache_security_group   = aws_security_group.elasticache.id
    alb_security_group           = aws_security_group.alb.id
  }
}

# Resource ARNs for Cross-Service Access
output "resource_arns" {
  description = "ARNs of key resources for cross-service access"
  value = {
    eks_cluster                = aws_eks_cluster.main.arn
    rds_instance              = aws_db_instance.main.arn
    elasticache_replication_group = aws_elasticache_replication_group.main.arn
    s3_bucket_storage         = aws_s3_bucket.ventaro_storage.arn
    s3_bucket_logs           = aws_s3_bucket.alb_logs.arn
    kms_key                  = aws_kms_key.ventaro_key.arn
    sns_topic_alerts         = aws_sns_topic.alerts.arn
    waf_web_acl              = aws_wafv2_web_acl.main.arn
    application_load_balancer = aws_lb.main.arn
  }
}

# Environment Information
output "environment_info" {
  description = "Environment configuration information"
  value = {
    environment           = var.environment
    project_name         = var.project_name
    cluster_name         = var.cluster_name
    kubernetes_version   = var.kubernetes_version
    aws_region          = var.aws_region
    dr_region           = var.dr_region
    domain_name         = var.domain_name
  }
}

# Cost Optimization Information
output "cost_optimization_info" {
  description = "Cost optimization configuration"
  value = {
    spot_instances_enabled    = var.enable_spot_instances
    spot_instance_percentage = var.spot_instance_percentage
    general_node_instance_types = var.general_node_instance_types
    gpu_node_instance_types    = var.gpu_node_instance_types
    rds_instance_class        = var.rds_instance_class
    redis_node_type          = var.redis_node_type
  }
}

# Monitoring and Alerting Information
output "monitoring_info" {
  description = "Monitoring and alerting configuration"
  value = {
    cloudwatch_log_retention_days = var.cloudwatch_log_retention_days
    performance_insights_enabled  = var.enable_performance_insights
    detailed_monitoring_enabled   = var.enable_detailed_monitoring
    sns_alerts_topic             = aws_sns_topic.alerts.arn
    notification_email           = var.notification_email
  }
}

# Feature Flags Status
output "feature_flags" {
  description = "Status of feature flags"
  value = {
    ai_features         = var.enable_ai_features
    iot_features        = var.enable_iot_features
    edge_computing      = var.enable_edge_computing
    blockchain_features = var.enable_blockchain_features
    ar_vr_features      = var.enable_ar_vr_features
    waf_enabled         = var.enable_waf
    guardduty_enabled   = var.enable_guardduty
    config_enabled      = var.enable_config
    cloudtrail_enabled  = var.enable_cloudtrail
  }
}