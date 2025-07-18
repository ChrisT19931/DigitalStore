// Ventaro AI - Advanced IoT Integration Manager
// Comprehensive Internet of Things device management and automation

const EventEmitter = require('events');
const WebSocket = require('ws');
const mqtt = require('mqtt');
const noble = require('@abandonware/noble');
const SerialPort = require('serialport');
const { createHash, createCipher, createDecipher } = require('crypto');
const winston = require('winston');
const Redis = require('redis');
const influx = require('influx');
const axios = require('axios');
const cron = require('node-cron');

// IoT Protocol Implementations
const CoAP = require('coap');
const modbus = require('modbus-serial');
const opcua = require('node-opcua');
const zigbee = require('zigbee-herdsman');
const zwave = require('node-zwave-js');

class VentaroIoTManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      mqtt: {
        broker: config.mqttBroker || 'mqtt://localhost:1883',
        username: config.mqttUsername,
        password: config.mqttPassword,
        clientId: config.mqttClientId || 'ventaro-iot-manager'
      },
      redis: {
        host: config.redisHost || 'localhost',
        port: config.redisPort || 6379,
        password: config.redisPassword
      },
      influxdb: {
        host: config.influxHost || 'localhost',
        port: config.influxPort || 8086,
        database: config.influxDatabase || 'ventaro_iot',
        username: config.influxUsername,
        password: config.influxPassword
      },
      security: {
        encryptionKey: config.encryptionKey || 'ventaro-iot-encryption-key',
        deviceAuthTimeout: config.deviceAuthTimeout || 300000 // 5 minutes
      },
      protocols: {
        coap: { port: config.coapPort || 5683 },
        websocket: { port: config.wsPort || 8080 },
        modbus: { port: config.modbusPort || 502 },
        opcua: { port: config.opcuaPort || 4840 }
      }
    };
    
    // Core components
    this.devices = new Map();
    this.deviceGroups = new Map();
    this.automationRules = new Map();
    this.protocols = new Map();
    this.sensors = new Map();
    this.actuators = new Map();
    this.gateways = new Map();
    
    // Protocol clients
    this.mqttClient = null;
    this.redisClient = null;
    this.influxClient = null;
    this.wsServer = null;
    this.coapServer = null;
    this.modbusClient = null;
    this.opcuaServer = null;
    this.zigbeeController = null;
    this.zwaveDriver = null;
    
    // Security and authentication
    this.deviceTokens = new Map();
    this.encryptedConnections = new Set();
    
    // Analytics and monitoring
    this.metrics = {
      devicesConnected: 0,
      messagesProcessed: 0,
      dataPointsStored: 0,
      automationRulesExecuted: 0,
      errors: 0
    };
    
    // Logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/iot-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/iot-combined.log' }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
    
    this.initialize();
  }

  async initialize() {
    try {
      this.logger.info('Initializing Ventaro IoT Manager...');
      
      // Initialize data storage
      await this.initializeRedis();
      await this.initializeInfluxDB();
      
      // Initialize communication protocols
      await this.initializeMQTT();
      await this.initializeWebSocket();
      await this.initializeCoAP();
      await this.initializeModbus();
      await this.initializeOPCUA();
      
      // Initialize wireless protocols
      await this.initializeBluetooth();
      await this.initializeZigbee();
      await this.initializeZWave();
      
      // Initialize device discovery
      this.startDeviceDiscovery();
      
      // Initialize automation engine
      this.initializeAutomationEngine();
      
      // Start monitoring and analytics
      this.startMonitoring();
      
      // Schedule maintenance tasks
      this.scheduleMaintenance();
      
      this.logger.info('Ventaro IoT Manager initialized successfully');
      this.emit('initialized');
    } catch (error) {
      this.logger.error('Failed to initialize IoT Manager:', error);
      throw error;
    }
  }

  // Data Storage Initialization
  async initializeRedis() {
    this.redisClient = Redis.createClient(this.config.redis);
    
    this.redisClient.on('error', (error) => {
      this.logger.error('Redis error:', error);
    });
    
    this.redisClient.on('connect', () => {
      this.logger.info('Connected to Redis');
    });
    
    await this.redisClient.connect();
  }

  async initializeInfluxDB() {
    this.influxClient = new influx.InfluxDB({
      host: this.config.influxdb.host,
      port: this.config.influxdb.port,
      database: this.config.influxdb.database,
      username: this.config.influxdb.username,
      password: this.config.influxdb.password,
      schema: [
        {
          measurement: 'device_data',
          fields: {
            value: influx.FieldType.FLOAT,
            status: influx.FieldType.STRING,
            metadata: influx.FieldType.STRING
          },
          tags: [
            'device_id',
            'device_type',
            'sensor_type',
            'location',
            'group'
          ]
        },
        {
          measurement: 'device_events',
          fields: {
            event_type: influx.FieldType.STRING,
            event_data: influx.FieldType.STRING,
            severity: influx.FieldType.STRING
          },
          tags: [
            'device_id',
            'event_category'
          ]
        }
      ]
    });
    
    try {
      await this.influxClient.createDatabase(this.config.influxdb.database);
      this.logger.info('Connected to InfluxDB');
    } catch (error) {
      if (!error.message.includes('database already exists')) {
        throw error;
      }
    }
  }

  // Protocol Initialization
  async initializeMQTT() {
    this.mqttClient = mqtt.connect(this.config.mqtt.broker, {
      clientId: this.config.mqtt.clientId,
      username: this.config.mqtt.username,
      password: this.config.mqtt.password,
      clean: true,
      reconnectPeriod: 5000
    });
    
    this.mqttClient.on('connect', () => {
      this.logger.info('Connected to MQTT broker');
      
      // Subscribe to device topics
      this.mqttClient.subscribe('ventaro/devices/+/data');
      this.mqttClient.subscribe('ventaro/devices/+/status');
      this.mqttClient.subscribe('ventaro/devices/+/events');
      this.mqttClient.subscribe('ventaro/discovery/+');
    });
    
    this.mqttClient.on('message', (topic, message) => {
      this.handleMQTTMessage(topic, message);
    });
    
    this.mqttClient.on('error', (error) => {
      this.logger.error('MQTT error:', error);
    });
  }

  async initializeWebSocket() {
    this.wsServer = new WebSocket.Server({ 
      port: this.config.protocols.websocket.port,
      verifyClient: (info) => this.verifyWebSocketClient(info)
    });
    
    this.wsServer.on('connection', (ws, request) => {
      this.handleWebSocketConnection(ws, request);
    });
    
    this.logger.info(`WebSocket server listening on port ${this.config.protocols.websocket.port}`);
  }

  async initializeCoAP() {
    this.coapServer = CoAP.createServer();
    
    this.coapServer.on('request', (req, res) => {
      this.handleCoapRequest(req, res);
    });
    
    this.coapServer.listen(this.config.protocols.coap.port, () => {
      this.logger.info(`CoAP server listening on port ${this.config.protocols.coap.port}`);
    });
  }

  async initializeModbus() {
    this.modbusClient = new modbus();
    
    // Configure Modbus TCP
    this.modbusClient.connectTCP('127.0.0.1', { port: this.config.protocols.modbus.port })
      .then(() => {
        this.logger.info('Modbus TCP client connected');
      })
      .catch((error) => {
        this.logger.warn('Modbus TCP connection failed:', error.message);
      });
  }

  async initializeOPCUA() {
    try {
      this.opcuaServer = new opcua.OPCUAServer({
        port: this.config.protocols.opcua.port,
        resourcePath: '/ventaro-iot',
        buildInfo: {
          productName: 'Ventaro IoT OPC UA Server',
          buildNumber: '1.0.0',
          buildDate: new Date()
        }
      });
      
      await this.opcuaServer.initialize();
      await this.opcuaServer.start();
      
      this.logger.info(`OPC UA server started on port ${this.config.protocols.opcua.port}`);
    } catch (error) {
      this.logger.warn('OPC UA server initialization failed:', error.message);
    }
  }

  // Wireless Protocol Initialization
  async initializeBluetooth() {
    try {
      noble.on('stateChange', (state) => {
        if (state === 'poweredOn') {
          this.logger.info('Bluetooth powered on, starting scan...');
          noble.startScanning();
        } else {
          noble.stopScanning();
        }
      });
      
      noble.on('discover', (peripheral) => {
        this.handleBluetoothDevice(peripheral);
      });
      
      this.logger.info('Bluetooth LE initialized');
    } catch (error) {
      this.logger.warn('Bluetooth initialization failed:', error.message);
    }
  }

  async initializeZigbee() {
    try {
      this.zigbeeController = new zigbee.Controller({
        serialPort: { path: '/dev/ttyUSB0', baudRate: 115200 },
        databasePath: './data/zigbee.db',
        backupPath: './data/zigbee_backup.json'
      });
      
      await this.zigbeeController.start();
      
      this.zigbeeController.on('deviceJoined', (device) => {
        this.handleZigbeeDevice(device);
      });
      
      this.logger.info('Zigbee controller initialized');
    } catch (error) {
      this.logger.warn('Zigbee initialization failed:', error.message);
    }
  }

  async initializeZWave() {
    try {
      this.zwaveDriver = new zwave.Driver('/dev/ttyUSB1');
      
      this.zwaveDriver.on('driver ready', () => {
        this.logger.info('Z-Wave driver ready');
      });
      
      this.zwaveDriver.on('node added', (node) => {
        this.handleZWaveNode(node);
      });
      
      await this.zwaveDriver.start();
    } catch (error) {
      this.logger.warn('Z-Wave initialization failed:', error.message);
    }
  }

  // Device Management
  async registerDevice(deviceInfo) {
    const deviceId = deviceInfo.id || this.generateDeviceId();
    
    const device = {
      id: deviceId,
      name: deviceInfo.name,
      type: deviceInfo.type,
      protocol: deviceInfo.protocol,
      address: deviceInfo.address,
      capabilities: deviceInfo.capabilities || [],
      metadata: deviceInfo.metadata || {},
      status: 'offline',
      lastSeen: null,
      registeredAt: new Date(),
      security: {
        encrypted: deviceInfo.encrypted || false,
        authenticated: false,
        token: this.generateDeviceToken(deviceId)
      },
      configuration: deviceInfo.configuration || {},
      groups: deviceInfo.groups || []
    };
    
    this.devices.set(deviceId, device);
    
    // Store in Redis for persistence
    await this.redisClient.hSet('devices', deviceId, JSON.stringify(device));
    
    // Add to groups
    for (const groupName of device.groups) {
      this.addDeviceToGroup(deviceId, groupName);
    }
    
    this.logger.info(`Device registered: ${deviceId} (${device.name})`);
    this.emit('deviceRegistered', device);
    
    return device;
  }

  async unregisterDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }
    
    // Remove from groups
    for (const groupName of device.groups) {
      this.removeDeviceFromGroup(deviceId, groupName);
    }
    
    // Clean up
    this.devices.delete(deviceId);
    this.deviceTokens.delete(deviceId);
    await this.redisClient.hDel('devices', deviceId);
    
    this.logger.info(`Device unregistered: ${deviceId}`);
    this.emit('deviceUnregistered', device);
  }

  async updateDeviceStatus(deviceId, status, metadata = {}) {
    const device = this.devices.get(deviceId);
    if (!device) {
      this.logger.warn(`Attempted to update status for unknown device: ${deviceId}`);
      return;
    }
    
    const previousStatus = device.status;
    device.status = status;
    device.lastSeen = new Date();
    device.metadata = { ...device.metadata, ...metadata };
    
    // Update in Redis
    await this.redisClient.hSet('devices', deviceId, JSON.stringify(device));
    
    // Log status change
    if (previousStatus !== status) {
      this.logger.info(`Device ${deviceId} status changed: ${previousStatus} -> ${status}`);
      
      // Store event in InfluxDB
      await this.influxClient.writePoints([{
        measurement: 'device_events',
        tags: {
          device_id: deviceId,
          event_category: 'status_change'
        },
        fields: {
          event_type: 'status_change',
          event_data: JSON.stringify({ from: previousStatus, to: status }),
          severity: status === 'offline' ? 'warning' : 'info'
        },
        timestamp: new Date()
      }]);
      
      this.emit('deviceStatusChanged', { device, previousStatus, newStatus: status });
    }
    
    this.metrics.devicesConnected = Array.from(this.devices.values())
      .filter(d => d.status === 'online').length;
  }

  // Data Processing
  async processDeviceData(deviceId, sensorType, value, timestamp = new Date()) {
    const device = this.devices.get(deviceId);
    if (!device) {
      this.logger.warn(`Received data from unknown device: ${deviceId}`);
      return;
    }
    
    // Validate and normalize data
    const normalizedData = this.normalizeData(sensorType, value);
    
    // Store in InfluxDB
    await this.influxClient.writePoints([{
      measurement: 'device_data',
      tags: {
        device_id: deviceId,
        device_type: device.type,
        sensor_type: sensorType,
        location: device.metadata.location || 'unknown',
        group: device.groups[0] || 'default'
      },
      fields: {
        value: normalizedData.value,
        status: normalizedData.status || 'ok',
        metadata: JSON.stringify(normalizedData.metadata || {})
      },
      timestamp
    }]);
    
    // Cache latest value in Redis
    const cacheKey = `device:${deviceId}:${sensorType}:latest`;
    await this.redisClient.setEx(cacheKey, 3600, JSON.stringify({
      value: normalizedData.value,
      timestamp,
      status: normalizedData.status
    }));
    
    // Check automation rules
    this.checkAutomationRules(deviceId, sensorType, normalizedData.value);
    
    // Update metrics
    this.metrics.dataPointsStored++;
    
    this.emit('dataReceived', {
      deviceId,
      sensorType,
      value: normalizedData.value,
      timestamp
    });
  }

  normalizeData(sensorType, value) {
    const normalizers = {
      temperature: (val) => ({
        value: parseFloat(val),
        status: val < -40 || val > 85 ? 'error' : 'ok'
      }),
      humidity: (val) => ({
        value: Math.max(0, Math.min(100, parseFloat(val))),
        status: val < 0 || val > 100 ? 'error' : 'ok'
      }),
      pressure: (val) => ({
        value: parseFloat(val),
        status: val < 300 || val > 1100 ? 'warning' : 'ok'
      }),
      motion: (val) => ({
        value: Boolean(val) ? 1 : 0,
        status: 'ok'
      }),
      light: (val) => ({
        value: Math.max(0, parseFloat(val)),
        status: 'ok'
      }),
      energy: (val) => ({
        value: Math.max(0, parseFloat(val)),
        status: 'ok'
      })
    };
    
    const normalizer = normalizers[sensorType] || ((val) => ({ value: val, status: 'ok' }));
    return normalizer(value);
  }

  // Automation Engine
  initializeAutomationEngine() {
    this.logger.info('Initializing automation engine...');
    
    // Load automation rules from storage
    this.loadAutomationRules();
    
    // Set up rule evaluation scheduler
    cron.schedule('*/30 * * * * *', () => {
      this.evaluateScheduledRules();
    });
  }

  async createAutomationRule(ruleConfig) {
    const ruleId = ruleConfig.id || this.generateRuleId();
    
    const rule = {
      id: ruleId,
      name: ruleConfig.name,
      description: ruleConfig.description,
      enabled: ruleConfig.enabled !== false,
      triggers: ruleConfig.triggers || [],
      conditions: ruleConfig.conditions || [],
      actions: ruleConfig.actions || [],
      schedule: ruleConfig.schedule,
      metadata: ruleConfig.metadata || {},
      createdAt: new Date(),
      lastExecuted: null,
      executionCount: 0
    };
    
    this.automationRules.set(ruleId, rule);
    
    // Store in Redis
    await this.redisClient.hSet('automation_rules', ruleId, JSON.stringify(rule));
    
    this.logger.info(`Automation rule created: ${ruleId} (${rule.name})`);
    this.emit('ruleCreated', rule);
    
    return rule;
  }

  async checkAutomationRules(deviceId, sensorType, value) {
    for (const rule of this.automationRules.values()) {
      if (!rule.enabled) continue;
      
      // Check if this data point triggers the rule
      const triggered = rule.triggers.some(trigger => 
        this.evaluateTrigger(trigger, deviceId, sensorType, value)
      );
      
      if (triggered) {
        // Evaluate conditions
        const conditionsMet = await this.evaluateConditions(rule.conditions);
        
        if (conditionsMet) {
          await this.executeRule(rule, { deviceId, sensorType, value });
        }
      }
    }
  }

  evaluateTrigger(trigger, deviceId, sensorType, value) {
    if (trigger.deviceId && trigger.deviceId !== deviceId) return false;
    if (trigger.sensorType && trigger.sensorType !== sensorType) return false;
    
    switch (trigger.operator) {
      case 'equals':
        return value === trigger.value;
      case 'greater_than':
        return value > trigger.value;
      case 'less_than':
        return value < trigger.value;
      case 'greater_equal':
        return value >= trigger.value;
      case 'less_equal':
        return value <= trigger.value;
      case 'changed':
        return true; // Any change triggers
      case 'range':
        return value >= trigger.min && value <= trigger.max;
      default:
        return false;
    }
  }

  async evaluateConditions(conditions) {
    if (conditions.length === 0) return true;
    
    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition);
      if (!result) return false;
    }
    
    return true;
  }

  async evaluateCondition(condition) {
    switch (condition.type) {
      case 'device_status':
        const device = this.devices.get(condition.deviceId);
        return device && device.status === condition.status;
        
      case 'time_range':
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const startTime = this.parseTime(condition.startTime);
        const endTime = this.parseTime(condition.endTime);
        return currentTime >= startTime && currentTime <= endTime;
        
      case 'sensor_value':
        const cacheKey = `device:${condition.deviceId}:${condition.sensorType}:latest`;
        const cachedData = await this.redisClient.get(cacheKey);
        if (!cachedData) return false;
        
        const data = JSON.parse(cachedData);
        return this.evaluateTrigger(condition, condition.deviceId, condition.sensorType, data.value);
        
      default:
        return true;
    }
  }

  async executeRule(rule, context) {
    try {
      this.logger.info(`Executing automation rule: ${rule.name}`);
      
      for (const action of rule.actions) {
        await this.executeAction(action, context);
      }
      
      // Update rule execution stats
      rule.lastExecuted = new Date();
      rule.executionCount++;
      
      await this.redisClient.hSet('automation_rules', rule.id, JSON.stringify(rule));
      
      this.metrics.automationRulesExecuted++;
      this.emit('ruleExecuted', { rule, context });
    } catch (error) {
      this.logger.error(`Error executing rule ${rule.name}:`, error);
      this.metrics.errors++;
    }
  }

  async executeAction(action, context) {
    switch (action.type) {
      case 'device_control':
        await this.controlDevice(action.deviceId, action.command, action.parameters);
        break;
        
      case 'notification':
        await this.sendNotification(action.message, action.channels);
        break;
        
      case 'webhook':
        await this.callWebhook(action.url, action.method, action.data);
        break;
        
      case 'email':
        await this.sendEmail(action.to, action.subject, action.body);
        break;
        
      case 'delay':
        await this.delay(action.duration);
        break;
        
      default:
        this.logger.warn(`Unknown action type: ${action.type}`);
    }
  }

  // Device Control
  async controlDevice(deviceId, command, parameters = {}) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }
    
    const controlMessage = {
      deviceId,
      command,
      parameters,
      timestamp: new Date(),
      requestId: this.generateRequestId()
    };
    
    // Send control message based on device protocol
    switch (device.protocol) {
      case 'mqtt':
        await this.sendMQTTControl(device, controlMessage);
        break;
      case 'coap':
        await this.sendCoapControl(device, controlMessage);
        break;
      case 'modbus':
        await this.sendModbusControl(device, controlMessage);
        break;
      case 'websocket':
        await this.sendWebSocketControl(device, controlMessage);
        break;
      default:
        throw new Error(`Unsupported protocol: ${device.protocol}`);
    }
    
    this.logger.info(`Control command sent to ${deviceId}: ${command}`);
    this.emit('deviceControlled', { device, command, parameters });
  }

  // Protocol Message Handlers
  handleMQTTMessage(topic, message) {
    try {
      const topicParts = topic.split('/');
      const deviceId = topicParts[2];
      const messageType = topicParts[3];
      
      const data = JSON.parse(message.toString());
      
      switch (messageType) {
        case 'data':
          this.processDeviceData(deviceId, data.sensorType, data.value, new Date(data.timestamp));
          break;
        case 'status':
          this.updateDeviceStatus(deviceId, data.status, data.metadata);
          break;
        case 'events':
          this.handleDeviceEvent(deviceId, data);
          break;
      }
      
      this.metrics.messagesProcessed++;
    } catch (error) {
      this.logger.error('Error handling MQTT message:', error);
      this.metrics.errors++;
    }
  }

  handleWebSocketConnection(ws, request) {
    const deviceId = this.extractDeviceIdFromRequest(request);
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        this.handleWebSocketMessage(deviceId, data);
      } catch (error) {
        this.logger.error('Error handling WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      this.updateDeviceStatus(deviceId, 'offline');
    });
    
    this.updateDeviceStatus(deviceId, 'online');
  }

  handleCoapRequest(req, res) {
    try {
      const deviceId = req.headers['device-id'];
      const data = JSON.parse(req.payload.toString());
      
      this.processDeviceData(deviceId, data.sensorType, data.value);
      
      res.code = '2.04';
      res.end('OK');
    } catch (error) {
      this.logger.error('Error handling CoAP request:', error);
      res.code = '4.00';
      res.end('Bad Request');
    }
  }

  // Device Discovery
  startDeviceDiscovery() {
    this.logger.info('Starting device discovery...');
    
    // MQTT discovery
    this.mqttClient.publish('ventaro/discovery/scan', JSON.stringify({
      timestamp: new Date(),
      requestId: this.generateRequestId()
    }));
    
    // mDNS discovery
    this.startMDNSDiscovery();
    
    // UPnP discovery
    this.startUPnPDiscovery();
    
    // Schedule periodic discovery
    cron.schedule('0 */5 * * * *', () => {
      this.performPeriodicDiscovery();
    });
  }

  // Monitoring and Analytics
  startMonitoring() {
    // Health check interval
    setInterval(() => {
      this.performHealthCheck();
    }, 30000);
    
    // Metrics reporting
    setInterval(() => {
      this.reportMetrics();
    }, 60000);
    
    // Device timeout check
    setInterval(() => {
      this.checkDeviceTimeouts();
    }, 60000);
  }

  async performHealthCheck() {
    const health = {
      timestamp: new Date(),
      status: 'healthy',
      services: {
        mqtt: this.mqttClient?.connected || false,
        redis: this.redisClient?.isReady || false,
        influxdb: true, // Simplified check
        websocket: this.wsServer?.readyState === 1
      },
      metrics: this.metrics,
      deviceCount: this.devices.size,
      onlineDevices: Array.from(this.devices.values()).filter(d => d.status === 'online').length
    };
    
    // Store health data
    await this.redisClient.setEx('iot:health', 300, JSON.stringify(health));
    
    this.emit('healthCheck', health);
  }

  // Utility Methods
  generateDeviceId() {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateDeviceToken(deviceId) {
    const token = createHash('sha256')
      .update(`${deviceId}:${this.config.security.encryptionKey}:${Date.now()}`)
      .digest('hex');
    
    this.deviceTokens.set(deviceId, {
      token,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.security.deviceAuthTimeout)
    });
    
    return token;
  }

  generateRuleId() {
    return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup
  async shutdown() {
    this.logger.info('Shutting down IoT Manager...');
    
    // Close connections
    if (this.mqttClient) {
      this.mqttClient.end();
    }
    
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    
    if (this.wsServer) {
      this.wsServer.close();
    }
    
    if (this.coapServer) {
      this.coapServer.close();
    }
    
    if (this.opcuaServer) {
      await this.opcuaServer.shutdown();
    }
    
    if (this.zigbeeController) {
      await this.zigbeeController.stop();
    }
    
    if (this.zwaveDriver) {
      await this.zwaveDriver.destroy();
    }
    
    this.logger.info('IoT Manager shutdown complete');
  }
}

module.exports = VentaroIoTManager;