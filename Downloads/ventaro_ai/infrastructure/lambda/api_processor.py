#!/usr/bin/env python3
"""
Ventaro AI - Lambda API Processor
Handles API requests, event processing, and system integrations
"""

import json
import os
import boto3
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from botocore.exceptions import ClientError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize AWS clients
sns = boto3.client('sns')
sqs = boto3.client('sqs')
ssm = boto3.client('ssm')
secretsmanager = boto3.client('secretsmanager')
cloudwatch = boto3.client('cloudwatch')

# Environment variables
ENVIRONMENT = os.environ.get('ENVIRONMENT', '${environment}')
REGION = os.environ.get('REGION', 'us-west-2')
KMS_KEY_ID = os.environ.get('KMS_KEY_ID', '')

class VentaroAPIProcessor:
    """Main API processor class for Ventaro AI"""
    
    def __init__(self):
        self.environment = ENVIRONMENT
        self.region = REGION
        self.kms_key_id = KMS_KEY_ID
        
    def get_parameter(self, parameter_name: str, decrypt: bool = False) -> Optional[str]:
        """Retrieve parameter from Systems Manager Parameter Store"""
        try:
            response = ssm.get_parameter(
                Name=parameter_name,
                WithDecryption=decrypt
            )
            return response['Parameter']['Value']
        except ClientError as e:
            logger.error(f"Error retrieving parameter {parameter_name}: {e}")
            return None
    
    def get_secret(self, secret_name: str) -> Optional[Dict[str, Any]]:
        """Retrieve secret from AWS Secrets Manager"""
        try:
            response = secretsmanager.get_secret_value(SecretId=secret_name)
            return json.loads(response['SecretString'])
        except ClientError as e:
            logger.error(f"Error retrieving secret {secret_name}: {e}")
            return None
    
    def send_notification(self, topic_arn: str, message: str, subject: str = "Ventaro AI Notification") -> bool:
        """Send notification via SNS"""
        try:
            sns.publish(
                TopicArn=topic_arn,
                Message=message,
                Subject=subject
            )
            logger.info(f"Notification sent: {subject}")
            return True
        except ClientError as e:
            logger.error(f"Error sending notification: {e}")
            return False
    
    def send_to_queue(self, queue_url: str, message_body: Dict[str, Any]) -> bool:
        """Send message to SQS queue"""
        try:
            sqs.send_message(
                QueueUrl=queue_url,
                MessageBody=json.dumps(message_body),
                MessageAttributes={
                    'Environment': {
                        'StringValue': self.environment,
                        'DataType': 'String'
                    },
                    'Timestamp': {
                        'StringValue': datetime.utcnow().isoformat(),
                        'DataType': 'String'
                    }
                }
            )
            logger.info("Message sent to queue successfully")
            return True
        except ClientError as e:
            logger.error(f"Error sending message to queue: {e}")
            return False
    
    def put_metric(self, metric_name: str, value: float, unit: str = 'Count', namespace: str = 'VentaroAI') -> bool:
        """Put custom metric to CloudWatch"""
        try:
            cloudwatch.put_metric_data(
                Namespace=namespace,
                MetricData=[
                    {
                        'MetricName': metric_name,
                        'Value': value,
                        'Unit': unit,
                        'Dimensions': [
                            {
                                'Name': 'Environment',
                                'Value': self.environment
                            }
                        ],
                        'Timestamp': datetime.utcnow()
                    }
                ]
            )
            logger.info(f"Metric {metric_name} sent to CloudWatch")
            return True
        except ClientError as e:
            logger.error(f"Error sending metric: {e}")
            return False
    
    def process_api_request(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Process incoming API request"""
        try:
            # Extract request information
            http_method = event.get('httpMethod', 'GET')
            path = event.get('path', '/')
            headers = event.get('headers', {})
            query_params = event.get('queryStringParameters', {})
            body = event.get('body', '')
            
            # Log request details
            logger.info(f"Processing {http_method} request to {path}")
            
            # Parse body if present
            request_data = {}
            if body:
                try:
                    request_data = json.loads(body)
                except json.JSONDecodeError:
                    logger.warning("Invalid JSON in request body")
            
            # Route request based on path
            if path.startswith('/api/health'):
                return self.handle_health_check()
            elif path.startswith('/api/ai'):
                return self.handle_ai_request(request_data)
            elif path.startswith('/api/user'):
                return self.handle_user_request(request_data, http_method)
            elif path.startswith('/api/analytics'):
                return self.handle_analytics_request(request_data)
            elif path.startswith('/api/iot'):
                return self.handle_iot_request(request_data)
            elif path.startswith('/api/edge'):
                return self.handle_edge_request(request_data)
            else:
                return self.create_response(404, {'error': 'Endpoint not found'})
                
        except Exception as e:
            logger.error(f"Error processing API request: {e}")
            return self.create_response(500, {'error': 'Internal server error'})
    
    def handle_health_check(self) -> Dict[str, Any]:
        """Handle health check requests"""
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'environment': self.environment,
            'region': self.region,
            'version': '1.0.0'
        }
        
        # Send health metric
        self.put_metric('HealthCheck', 1)
        
        return self.create_response(200, health_status)
    
    def handle_ai_request(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle AI processing requests"""
        try:
            # Extract AI request parameters
            model_type = data.get('model_type', 'gpt-4')
            prompt = data.get('prompt', '')
            max_tokens = data.get('max_tokens', 1000)
            
            if not prompt:
                return self.create_response(400, {'error': 'Prompt is required'})
            
            # Queue AI processing request
            queue_url = self.get_parameter('/ventaro-ai/sqs/ai-processing-queue')
            if queue_url:
                ai_request = {
                    'type': 'ai_processing',
                    'model_type': model_type,
                    'prompt': prompt,
                    'max_tokens': max_tokens,
                    'timestamp': datetime.utcnow().isoformat(),
                    'request_id': f"ai_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
                }
                
                if self.send_to_queue(queue_url, ai_request):
                    self.put_metric('AIRequestsQueued', 1)
                    return self.create_response(202, {
                        'message': 'AI request queued for processing',
                        'request_id': ai_request['request_id']
                    })
            
            return self.create_response(500, {'error': 'Failed to queue AI request'})
            
        except Exception as e:
            logger.error(f"Error handling AI request: {e}")
            return self.create_response(500, {'error': 'AI processing error'})
    
    def handle_user_request(self, data: Dict[str, Any], method: str) -> Dict[str, Any]:
        """Handle user-related requests"""
        try:
            if method == 'POST':
                # User registration/creation
                user_id = data.get('user_id')
                email = data.get('email')
                
                if not user_id or not email:
                    return self.create_response(400, {'error': 'user_id and email are required'})
                
                # Queue user creation request
                queue_url = self.get_parameter('/ventaro-ai/sqs/user-processing-queue')
                if queue_url:
                    user_request = {
                        'type': 'user_creation',
                        'user_id': user_id,
                        'email': email,
                        'timestamp': datetime.utcnow().isoformat()
                    }
                    
                    if self.send_to_queue(queue_url, user_request):
                        self.put_metric('UserCreationRequests', 1)
                        return self.create_response(201, {
                            'message': 'User creation request processed',
                            'user_id': user_id
                        })
                
                return self.create_response(500, {'error': 'Failed to process user request'})
            
            elif method == 'GET':
                # User data retrieval
                return self.create_response(200, {
                    'message': 'User data retrieval endpoint',
                    'status': 'active'
                })
            
            else:
                return self.create_response(405, {'error': 'Method not allowed'})
                
        except Exception as e:
            logger.error(f"Error handling user request: {e}")
            return self.create_response(500, {'error': 'User processing error'})
    
    def handle_analytics_request(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle analytics and metrics requests"""
        try:
            event_type = data.get('event_type')
            user_id = data.get('user_id')
            properties = data.get('properties', {})
            
            if not event_type:
                return self.create_response(400, {'error': 'event_type is required'})
            
            # Send analytics event
            analytics_event = {
                'type': 'analytics_event',
                'event_type': event_type,
                'user_id': user_id,
                'properties': properties,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Queue analytics processing
            queue_url = self.get_parameter('/ventaro-ai/sqs/analytics-queue')
            if queue_url and self.send_to_queue(queue_url, analytics_event):
                self.put_metric('AnalyticsEvents', 1)
                self.put_metric(f'AnalyticsEvent_{event_type}', 1)
                
                return self.create_response(200, {
                    'message': 'Analytics event recorded',
                    'event_type': event_type
                })
            
            return self.create_response(500, {'error': 'Failed to record analytics event'})
            
        except Exception as e:
            logger.error(f"Error handling analytics request: {e}")
            return self.create_response(500, {'error': 'Analytics processing error'})
    
    def handle_iot_request(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle IoT device requests"""
        try:
            device_id = data.get('device_id')
            sensor_data = data.get('sensor_data', {})
            device_type = data.get('device_type', 'unknown')
            
            if not device_id:
                return self.create_response(400, {'error': 'device_id is required'})
            
            # Process IoT data
            iot_event = {
                'type': 'iot_data',
                'device_id': device_id,
                'device_type': device_type,
                'sensor_data': sensor_data,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Queue IoT processing
            queue_url = self.get_parameter('/ventaro-ai/sqs/iot-queue')
            if queue_url and self.send_to_queue(queue_url, iot_event):
                self.put_metric('IoTEvents', 1)
                self.put_metric(f'IoTDevice_{device_type}', 1)
                
                return self.create_response(200, {
                    'message': 'IoT data processed',
                    'device_id': device_id
                })
            
            return self.create_response(500, {'error': 'Failed to process IoT data'})
            
        except Exception as e:
            logger.error(f"Error handling IoT request: {e}")
            return self.create_response(500, {'error': 'IoT processing error'})
    
    def handle_edge_request(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle edge computing requests"""
        try:
            edge_node_id = data.get('edge_node_id')
            computation_type = data.get('computation_type')
            payload = data.get('payload', {})
            
            if not edge_node_id or not computation_type:
                return self.create_response(400, {
                    'error': 'edge_node_id and computation_type are required'
                })
            
            # Process edge computing request
            edge_event = {
                'type': 'edge_computation',
                'edge_node_id': edge_node_id,
                'computation_type': computation_type,
                'payload': payload,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Queue edge processing
            queue_url = self.get_parameter('/ventaro-ai/sqs/edge-queue')
            if queue_url and self.send_to_queue(queue_url, edge_event):
                self.put_metric('EdgeComputationRequests', 1)
                
                return self.create_response(200, {
                    'message': 'Edge computation request processed',
                    'edge_node_id': edge_node_id
                })
            
            return self.create_response(500, {'error': 'Failed to process edge request'})
            
        except Exception as e:
            logger.error(f"Error handling edge request: {e}")
            return self.create_response(500, {'error': 'Edge processing error'})
    
    def process_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Process EventBridge events"""
        try:
            source = event.get('source', '')
            detail_type = event.get('detail-type', '')
            detail = event.get('detail', {})
            
            logger.info(f"Processing event: {source} - {detail_type}")
            
            # Handle different event types
            if source == 'ventaro.ai':
                if detail_type == 'Application Event':
                    return self.handle_application_event(detail)
                elif detail_type == 'User Action':
                    return self.handle_user_action_event(detail)
                elif detail_type == 'System Alert':
                    return self.handle_system_alert_event(detail)
            
            # Send metric for processed events
            self.put_metric('EventsProcessed', 1)
            
            return {'statusCode': 200, 'body': 'Event processed successfully'}
            
        except Exception as e:
            logger.error(f"Error processing event: {e}")
            return {'statusCode': 500, 'body': 'Event processing error'}
    
    def handle_application_event(self, detail: Dict[str, Any]) -> Dict[str, Any]:
        """Handle application-specific events"""
        event_name = detail.get('event_name', '')
        logger.info(f"Handling application event: {event_name}")
        
        # Send notification for critical events
        if event_name in ['deployment_completed', 'system_error', 'security_alert']:
            topic_arn = self.get_parameter('/ventaro-ai/sns/notifications-topic')
            if topic_arn:
                message = f"Application Event: {event_name}\nDetails: {json.dumps(detail, indent=2)}"
                self.send_notification(topic_arn, message, f"Ventaro AI: {event_name}")
        
        return {'statusCode': 200, 'body': 'Application event handled'}
    
    def handle_user_action_event(self, detail: Dict[str, Any]) -> Dict[str, Any]:
        """Handle user action events"""
        action = detail.get('action', '')
        user_id = detail.get('user_id', '')
        
        logger.info(f"Handling user action: {action} for user {user_id}")
        
        # Track user actions
        self.put_metric(f'UserAction_{action}', 1)
        
        return {'statusCode': 200, 'body': 'User action event handled'}
    
    def handle_system_alert_event(self, detail: Dict[str, Any]) -> Dict[str, Any]:
        """Handle system alert events"""
        alert_type = detail.get('alert_type', '')
        severity = detail.get('severity', 'info')
        
        logger.warning(f"System alert: {alert_type} (severity: {severity})")
        
        # Send notification for high severity alerts
        if severity in ['critical', 'high']:
            topic_arn = self.get_parameter('/ventaro-ai/sns/alerts-topic')
            if topic_arn:
                message = f"System Alert: {alert_type}\nSeverity: {severity}\nDetails: {json.dumps(detail, indent=2)}"
                self.send_notification(topic_arn, message, f"Ventaro AI Alert: {alert_type}")
        
        # Track alert metrics
        self.put_metric(f'SystemAlert_{alert_type}', 1)
        self.put_metric(f'AlertSeverity_{severity}', 1)
        
        return {'statusCode': 200, 'body': 'System alert handled'}
    
    def create_response(self, status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
        """Create standardized API response"""
        return {
            'statusCode': status_code,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
            },
            'body': json.dumps(body)
        }

# Initialize processor
processor = VentaroAPIProcessor()

def handler(event, context):
    """Lambda function entry point"""
    try:
        logger.info(f"Received event: {json.dumps(event, default=str)}")
        
        # Determine event type and route accordingly
        if 'httpMethod' in event:
            # API Gateway request
            return processor.process_api_request(event)
        elif 'source' in event:
            # EventBridge event
            return processor.process_event(event)
        else:
            # Unknown event type
            logger.warning(f"Unknown event type: {event}")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Unknown event type'})
            }
            
    except Exception as e:
        logger.error(f"Unhandled error in Lambda handler: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'})
        }