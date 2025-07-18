# Ventaro AI - Additional AWS Services Configuration
# CloudFront, API Gateway, Lambda, and other supporting services

# CloudFront Distribution
resource "aws_cloudfront_origin_access_control" "main" {
  name                              = "ventaro-ai-oac"
  description                       = "Origin Access Control for Ventaro AI"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "main" {
  count = var.enable_cloudfront ? 1 : 0
  
  origin {
    domain_name              = aws_s3_bucket.ventaro_storage.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.main.id
    origin_id                = "S3-${aws_s3_bucket.ventaro_storage.id}"
  }
  
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "ALB-${aws_lb.main.name}"
    
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }
  
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Ventaro AI CloudFront Distribution"
  default_root_object = "index.html"
  
  aliases = var.domain_name != "" ? [var.domain_name, "www.${var.domain_name}"] : []
  
  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALB-${aws_lb.main.name}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
    
    forwarded_values {
      query_string = true
      headers      = ["Host", "CloudFront-Forwarded-Proto", "CloudFront-Is-Desktop-Viewer", "CloudFront-Is-Mobile-Viewer"]
      
      cookies {
        forward = "all"
      }
    }
    
    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }
  
  ordered_cache_behavior {
    path_pattern           = "/api/*"
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = "ALB-${aws_lb.main.name}"
    compress               = true
    viewer_protocol_policy = "https-only"
    
    forwarded_values {
      query_string = true
      headers      = ["*"]
      
      cookies {
        forward = "all"
      }
    }
    
    min_ttl     = 0
    default_ttl = 0
    max_ttl     = 0
  }
  
  ordered_cache_behavior {
    path_pattern           = "/static/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "S3-${aws_s3_bucket.ventaro_storage.id}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
    
    forwarded_values {
      query_string = false
      
      cookies {
        forward = "none"
      }
    }
    
    min_ttl     = 86400
    default_ttl = 604800
    max_ttl     = 31536000
  }
  
  price_class = var.cloudfront_price_class
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
  
  viewer_certificate {
    cloudfront_default_certificate = var.ssl_certificate_arn == ""
    acm_certificate_arn           = var.ssl_certificate_arn != "" ? var.ssl_certificate_arn : null
    ssl_support_method            = var.ssl_certificate_arn != "" ? "sni-only" : null
    minimum_protocol_version      = var.cloudfront_minimum_protocol_version
  }
  
  web_acl_id = aws_wafv2_web_acl.main.arn
  
  logging_config {
    include_cookies = false
    bucket          = aws_s3_bucket.cloudfront_logs[0].bucket_domain_name
    prefix          = "cloudfront-logs/"
  }
  
  tags = {
    Name = "ventaro-ai-cloudfront"
  }
}

# S3 bucket for CloudFront logs
resource "aws_s3_bucket" "cloudfront_logs" {
  count = var.enable_cloudfront ? 1 : 0
  
  bucket = "ventaro-ai-cloudfront-logs-${random_id.bucket_suffix.hex}"
  
  tags = {
    Name = "Ventaro AI CloudFront Logs"
  }
}

resource "aws_s3_bucket_public_access_block" "cloudfront_logs" {
  count = var.enable_cloudfront ? 1 : 0
  
  bucket = aws_s3_bucket.cloudfront_logs[0].id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# API Gateway
resource "aws_api_gateway_rest_api" "main" {
  count = var.enable_api_gateway ? 1 : 0
  
  name        = "ventaro-ai-api"
  description = "Ventaro AI REST API Gateway"
  
  endpoint_configuration {
    types = ["REGIONAL"]
  }
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = "*"
        Action = "execute-api:Invoke"
        Resource = "*"
        Condition = {
          IpAddress = {
            "aws:SourceIp" = ["0.0.0.0/0"]
          }
        }
      }
    ]
  })
  
  tags = {
    Name = "ventaro-ai-api-gateway"
  }
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "main" {
  count = var.enable_api_gateway ? 1 : 0
  
  depends_on = [
    aws_api_gateway_method.proxy,
    aws_api_gateway_integration.proxy,
  ]
  
  rest_api_id = aws_api_gateway_rest_api.main[0].id
  stage_name  = var.environment
  
  variables = {
    deployed_at = timestamp()
  }
  
  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway Stage
resource "aws_api_gateway_stage" "main" {
  count = var.enable_api_gateway ? 1 : 0
  
  deployment_id = aws_api_gateway_deployment.main[0].id
  rest_api_id   = aws_api_gateway_rest_api.main[0].id
  stage_name    = var.environment
  
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway[0].arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      caller         = "$context.identity.caller"
      user           = "$context.identity.user"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }
  
  xray_tracing_enabled = true
  
  tags = {
    Name = "ventaro-ai-api-stage"
  }
}

