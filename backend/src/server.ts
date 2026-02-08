import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { connectDB } from './config/database';
import { logger } from './utils/logger';
import { startCrawlScheduler } from './jobs/crawlScheduler';

// Import routes
import authRoutes from './routes/auth';
import companyRoutes from './routes/companies';
import crawlRoutes from './routes/crawl';
import claimRoutes from './routes/claims';
import eventRoutes from './routes/events';
import evidenceRoutes from './routes/evidence';
import demoRoutes from './routes/demo';
import testRoutes from './routes/test';
import progressRoutes from './routes/progress';

// Load .env file - try multiple possible locations
const possibleEnvPaths = [
  path.resolve(__dirname, '../.env'),             // Backend folder (src/../.env)
  path.resolve(process.cwd(), '.env'),            // From current working directory
  path.resolve(__dirname, '../../.env'),          // Two levels up from src
  'C:\\Coding\\TrustWatch\\.env',                 // Absolute path as fallback
  'C:\\Coding\\TrustWatch\\backend\\.env',        // Backend folder absolute
];

let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`✅ Loaded .env from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.error('❌ Could not find .env file in any expected location');
  console.log('Tried:', possibleEnvPaths);
}

// Debug: Log if API keys are loaded
console.log('Environment check:');
console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✅ Loaded' : '❌ Missing');
console.log('FIRECRAWL_API_KEY:', process.env.FIRECRAWL_API_KEY ? '✅ Loaded' : '❌ Missing');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Loaded' : '❌ Missing');
console.log('DEMO_MODE:', process.env.DEMO_MODE ? `✅ ${process.env.DEMO_MODE}` : '❌ Not set');
console.log('');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/crawl', crawlRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/evidence', evidenceRoutes);
app.use('/api/demo', demoRoutes);
app.use('/api/test', testRoutes);
app.use('/api/progress', progressRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('✅ MongoDB connected');

    // Start crawl scheduler
    startCrawlScheduler();
    logger.info('✅ Crawl scheduler started');

    app.listen(PORT, () => {
      logger.info(`🚀 TrustWatch Backend running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
