// Ventaro AI - Ultimate AI Platform Server
// Comprehensive backend with cutting-edge integrations

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const winston = require('winston');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const Redis = require('redis');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const { OpenAI } = require('openai');
const { HfInference } = require('@huggingface/inference');
const tf = require('@tensorflow/tfjs-node');
const natural = require('natural');
const sentiment = require('sentiment');
const { createClient } = require('@supabase/supabase-js');
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const Web3 = require('web3');
const { ethers } = require('ethers');
const cron = require('node-cron');
const Queue = require('bull');
const cluster = require('cluster');
const os = require('os');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Configure Winston Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ventaro-ai' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Redis Client
const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.connect();

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ventaro-ai', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  logger.info('Connected to MongoDB');
}).catch((err) => {
  logger.error('MongoDB connection error:', err);
});

// Supabase Client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// OpenAI Client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Hugging Face Client
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Twilio Client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Email Configuration
const emailTransporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Web3 Configuration
const web3 = new Web3(process.env.WEB3_PROVIDER_URL || 'https://mainnet.infura.io/v3/YOUR_PROJECT_ID');
const ethProvider = new ethers.providers.JsonRpcProvider(process.env.ETH_PROVIDER_URL);

// Bull Queue for Background Jobs
const emailQueue = new Queue('email processing', process.env.REDIS_URL);
const aiProcessingQueue = new Queue('ai processing', process.env.REDIS_URL);
const analyticsQueue = new Queue('analytics processing', process.env.REDIS_URL);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many API requests, please try again later.'
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"]
    }
  }
}));

app.use(compression());
app.use(limiter);
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Session Configuration
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'ventaro-ai-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport Configuration
app.use(passport.initialize());
app.use(passport.session());

// File Upload Configuration
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|csv|xlsx|mp4|mp3|wav/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Database Models
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  avatar: String,
  role: { type: String, enum: ['user', 'admin', 'premium'], default: 'user' },
  subscription: {
    plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    status: { type: String, enum: ['active', 'inactive', 'cancelled'], default: 'active' },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    currentPeriodEnd: Date
  },
  preferences: {
    theme: { type: String, default: 'dark' },
    language: { type: String, default: 'en' },
    notifications: { type: Boolean, default: true },
    aiModel: { type: String, default: 'gpt-4' }
  },
  usage: {
    promptsUsed: { type: Number, default: 0 },
    tokensUsed: { type: Number, default: 0 },
    imagesGenerated: { type: Number, default: 0 },
    videosProcessed: { type: Number, default: 0 }
  },
  achievements: [{
    name: String,
    description: String,
    unlockedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastLogin: Date,
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

const PromptSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, required: true },
  subcategory: String,
  tags: [String],
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  uses: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  premium: { type: Boolean, default: false },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  variables: [{
    name: String,
    description: String,
    type: { type: String, enum: ['text', 'number', 'select', 'textarea'], default: 'text' },
    options: [String],
    required: { type: Boolean, default: false }
  }],
  examples: [{
    input: String,
    output: String
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
});

const ToolSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  subcategory: String,
  url: String,
  apiEndpoint: String,
  pricing: {
    model: { type: String, enum: ['free', 'freemium', 'paid', 'subscription'], default: 'free' },
    price: Number,
    currency: { type: String, default: 'USD' },
    billingCycle: { type: String, enum: ['monthly', 'yearly', 'one-time'], default: 'monthly' }
  },
  features: [String],
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  uses: { type: Number, default: 0 },
  tags: [String],
  screenshots: [String],
  logo: String,
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ConversationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: String,
  messages: [{
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    tokens: Number,
    model: String,
    attachments: [{
      type: String,
      url: String,
      filename: String
    }]
  }],
  model: { type: String, default: 'gpt-4' },
  temperature: { type: Number, default: 0.7 },
  maxTokens: { type: Number, default: 2048 },
  totalTokens: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const AnalyticsSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  event: { type: String, required: true },
  data: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now },
  sessionId: String,
  userAgent: String,
  ip: String,
  country: String,
  city: String,
  device: String,
  browser: String,
  os: String
});

// Create Models
const User = mongoose.model('User', UserSchema);
const Prompt = mongoose.model('Prompt', PromptSchema);
const Tool = mongoose.model('Tool', ToolSchema);
const Conversation = mongoose.model('Conversation', ConversationSchema);
const Analytics = mongoose.model('Analytics', AnalyticsSchema);