# API Gateway Method Settings
resource "aws_api_gateway_method_settings" "main" {
  count = var.enable_api_gateway ? 1 : 0
  
  rest_api_id = aws_api_gateway_rest_api.main[0].id
  stage_name  = aws_api_gateway_stage.main[0].stage_name
  method_path = "*/*"
  
  settings {
    metrics_enabled    = true
    logging_level      = "INFO"
    data_trace_enabled = true
    
    throttling_rate_limit  = var.api_gateway_throttle_rate
    throttling_burst_limit = var.api_gateway_throttle_burst
  }
}

# API Gateway Resource
resource "aws_api_gateway_resource" "proxy" {
  count = var.enable_api_gateway ? 1 : 0
  
  rest_api_id = aws_api_gateway_rest_api.main[0].id
  parent_id   = aws_api_gateway_rest_api.main[0].root_resource_id
  path_part   = "{proxy+}"
}

# API Gateway Method
resource "aws_api_gateway_method" "proxy" {
  count = var.enable_api_gateway ? 1 : 0
  
  rest_api_id   = aws_api_gateway_rest_api.main[0].id
  resource_id   = aws_api_gateway_resource.proxy[0].id
  http_method   = "ANY"
  authorization = "NONE"
  
  request_parameters = {
    "method.request.path.proxy" = true
  }
}

# API Gateway Integration
resource "aws_api_gateway_integration" "proxy" {
  count = var.enable_api_gateway ? 1 : 0
  
  rest_api_id = aws_api_gateway_rest_api.main[0].id
  resource_id = aws_api_gateway_method.proxy[0].resource_id
  http_method = aws_api_gateway_method.proxy[0].http_method
  
  integration_http_method = "ANY"
  type                   = "HTTP_PROXY"
  uri                    = "http://${aws_lb.main.dns_name}/{proxy}"
  
  request_parameters = {
    "integration.request.path.proxy" = "method.request.path.proxy"
  }
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway" {
  count = var.enable_api_gateway ? 1 : 0
  
  name              = "/aws/apigateway/ventaro-ai"
  retention_in_days = var.cloudwatch_log_retention_days
  kms_key_id        = aws_kms_key.ventaro_key.arn
  
  tags = {
    Name = "ventaro-ai-api-gateway-logs"
  }
}

# Lambda Function for API processing
resource "aws_lambda_function" "api_processor" {
  filename         = "api_processor.zip"
  function_name    = "ventaro-ai-api-processor"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.api_processor_zip.output_base64sha256
  runtime         = "python3.11"
  timeout         = 30
  memory_size     = 512
  
  environment {
    variables = {
      ENVIRONMENT = var.environment
      REGION      = var.aws_region
      KMS_KEY_ID  = aws_kms_key.ventaro_key.key_id
    }
  }
  
  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }
  
  tracing_config {
    mode = "Active"
  }
  
  tags = {
    Name = "ventaro-ai-api-processor"
  }
}

# Lambda deployment package
data "archive_file" "api_processor_zip" {
  type        = "zip"
  output_path = "api_processor.zip"
  
  source {
    content = templatefile("${path.module}/lambda/api_processor.py", {
      environment = var.environment
    })
    filename = "index.py"
  }
}

# Lambda IAM Role
resource "aws_iam_role" "lambda_role" {
  name = "ventaro-ai-lambda-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_role.name
}

resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
  role       = aws_iam_role.lambda_role.name
}

# Lambda Security Group
resource "aws_security_group" "lambda" {
  name_prefix = "ventaro-ai-lambda-"
  vpc_id      = aws_vpc.main.id
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = {
    Name = "ventaro-ai-lambda-sg"
  }
}

# EventBridge (CloudWatch Events)
resource "aws_cloudwatch_event_rule" "ventaro_ai_events" {
  name        = "ventaro-ai-events"
  description = "Capture Ventaro AI application events"
  
  event_pattern = jsonencode({
    source      = ["ventaro.ai"]
    detail-type = ["Application Event", "User Action", "System Alert"]
  })
  
  tags = {
    Name = "ventaro-ai-event-rule"
  }
}

