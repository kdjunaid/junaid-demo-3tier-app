require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const redis = require("redis");

const app = express();

// Environment variables
const PORT = process.env.PORT || 5050;
const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || "Ostad-DB";
const REDIS_URL = process.env.REDIS_URL;
const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 600;

// Logging utility
const log = {
  info: (message, data = '') => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO: ${message}`, data ? JSON.stringify(data) : '');
  },
  error: (message, error = '') => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`, error);
  },
  warn: (message, data = '') => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] WARN: ${message}`, data ? JSON.stringify(data) : '');
  }
};

// MongoDB client
const mongoClient = new MongoClient(MONGO_URL);

// Redis client
const redisClient = redis.createClient({ url: REDIS_URL });
redisClient.on("error", (err) => log.error("Redis client error:", err));
redisClient.on("connect", () => log.info("Redis client connected"));
redisClient.on("ready", () => log.info("Redis client ready"));
redisClient.on("end", () => log.warn("Redis client connection ended"));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  log.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method === 'POST' ? req.body : undefined
  });
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    log.info(`${req.method} ${req.path} - ${res.statusCode}`, {
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length')
    });
  });
  
  next();
});

// ===== DATABASE CONNECTION =====
async function connectDB() {
  try {
    log.info("Attempting to connect to databases...");
    
    // MongoDB connection
    log.info("Connecting to MongoDB...", { url: MONGO_URL ? "***configured***" : "not configured" });
    await mongoClient.connect();
    log.info("✅ MongoDB connected successfully");
    
    // Redis connection
    log.info("Connecting to Redis...", { url: REDIS_URL ? "***configured***" : "not configured" });
    await redisClient.connect();
    log.info("✅ Redis connected successfully");
    
    log.info("✅ All database connections established");
  } catch (error) {
    log.error("❌ Database connection failed:", error.message);
    log.error("Stack trace:", error.stack);
    process.exit(1);
  }
}

// ===== ROUTES =====

// GET all students
app.get("/getStudents", async (req, res) => {
  try {
    log.info("Fetching all students from database");
    const db = mongoClient.db(DB_NAME);
    const students = await db.collection("students").find({}).toArray();
    log.info(`Successfully retrieved ${students.length} students`);
    res.json(students);
  } catch (err) {
    log.error("Failed to fetch students:", err.message);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

// POST new student
app.post("/addStudent", async (req, res) => {
  try {
    const studentData = req.body;
    log.info("Adding new student", { studentId: studentData.id, studentName: studentData.name });
    
    if (!studentData.id || !studentData.name) {
      log.warn("Invalid student data provided", studentData);
      return res.status(400).json({ error: "Invalid student data" });
    }

    const db = mongoClient.db(DB_NAME);
    const result = await db.collection("students").insertOne(studentData);
    
    log.info("✅ Student added successfully", { 
      insertedId: result.insertedId, 
      studentId: studentData.id 
    });
    
    res.status(201).json({ message: "Student added", id: result.insertedId });
  } catch (err) {
    log.error("Failed to add student:", err.message);
    res.status(500).json({ error: "Failed to add student" });
  }
});

// GET result by student ID (with Redis caching)
app.get("/result/:id", async (req, res) => {
  const studentId = req.params.id;
  try {
    log.info(`Fetching result for student: ${studentId}`);
    
    // Check cache first
    log.info(`Checking Redis cache for student: ${studentId}`);
    const cached = await redisClient.get(`result:${studentId}`);
    if (cached) {
      log.info(`✅ Cache HIT for student: ${studentId}`);
      return res.json(JSON.parse(cached));
    }
    
    log.info(`Cache MISS for student: ${studentId}, querying database`);
    const db = mongoClient.db(DB_NAME);
    const result = await db.collection("results").findOne({ id: studentId });
    
    if (!result) {
      log.warn(`Result not found for student: ${studentId}`);
      return res.status(404).json({ error: "Result not found" });
    }

    // Cache the result
    log.info(`Caching result for student: ${studentId}, TTL: ${CACHE_TTL}s`);
    await redisClient.setEx(`result:${studentId}`, CACHE_TTL, JSON.stringify(result));
    
    log.info(`✅ Successfully retrieved result for student: ${studentId}`);
    res.json(result);
  } catch (err) {
    log.error(`Failed to fetch result for student ${studentId}:`, err.message);
    res.status(500).json({ error: "Failed to fetch result" });
  }
});

// POST new result
app.post("/addResult", async (req, res) => {
  try {
    const resultData = req.body;
    log.info("Adding new result", { studentId: resultData.id });
    
    if (!resultData.id || !resultData.subjects) {
      log.warn("Invalid result data provided", resultData);
      return res.status(400).json({ error: "Invalid result data" });
    }

    const db = mongoClient.db(DB_NAME);
    const inserted = await db.collection("results").insertOne(resultData);
    
    // Cache the new result
    log.info(`Caching new result for student: ${resultData.id}`);
    await redisClient.setEx(`result:${resultData.id}`, CACHE_TTL, JSON.stringify(resultData));
    
    log.info("✅ Result added successfully", { 
      insertedId: inserted.insertedId, 
      studentId: resultData.id 
    });
    
    res.status(201).json({ message: "Result added", id: inserted.insertedId });
  } catch (err) {
    log.error("Failed to add result:", err.message);
    res.status(500).json({ error: "Failed to add result" });
  }
});

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Check MongoDB connection
    await mongoClient.db(DB_NAME).admin().ping();
    // Check Redis connection
    await redisClient.ping();
    
    log.info("Health check passed");
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      services: {
        mongodb: "connected",
        redis: "connected"
      }
    });
  } catch (err) {
    log.error("Health check failed:", err.message);
    res.status(503).json({ 
      status: "unhealthy", 
      timestamp: new Date().toISOString(),
      error: err.message 
    });
  }
});

// Base route
app.get("/", (req, res) => {
  log.info("Root endpoint accessed");
  res.send("Ostad Result Checker API is running");
});

// Global error handler
app.use((err, req, res, next) => {
  log.error("Unhandled error:", err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  log.error('Uncaught Exception:', err.stack);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  log.info('Received SIGINT, shutting down gracefully...');
  try {
    await mongoClient.close();
    await redisClient.quit();
    log.info('✅ Database connections closed');
    process.exit(0);
  } catch (err) {
    log.error('Error during shutdown:', err.message);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  log.info('Received SIGTERM, shutting down gracefully...');
  try {
    await mongoClient.close();
    await redisClient.quit();
    log.info('✅ Database connections closed');
    process.exit(0);
  } catch (err) {
    log.error('Error during shutdown:', err.message);
    process.exit(1);
  }
});

// Start server
(async () => {
  log.info("🚀 Starting Ostad Result Checker API...");
  log.info("Environment configuration:", {
    port: PORT,
    dbName: DB_NAME,
    cacheTTL: CACHE_TTL,
    nodeEnv: process.env.NODE_ENV || 'development'
  });
  
  await connectDB();
  
  app.listen(PORT, () => {
    log.info(`🚀 Server successfully started at http://localhost:${PORT}`);
    log.info("API endpoints available:");
    log.info("  GET  / - Root endpoint");
    log.info("  GET  /health - Health check");
    log.info("  GET  /getStudents - Get all students");
    log.info("  POST /addStudent - Add new student");
    log.info("  GET  /result/:id - Get result by student ID");
    log.info("  POST /addResult - Add new result");
  });
})();