// Authentication Middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ventaro-secret');
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Admin Middleware
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Premium Middleware
const requirePremium = (req, res, next) => {
  if (req.user.subscription.plan === 'free') {
    return res.status(403).json({ error: 'Premium subscription required' });
  }
  next();
};

// Analytics Middleware
const trackAnalytics = async (req, res, next) => {
  try {
    const analytics = new Analytics({
      user: req.user ? req.user._id : null,
      event: `${req.method} ${req.path}`,
      data: {
        query: req.query,
        body: req.body,
        params: req.params
      },
      sessionId: req.sessionID,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    await analytics.save();
  } catch (error) {
    logger.error('Analytics tracking error:', error);
  }
  next();
};

// Routes

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      name,
      verificationToken: jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '24h' })
    });
    
    await user.save();
    
    // Send verification email
    await emailQueue.add('verification', {
      email: user.email,
      name: user.name,
      token: user.verificationToken
    });
    
    res.status(201).json({
      message: 'User created successfully. Please check your email for verification.',
      userId: user._id
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'ventaro-secret',
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscription: user.subscription,
        preferences: user.preferences
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// AI Chat Routes
app.post('/api/ai/chat', authenticateToken, trackAnalytics, async (req, res) => {
  try {
    const { message, conversationId, model = 'gpt-4', temperature = 0.7 } = req.body;
    
    // Check usage limits
    if (req.user.subscription.plan === 'free' && req.user.usage.tokensUsed > 10000) {
      return res.status(403).json({ error: 'Token limit exceeded. Please upgrade your plan.' });
    }
    
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findOne({ _id: conversationId, user: req.user._id });
    } else {
      conversation = new Conversation({
        user: req.user._id,
        title: message.substring(0, 50) + '...',
        model,
        temperature
      });
    }
    
    // Add user message
    conversation.messages.push({
      role: 'user',
      content: message
    });
    
    // Get AI response
    const completion = await openai.chat.completions.create({
      model,
      messages: conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature,
      max_tokens: 2048
    });
    
    const aiResponse = completion.choices[0].message.content;
    const tokensUsed = completion.usage.total_tokens;
    
    // Add AI response
    conversation.messages.push({
      role: 'assistant',
      content: aiResponse,
      tokens: tokensUsed,
      model
    });
    
    conversation.totalTokens += tokensUsed;
    conversation.updatedAt = new Date();
    
    await conversation.save();
    
    // Update user usage
    req.user.usage.tokensUsed += tokensUsed;
    await req.user.save();
    
    res.json({
      response: aiResponse,
      conversationId: conversation._id,
      tokensUsed,
      totalTokens: conversation.totalTokens
    });
  } catch (error) {
    logger.error('AI Chat error:', error);
    res.status(500).json({ error: 'Failed to process AI request' });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname)));

// Catch-all handler for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Socket.IO for real-time features
io.on('connection', (socket) => {
  logger.info('User connected:', socket.id);
  
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    logger.info(`User ${socket.id} joined room ${roomId}`);
  });
  
  socket.on('ai-stream', async (data) => {
    try {
      const { message, model = 'gpt-4' } = data;
      
      const stream = await openai.chat.completions.create({
        model,
        messages: [{ role: 'user', content: message }],
        stream: true
      });
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          socket.emit('ai-chunk', { content });
        }
      }
      
      socket.emit('ai-complete');
    } catch (error) {
      logger.error('AI Stream error:', error);
      socket.emit('ai-error', { error: 'Failed to process AI request' });
    }
  });
  
  socket.on('disconnect', () => {
    logger.info('User disconnected:', socket.id);
  });
});

// Background Job Processors
emailQueue.process('verification', async (job) => {
  const { email, name, token } = job.data;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify your Ventaro AI account',
    html: `
      <h1>Welcome to Ventaro AI, ${name}!</h1>
      <p>Please click the link below to verify your account:</p>
      <a href="${process.env.CLIENT_URL}/verify?token=${token}">Verify Account</a>
    `
  };
  
  await emailTransporter.sendMail(mailOptions);
});

// Cron Jobs
cron.schedule('0 0 * * *', async () => {
  // Daily analytics aggregation
  logger.info('Running daily analytics aggregation');
  // Implementation here
});

cron.schedule('0 */6 * * *', async () => {
  // Clean up old sessions and temporary data
  logger.info('Running cleanup tasks');
  // Implementation here
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Ventaro AI Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;