resource "aws_cloudwatch_event_target" "lambda" {
  rule      = aws_cloudwatch_event_rule.ventaro_ai_events.name
  target_id = "VentaroAILambdaTarget"
  arn       = aws_lambda_function.api_processor.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api_processor.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.ventaro_ai_events.arn
}

# SQS Queue for async processing
resource "aws_sqs_queue" "ventaro_ai_queue" {
  name                       = "ventaro-ai-processing-queue"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 1209600  # 14 days
  receive_wait_time_seconds  = 20
  visibility_timeout_seconds = 300
  
  kms_master_key_id = aws_kms_key.ventaro_key.arn
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.ventaro_ai_dlq.arn
    maxReceiveCount     = 3
  })
  
  tags = {
    Name = "ventaro-ai-processing-queue"
  }
}

# SQS Dead Letter Queue
resource "aws_sqs_queue" "ventaro_ai_dlq" {
  name                      = "ventaro-ai-dlq"
  message_retention_seconds = 1209600  # 14 days
  kms_master_key_id        = aws_kms_key.ventaro_key.arn
  
  tags = {
    Name = "ventaro-ai-dead-letter-queue"
  }
}

# SNS Topic for notifications
resource "aws_sns_topic" "notifications" {
  name              = "ventaro-ai-notifications"
  kms_master_key_id = aws_kms_key.ventaro_key.arn
  
  tags = {
    Name = "ventaro-ai-notifications"
  }
}

# SNS Subscription for email notifications
resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.notifications.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

# Systems Manager Parameter Store
resource "aws_ssm_parameter" "app_config" {
  for_each = {
    "/ventaro-ai/database/host"     = aws_db_instance.main.address
    "/ventaro-ai/database/port"     = tostring(aws_db_instance.main.port)
    "/ventaro-ai/database/name"     = aws_db_instance.main.db_name
    "/ventaro-ai/redis/host"        = aws_elasticache_replication_group.main.primary_endpoint_address
    "/ventaro-ai/redis/port"        = tostring(aws_elasticache_replication_group.main.port)
    "/ventaro-ai/s3/bucket"         = aws_s3_bucket.ventaro_storage.id
    "/ventaro-ai/eks/cluster-name"  = aws_eks_cluster.main.name
    "/ventaro-ai/eks/endpoint"      = aws_eks_cluster.main.endpoint
    "/ventaro-ai/region"            = var.aws_region
    "/ventaro-ai/environment"       = var.environment
  }
  
  name  = each.key
  type  = "String"
  value = each.value
  
  tags = {
    Name = "ventaro-ai-config"
  }
}

# Systems Manager Secure Parameters
resource "aws_ssm_parameter" "secure_config" {
  for_each = {
    "/ventaro-ai/database/username" = aws_db_instance.main.username
    "/ventaro-ai/kms/key-id"        = aws_kms_key.ventaro_key.key_id
  }
  
  name   = each.key
  type   = "SecureString"
  value  = each.value
  key_id = aws_kms_key.ventaro_key.arn
  
  tags = {
    Name = "ventaro-ai-secure-config"
  }
}

# AWS Backup Vault
resource "aws_backup_vault" "main" {
  name        = "ventaro-ai-backup-vault"
  kms_key_arn = aws_kms_key.ventaro_key.arn
  
  tags = {
    Name = "ventaro-ai-backup-vault"
  }
}

# AWS Backup Plan
resource "aws_backup_plan" "main" {
  name = "ventaro-ai-backup-plan"
  
  rule {
    rule_name         = "daily_backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 2 * * ? *)"
    
    lifecycle {
      cold_storage_after = 30
      delete_after       = var.backup_retention_period
    }
    
    recovery_point_tags = {
      Environment = var.environment
      Project     = "Ventaro AI"
    }
  }
  
  rule {
    rule_name         = "weekly_backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = "cron(0 3 ? * SUN *)"
    
    lifecycle {
      cold_storage_after = 7
      delete_after       = 90
    }
    
    recovery_point_tags = {
      Environment = var.environment
      Project     = "Ventaro AI"
      Type        = "Weekly"
    }
  }
  
  tags = {
    Name = "ventaro-ai-backup-plan"
  }
}

