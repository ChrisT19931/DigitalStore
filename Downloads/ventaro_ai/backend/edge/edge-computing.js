// Ventaro AI - Advanced Edge Computing Engine
// Distributed processing, real-time analytics, and edge AI capabilities

const EventEmitter = require('events');
const cluster = require('cluster');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const WebSocket = require('ws');
const Redis = require('redis');
const winston = require('winston');
const tf = require('@tensorflow/tfjs-node');
const onnx = require('onnxjs');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const Bull = require('bull');
const cron = require('node-cron');
const axios = require('axios');
const { performance } = require('perf_hooks');
const pidusage = require('pidusage');

class VentaroEdgeComputing extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      nodeId: config.nodeId || `edge-${os.hostname()}-${Date.now()}`,
      cluster: {
        enabled: config.clusterEnabled !== false,
        workers: config.workers || os.cpus().length,
        maxMemory: config.maxMemory || '1gb'
      },
      redis: {
        host: config.redisHost || 'localhost',
        port: config.redisPort || 6379,
        password: config.redisPassword
      },
      ai: {
        modelsPath: config.modelsPath || './models',
        enableGPU: config.enableGPU !== false,
        maxConcurrentInferences: config.maxConcurrentInferences || 4,
        modelCacheSize: config.modelCacheSize || 10
      },
      processing: {
        batchSize: config.batchSize || 32,
        maxQueueSize: config.maxQueueSize || 1000,
        timeoutMs: config.timeoutMs || 30000,
        retryAttempts: config.retryAttempts || 3
      },
      networking: {
        meshPort: config.meshPort || 8090,
        syncInterval: config.syncInterval || 30000,
        heartbeatInterval: config.heartbeatInterval || 10000
      },
      storage: {
        dataPath: config.dataPath || './edge-data',
        maxStorageSize: config.maxStorageSize || '10gb',
        compressionEnabled: config.compressionEnabled !== false
      }
    };
    
    // Core components
    this.workers = new Map();
    this.processingQueues = new Map();
    this.aiModels = new Map();
    this.modelCache = new Map();
    this.edgeNodes = new Map();
    this.tasks = new Map();
    this.results = new Map();
    
    // Networking
    this.meshServer = null;
    this.meshClients = new Map();
    this.redisClient = null;
    
    // Monitoring
    this.metrics = {
      tasksProcessed: 0,
      inferenceCount: 0,
      dataProcessed: 0,
      networkMessages: 0,
      errors: 0,
      avgProcessingTime: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      networkLatency: 0
    };
    
    // Performance tracking
    this.performanceHistory = [];
    this.loadBalancer = new EdgeLoadBalancer(this);
    this.scheduler = new EdgeTaskScheduler(this);
    this.optimizer = new EdgeOptimizer(this);
    
    // Logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/edge-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/edge-combined.log' }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
    
    this.initialize();
  }

  async initialize() {
    try {
      this.logger.info(`Initializing Edge Computing Node: ${this.config.nodeId}`);
      
      // Initialize storage
      await this.initializeStorage();
      
      // Initialize Redis connection
      await this.initializeRedis();
      
      // Initialize AI models
      await this.initializeAI();
      
      // Initialize processing queues
      await this.initializeQueues();
      
      // Initialize cluster if enabled
      if (this.config.cluster.enabled) {
        await this.initializeCluster();
      }
      
      // Initialize mesh networking
      await this.initializeMeshNetwork();
      
      // Start monitoring
      this.startMonitoring();
      
      // Start optimization
      this.startOptimization();
      
      this.logger.info('Edge Computing Node initialized successfully');
      this.emit('initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Edge Computing Node:', error);
      throw error;
    }
  }

  // Storage Initialization
  async initializeStorage() {
    const dataPath = this.config.storage.dataPath;
    
    try {
      await fs.access(dataPath);
    } catch {
      await fs.mkdir(dataPath, { recursive: true });
    }
    
    // Create subdirectories
    const subdirs = ['models', 'cache', 'results', 'temp', 'logs'];
    for (const subdir of subdirs) {
      const subdirPath = path.join(dataPath, subdir);
      try {
        await fs.access(subdirPath);
      } catch {
        await fs.mkdir(subdirPath, { recursive: true });
      }
    }
    
    this.logger.info(`Storage initialized at: ${dataPath}`);
  }

  // Redis Initialization
  async initializeRedis() {
    this.redisClient = Redis.createClient(this.config.redis);
    
    this.redisClient.on('error', (error) => {
      this.logger.error('Redis error:', error);
    });
    
    this.redisClient.on('connect', () => {
      this.logger.info('Connected to Redis');
    });
    
    await this.redisClient.connect();
    
    // Register this edge node
    await this.registerEdgeNode();
  }

  // AI Model Initialization
  async initializeAI() {
    this.logger.info('Initializing AI models...');
    
    // Configure TensorFlow.js
    if (this.config.ai.enableGPU) {
      try {
        await tf.ready();
        this.logger.info('TensorFlow.js GPU backend ready');
      } catch (error) {
        this.logger.warn('GPU not available, falling back to CPU:', error.message);
      }
    }
    
    // Load pre-trained models
    await this.loadPretrainedModels();
    
    // Initialize model cache
    this.initializeModelCache();
  }

  async loadPretrainedModels() {
    const modelsPath = this.config.ai.modelsPath;
    
    try {
      const modelFiles = await fs.readdir(modelsPath);
      
      for (const modelFile of modelFiles) {
        if (modelFile.endsWith('.json') || modelFile.endsWith('.onnx')) {
          await this.loadModel(path.join(modelsPath, modelFile));
        }
      }
    } catch (error) {
      this.logger.warn('No pre-trained models found or error loading:', error.message);
    }
  }

  async loadModel(modelPath) {
    try {
      const modelName = path.basename(modelPath, path.extname(modelPath));
      
      let model;
      if (modelPath.endsWith('.json')) {
        // TensorFlow.js model
        model = await tf.loadLayersModel(`file://${modelPath}`);
      } else if (modelPath.endsWith('.onnx')) {
        // ONNX model
        const session = new onnx.InferenceSession();
        await session.loadModel(modelPath);
        model = session;
      }
      
      if (model) {
        this.aiModels.set(modelName, {
          model,
          type: modelPath.endsWith('.json') ? 'tensorflow' : 'onnx',
          path: modelPath,
          loadedAt: new Date(),
          usageCount: 0,
          lastUsed: new Date()
        });
        
        this.logger.info(`Model loaded: ${modelName}`);
      }
    } catch (error) {
      this.logger.error(`Failed to load model ${modelPath}:`, error);
    }
  }

  initializeModelCache() {
    // LRU cache for model results
    this.modelCache = new Map();
    
    // Periodic cache cleanup
    setInterval(() => {
      this.cleanupModelCache();
    }, 300000); // 5 minutes
  }

  // Queue Initialization
  async initializeQueues() {
    const queueTypes = [
      'image-processing',
      'video-processing',
      'audio-processing',
      'text-processing',
      'ai-inference',
      'data-analysis',
      'real-time-processing'
    ];
    
    for (const queueType of queueTypes) {
      const queue = new Bull(queueType, {
        redis: this.config.redis,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: this.config.processing.retryAttempts,
          backoff: {
            type: 'exponential',
            delay: 2000
          }
        }
      });
      
      // Set up queue processors
      queue.process(this.config.processing.batchSize, async (job) => {
        return await this.processTask(job.data);
      });
      
      // Queue event handlers
      queue.on('completed', (job, result) => {
        this.handleTaskCompleted(job, result);
      });
      
      queue.on('failed', (job, error) => {
        this.handleTaskFailed(job, error);
      });
      
      this.processingQueues.set(queueType, queue);
    }
    
    this.logger.info('Processing queues initialized');
  }

  // Cluster Initialization
  async initializeCluster() {
    if (cluster.isMaster) {
      this.logger.info(`Master process ${process.pid} starting ${this.config.cluster.workers} workers`);
      
      // Fork workers
      for (let i = 0; i < this.config.cluster.workers; i++) {
        const worker = cluster.fork();
        this.workers.set(worker.id, {
          worker,
          tasks: 0,
          memory: 0,
          cpu: 0,
          startedAt: new Date()
        });
      }
      
      // Handle worker events
      cluster.on('exit', (worker, code, signal) => {
        this.logger.warn(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
        this.workers.delete(worker.id);
        
        // Restart worker
        const newWorker = cluster.fork();
        this.workers.set(newWorker.id, {
          worker: newWorker,
          tasks: 0,
          memory: 0,
          cpu: 0,
          startedAt: new Date()
        });
      });
      
      cluster.on('message', (worker, message) => {
        this.handleWorkerMessage(worker, message);
      });
    } else {
      // Worker process
      this.initializeWorker();
    }
  }

  initializeWorker() {
    process.on('message', async (message) => {
      try {
        const result = await this.processWorkerTask(message);
        process.send({ type: 'result', taskId: message.taskId, result });
      } catch (error) {
        process.send({ type: 'error', taskId: message.taskId, error: error.message });
      }
    });
    
    this.logger.info(`Worker ${process.pid} initialized`);
  }

  // Mesh Network Initialization
  async initializeMeshNetwork() {
    // Create mesh server
    this.meshServer = new WebSocket.Server({ 
      port: this.config.networking.meshPort 
    });
    
    this.meshServer.on('connection', (ws, request) => {
      this.handleMeshConnection(ws, request);
    });
    
    // Discover other edge nodes
    await this.discoverEdgeNodes();
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Start synchronization
    this.startSynchronization();
    
    this.logger.info(`Mesh network initialized on port ${this.config.networking.meshPort}`);
  }

  // Task Processing
  async submitTask(taskType, taskData, options = {}) {
    const taskId = this.generateTaskId();
    
    const task = {
      id: taskId,
      type: taskType,
      data: taskData,
      options: {
        priority: options.priority || 'normal',
        timeout: options.timeout || this.config.processing.timeoutMs,
        retries: options.retries || this.config.processing.retryAttempts,
        nodeAffinity: options.nodeAffinity,
        ...options
      },
      submittedAt: new Date(),
      submittedBy: this.config.nodeId,
      status: 'pending'
    };
    
    this.tasks.set(taskId, task);
    
    // Determine optimal processing location
    const targetNode = await this.scheduler.scheduleTask(task);
    
    if (targetNode === this.config.nodeId) {
      // Process locally
      await this.processTaskLocally(task);
    } else {
      // Send to remote node
      await this.sendTaskToNode(task, targetNode);
    }
    
    return taskId;
  }

  async processTaskLocally(task) {
    const queue = this.processingQueues.get(task.type);
    if (!queue) {
      throw new Error(`Unknown task type: ${task.type}`);
    }
    
    const job = await queue.add(task.data, {
      priority: this.getPriorityValue(task.options.priority),
      delay: task.options.delay || 0,
      timeout: task.options.timeout
    });
    
    task.jobId = job.id;
    task.status = 'processing';
    task.startedAt = new Date();
    
    this.emit('taskStarted', task);
  }

  async processTask(taskData) {
    const startTime = performance.now();
    
    try {
      let result;
      
      switch (taskData.type) {
        case 'image-processing':
          result = await this.processImage(taskData);
          break;
        case 'video-processing':
          result = await this.processVideo(taskData);
          break;
        case 'audio-processing':
          result = await this.processAudio(taskData);
          break;
        case 'text-processing':
          result = await this.processText(taskData);
          break;
        case 'ai-inference':
          result = await this.runInference(taskData);
          break;
        case 'data-analysis':
          result = await this.analyzeData(taskData);
          break;
        case 'real-time-processing':
          result = await this.processRealTime(taskData);
          break;
        default:
          throw new Error(`Unknown task type: ${taskData.type}`);
      }
      
      const processingTime = performance.now() - startTime;
      this.updateMetrics(processingTime);
      
      return result;
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  // Specialized Processing Methods
  async processImage(taskData) {
    const { imageData, operations } = taskData;
    
    let image = sharp(Buffer.from(imageData, 'base64'));
    
    for (const operation of operations) {
      switch (operation.type) {
        case 'resize':
          image = image.resize(operation.width, operation.height);
          break;
        case 'crop':
          image = image.extract(operation.region);
          break;
        case 'filter':
          image = image.modulate(operation.params);
          break;
        case 'enhance':
          image = image.sharpen(operation.amount);
          break;
        case 'detect':
          return await this.detectObjects(imageData, operation.model);
        case 'classify':
          return await this.classifyImage(imageData, operation.model);
      }
    }
    
    const processedBuffer = await image.toBuffer();
    return {
      imageData: processedBuffer.toString('base64'),
      metadata: await image.metadata()
    };
  }

  async processVideo(taskData) {
    const { videoData, operations } = taskData;
    
    return new Promise((resolve, reject) => {
      const inputPath = path.join(this.config.storage.dataPath, 'temp', `input_${Date.now()}.mp4`);
      const outputPath = path.join(this.config.storage.dataPath, 'temp', `output_${Date.now()}.mp4`);
      
      // Write input video
      fs.writeFile(inputPath, Buffer.from(videoData, 'base64'))
        .then(() => {
          let command = ffmpeg(inputPath);
          
          for (const operation of operations) {
            switch (operation.type) {
              case 'resize':
                command = command.size(`${operation.width}x${operation.height}`);
                break;
              case 'crop':
                command = command.videoFilters(`crop=${operation.width}:${operation.height}:${operation.x}:${operation.y}`);
                break;
              case 'extract_frames':
                command = command.fps(operation.fps);
                break;
              case 'compress':
                command = command.videoBitrate(operation.bitrate);
                break;
            }
          }
          
          command
            .output(outputPath)
            .on('end', async () => {
              try {
                const processedBuffer = await fs.readFile(outputPath);
                
                // Cleanup
                await fs.unlink(inputPath);
                await fs.unlink(outputPath);
                
                resolve({
                  videoData: processedBuffer.toString('base64'),
                  metadata: { size: processedBuffer.length }
                });
              } catch (error) {
                reject(error);
              }
            })
            .on('error', reject)
            .run();
        })
        .catch(reject);
    });
  }

  async processAudio(taskData) {
    const { audioData, operations } = taskData;
    
    // Audio processing implementation
    // This would integrate with audio processing libraries
    return {
      audioData: audioData, // Placeholder
      metadata: { processed: true }
    };
  }

  async processText(taskData) {
    const { text, operations } = taskData;
    
    let result = text;
    
    for (const operation of operations) {
      switch (operation.type) {
        case 'sentiment':
          result = await this.analyzeSentiment(text);
          break;
        case 'entities':
          result = await this.extractEntities(text);
          break;
        case 'summarize':
          result = await this.summarizeText(text);
          break;
        case 'translate':
          result = await this.translateText(text, operation.targetLanguage);
          break;
        case 'classify':
          result = await this.classifyText(text, operation.categories);
          break;
      }
    }
    
    return result;
  }

  async runInference(taskData) {
    const { modelName, inputData, inputShape } = taskData;
    
    const modelInfo = this.aiModels.get(modelName);
    if (!modelInfo) {
      throw new Error(`Model not found: ${modelName}`);
    }
    
    // Check cache first
    const cacheKey = this.generateCacheKey(modelName, inputData);
    const cachedResult = this.modelCache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
    
    let result;
    
    if (modelInfo.type === 'tensorflow') {
      // TensorFlow.js inference
      const inputTensor = tf.tensor(inputData, inputShape);
      const prediction = modelInfo.model.predict(inputTensor);
      result = await prediction.data();
      
      // Cleanup tensors
      inputTensor.dispose();
      prediction.dispose();
    } else if (modelInfo.type === 'onnx') {
      // ONNX inference
      const inputMap = new Map();
      inputMap.set('input', new onnx.Tensor(inputData, 'float32', inputShape));
      
      const outputMap = await modelInfo.model.run(inputMap);
      result = Array.from(outputMap.values())[0].data;
    }
    
    // Cache result
    this.modelCache.set(cacheKey, result);
    
    // Update model usage
    modelInfo.usageCount++;
    modelInfo.lastUsed = new Date();
    
    this.metrics.inferenceCount++;
    
    return result;
  }

  async analyzeData(taskData) {
    const { data, analysisType, parameters } = taskData;
    
    switch (analysisType) {
      case 'statistical':
        return this.performStatisticalAnalysis(data, parameters);
      case 'clustering':
        return this.performClustering(data, parameters);
      case 'anomaly_detection':
        return this.detectAnomalies(data, parameters);
      case 'time_series':
        return this.analyzeTimeSeries(data, parameters);
      case 'correlation':
        return this.calculateCorrelations(data, parameters);
      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }
  }

  async processRealTime(taskData) {
    const { streamData, processingPipeline } = taskData;
    
    const results = [];
    
    for (const dataPoint of streamData) {
      let processedData = dataPoint;
      
      for (const stage of processingPipeline) {
        processedData = await this.applyProcessingStage(processedData, stage);
      }
      
      results.push(processedData);
    }
    
    return results;
  }

  // AI Helper Methods
  async detectObjects(imageData, modelName) {
    // Object detection implementation
    const result = await this.runInference({
      modelName,
      inputData: this.preprocessImage(imageData),
      inputShape: [1, 224, 224, 3]
    });
    
    return this.postprocessDetections(result);
  }

  async classifyImage(imageData, modelName) {
    // Image classification implementation
    const result = await this.runInference({
      modelName,
      inputData: this.preprocessImage(imageData),
      inputShape: [1, 224, 224, 3]
    });
    
    return this.postprocessClassification(result);
  }

  // Mesh Network Methods
  async discoverEdgeNodes() {
    // Discover other edge nodes through Redis
    const nodeKeys = await this.redisClient.keys('edge:node:*');
    
    for (const nodeKey of nodeKeys) {
      const nodeData = await this.redisClient.get(nodeKey);
      const node = JSON.parse(nodeData);
      
      if (node.id !== this.config.nodeId) {
        await this.connectToEdgeNode(node);
      }
    }
  }

  async connectToEdgeNode(node) {
    try {
      const ws = new WebSocket(`ws://${node.address}:${node.meshPort}`);
      
      ws.on('open', () => {
        this.meshClients.set(node.id, {
          ws,
          node,
          connectedAt: new Date(),
          lastHeartbeat: new Date()
        });
        
        this.logger.info(`Connected to edge node: ${node.id}`);
        
        // Send handshake
        ws.send(JSON.stringify({
          type: 'handshake',
          nodeId: this.config.nodeId,
          timestamp: new Date()
        }));
      });
      
      ws.on('message', (message) => {
        this.handleMeshMessage(node.id, JSON.parse(message));
      });
      
      ws.on('close', () => {
        this.meshClients.delete(node.id);
        this.logger.warn(`Disconnected from edge node: ${node.id}`);
      });
      
      ws.on('error', (error) => {
        this.logger.error(`Error connecting to edge node ${node.id}:`, error);
      });
    } catch (error) {
      this.logger.error(`Failed to connect to edge node ${node.id}:`, error);
    }
  }

  // Monitoring and Optimization
  startMonitoring() {
    // System metrics collection
    setInterval(async () => {
      await this.collectSystemMetrics();
    }, 10000);
    
    // Performance analysis
    setInterval(() => {
      this.analyzePerformance();
    }, 60000);
    
    // Health reporting
    setInterval(async () => {
      await this.reportHealth();
    }, 30000);
  }

  async collectSystemMetrics() {
    try {
      // CPU and memory usage
      const stats = await pidusage(process.pid);
      this.metrics.cpuUsage = stats.cpu;
      this.metrics.memoryUsage = stats.memory;
      
      // Disk usage
      const diskStats = await this.getDiskUsage();
      this.metrics.diskUsage = diskStats.used / diskStats.total;
      
      // Network latency
      this.metrics.networkLatency = await this.measureNetworkLatency();
      
      // Queue metrics
      for (const [queueName, queue] of this.processingQueues) {
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        const completed = await queue.getCompleted();
        const failed = await queue.getFailed();
        
        this.metrics[`${queueName}_waiting`] = waiting.length;
        this.metrics[`${queueName}_active`] = active.length;
        this.metrics[`${queueName}_completed`] = completed.length;
        this.metrics[`${queueName}_failed`] = failed.length;
      }
    } catch (error) {
      this.logger.error('Error collecting system metrics:', error);
    }
  }

  startOptimization() {
    // Model optimization
    setInterval(() => {
      this.optimizer.optimizeModels();
    }, 300000); // 5 minutes
    
    // Resource optimization
    setInterval(() => {
      this.optimizer.optimizeResources();
    }, 60000); // 1 minute
    
    // Cache optimization
    setInterval(() => {
      this.cleanupModelCache();
    }, 180000); // 3 minutes
  }

  // Utility Methods
  generateTaskId() {
    return `task_${this.config.nodeId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateCacheKey(modelName, inputData) {
    const hash = require('crypto').createHash('md5')
      .update(JSON.stringify({ modelName, inputData }))
      .digest('hex');
    return `cache_${hash}`;
  }

  getPriorityValue(priority) {
    const priorities = {
      'low': 1,
      'normal': 5,
      'high': 10,
      'critical': 20
    };
    return priorities[priority] || 5;
  }

  updateMetrics(processingTime) {
    this.metrics.tasksProcessed++;
    this.metrics.avgProcessingTime = 
      (this.metrics.avgProcessingTime * (this.metrics.tasksProcessed - 1) + processingTime) / 
      this.metrics.tasksProcessed;
  }

  cleanupModelCache() {
    const maxCacheSize = this.config.ai.modelCacheSize;
    
    if (this.modelCache.size > maxCacheSize) {
      // Remove oldest entries
      const entries = Array.from(this.modelCache.entries());
      const toRemove = entries.slice(0, entries.length - maxCacheSize);
      
      for (const [key] of toRemove) {
        this.modelCache.delete(key);
      }
    }
  }

  async registerEdgeNode() {
    const nodeInfo = {
      id: this.config.nodeId,
      address: this.getLocalIPAddress(),
      meshPort: this.config.networking.meshPort,
      capabilities: this.getNodeCapabilities(),
      resources: await this.getNodeResources(),
      registeredAt: new Date(),
      lastHeartbeat: new Date()
    };
    
    await this.redisClient.setEx(
      `edge:node:${this.config.nodeId}`,
      300, // 5 minutes TTL
      JSON.stringify(nodeInfo)
    );
  }

  getNodeCapabilities() {
    return {
      ai: Array.from(this.aiModels.keys()),
      processing: Array.from(this.processingQueues.keys()),
      protocols: ['websocket', 'redis', 'http'],
      features: ['clustering', 'mesh-networking', 'real-time-processing']
    };
  }

  async getNodeResources() {
    const stats = await pidusage(process.pid);
    
    return {
      cpu: {
        cores: os.cpus().length,
        usage: stats.cpu,
        architecture: os.arch()
      },
      memory: {
        total: os.totalmem(),
        used: stats.memory,
        free: os.freemem()
      },
      storage: await this.getDiskUsage(),
      network: {
        interfaces: os.networkInterfaces()
      }
    };
  }

  getLocalIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return 'localhost';
  }

  // Cleanup
  async shutdown() {
    this.logger.info('Shutting down Edge Computing Node...');
    
    // Close mesh connections
    for (const client of this.meshClients.values()) {
      client.ws.close();
    }
    
    if (this.meshServer) {
      this.meshServer.close();
    }
    
    // Close processing queues
    for (const queue of this.processingQueues.values()) {
      await queue.close();
    }
    
    // Close Redis connection
    if (this.redisClient) {
      await this.redisClient.quit();
    }
    
    // Dispose AI models
    for (const modelInfo of this.aiModels.values()) {
      if (modelInfo.type === 'tensorflow' && modelInfo.model.dispose) {
        modelInfo.model.dispose();
      }
    }
    
    this.logger.info('Edge Computing Node shutdown complete');
  }
}

// Load Balancer
class EdgeLoadBalancer {
  constructor(edgeNode) {
    this.edgeNode = edgeNode;
    this.nodeLoads = new Map();
  }

  async selectOptimalNode(task) {
    const availableNodes = Array.from(this.edgeNode.meshClients.keys());
    availableNodes.push(this.edgeNode.config.nodeId); // Include local node
    
    let bestNode = this.edgeNode.config.nodeId;
    let bestScore = await this.calculateNodeScore(this.edgeNode.config.nodeId, task);
    
    for (const nodeId of availableNodes) {
      const score = await this.calculateNodeScore(nodeId, task);
      if (score > bestScore) {
        bestScore = score;
        bestNode = nodeId;
      }
    }
    
    return bestNode;
  }

  async calculateNodeScore(nodeId, task) {
    // Scoring factors: CPU usage, memory usage, queue length, network latency, capabilities
    let score = 100;
    
    if (nodeId === this.edgeNode.config.nodeId) {
      // Local node
      score -= this.edgeNode.metrics.cpuUsage;
      score -= (this.edgeNode.metrics.memoryUsage / os.totalmem()) * 100;
      
      const queue = this.edgeNode.processingQueues.get(task.type);
      if (queue) {
        const waiting = await queue.getWaiting();
        score -= waiting.length;
      }
    } else {
      // Remote node - would need to query node status
      const nodeLoad = this.nodeLoads.get(nodeId) || { cpu: 50, memory: 50, queue: 0 };
      score -= nodeLoad.cpu;
      score -= nodeLoad.memory;
      score -= nodeLoad.queue;
      score -= 10; // Network overhead penalty
    }
    
    return Math.max(0, score);
  }
}

// Task Scheduler
class EdgeTaskScheduler {
  constructor(edgeNode) {
    this.edgeNode = edgeNode;
    this.loadBalancer = edgeNode.loadBalancer;
  }

  async scheduleTask(task) {
    // Check node affinity
    if (task.options.nodeAffinity) {
      return task.options.nodeAffinity;
    }
    
    // Use load balancer to select optimal node
    return await this.loadBalancer.selectOptimalNode(task);
  }
}

// Optimizer
class EdgeOptimizer {
  constructor(edgeNode) {
    this.edgeNode = edgeNode;
  }

  optimizeModels() {
    // Remove unused models
    const now = new Date();
    const maxIdleTime = 30 * 60 * 1000; // 30 minutes
    
    for (const [modelName, modelInfo] of this.edgeNode.aiModels) {
      if (now - modelInfo.lastUsed > maxIdleTime && modelInfo.usageCount === 0) {
        if (modelInfo.type === 'tensorflow' && modelInfo.model.dispose) {
          modelInfo.model.dispose();
        }
        this.edgeNode.aiModels.delete(modelName);
        this.edgeNode.logger.info(`Unloaded unused model: ${modelName}`);
      }
    }
  }

  optimizeResources() {
    // Adjust worker count based on load
    if (this.edgeNode.config.cluster.enabled && cluster.isMaster) {
      const avgCpuUsage = this.edgeNode.metrics.cpuUsage;
      const currentWorkers = this.edgeNode.workers.size;
      const maxWorkers = os.cpus().length;
      
      if (avgCpuUsage > 80 && currentWorkers < maxWorkers) {
        // Add worker
        const worker = cluster.fork();
        this.edgeNode.workers.set(worker.id, {
          worker,
          tasks: 0,
          memory: 0,
          cpu: 0,
          startedAt: new Date()
        });
        this.edgeNode.logger.info('Added worker due to high CPU usage');
      } else if (avgCpuUsage < 30 && currentWorkers > 1) {
        // Remove worker
        const workerToRemove = Array.from(this.edgeNode.workers.values())[0];
        workerToRemove.worker.kill();
        this.edgeNode.workers.delete(workerToRemove.worker.id);
        this.edgeNode.logger.info('Removed worker due to low CPU usage');
      }
    }
  }
}

module.exports = VentaroEdgeComputing;