# AWS Backup Selection
resource "aws_backup_selection" "main" {
  iam_role_arn = aws_iam_role.backup_role.arn
  name         = "ventaro-ai-backup-selection"
  plan_id      = aws_backup_plan.main.id
  
  resources = [
    aws_db_instance.main.arn,
    aws_elasticache_replication_group.main.arn,
    "${aws_s3_bucket.ventaro_storage.arn}/*"
  ]
  
  condition {
    string_equals {
      key   = "aws:ResourceTag/Environment"
      value = var.environment
    }
  }
}

# IAM Role for AWS Backup
resource "aws_iam_role" "backup_role" {
  name = "ventaro-ai-backup-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "backup.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "backup_policy" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
  role       = aws_iam_role.backup_role.name
}

resource "aws_iam_role_policy_attachment" "backup_restore_policy" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
  role       = aws_iam_role.backup_role.name
}

# AWS Config Configuration Recorder
resource "aws_config_configuration_recorder" "main" {
  count = var.enable_config ? 1 : 0
  
  name     = "ventaro-ai-config-recorder"
  role_arn = aws_iam_role.config_role[0].arn
  
  recording_group {
    all_supported                 = true
    include_global_resource_types = true
  }
}

# AWS Config Delivery Channel
resource "aws_config_delivery_channel" "main" {
  count = var.enable_config ? 1 : 0
  
  name           = "ventaro-ai-config-delivery-channel"
  s3_bucket_name = aws_s3_bucket.config_bucket[0].bucket
  
  depends_on = [aws_config_configuration_recorder.main]
}

# S3 Bucket for AWS Config
resource "aws_s3_bucket" "config_bucket" {
  count = var.enable_config ? 1 : 0
  
  bucket        = "ventaro-ai-config-${random_id.bucket_suffix.hex}"
  force_destroy = true
  
  tags = {
    Name = "ventaro-ai-config-bucket"
  }
}

# IAM Role for AWS Config
resource "aws_iam_role" "config_role" {
  count = var.enable_config ? 1 : 0
  
  name = "ventaro-ai-config-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "config.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "config_policy" {
  count = var.enable_config ? 1 : 0
  
  policy_arn = "arn:aws:iam::aws:policy/service-role/ConfigRole"
  role       = aws_iam_role.config_role[0].name
}

# GuardDuty Detector
resource "aws_guardduty_detector" "main" {
  count = var.enable_guardduty ? 1 : 0
  
  enable = true
  
  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = true
        }
      }
    }
  }
  
  tags = {
    Name = "ventaro-ai-guardduty"
  }
}

# CloudTrail
resource "aws_cloudtrail" "main" {
  count = var.enable_cloudtrail ? 1 : 0
  
  name           = "ventaro-ai-cloudtrail"
  s3_bucket_name = aws_s3_bucket.cloudtrail_bucket[0].bucket
  
  event_selector {
    read_write_type                 = "All"
    include_management_events       = true
    exclude_management_event_sources = []
    
    data_resource {
      type   = "AWS::S3::Object"
      values = ["${aws_s3_bucket.ventaro_storage.arn}/*"]
    }
  }
  
  insight_selector {
    insight_type = "ApiCallRateInsight"
  }
  
  tags = {
    Name = "ventaro-ai-cloudtrail"
  }
}

# S3 Bucket for CloudTrail
resource "aws_s3_bucket" "cloudtrail_bucket" {
  count = var.enable_cloudtrail ? 1 : 0
  
  bucket        = "ventaro-ai-cloudtrail-${random_id.bucket_suffix.hex}"
  force_destroy = true
  
  tags = {
    Name = "ventaro-ai-cloudtrail-bucket"
  }
}

# X-Ray Tracing
resource "aws_xray_sampling_rule" "main" {
  rule_name      = "ventaro-ai-sampling"
  priority       = 9000
  version        = 1
  reservoir_size = 1
  fixed_rate     = 0.1
  url_path       = "*"
  host           = "*"
  http_method    = "*"
  service_type   = "*"
  service_name   = "*"
  resource_arn   = "*"
}

# Route 53 Health Check
resource "aws_route53_health_check" "main" {
  count = var.domain_name != "" ? 1 : 0
  
  fqdn                            = var.domain_name
  port                            = 443
  type                            = "HTTPS"
  resource_path                   = "/health"
  failure_threshold               = 3
  request_interval                = 30
  cloudwatch_alarm_region         = var.aws_region
  cloudwatch_alarm_name           = "ventaro-ai-health-check"
  insufficient_data_health_status = "Failure"
  
  tags = {
    Name = "ventaro-ai-health-check"
  }
}