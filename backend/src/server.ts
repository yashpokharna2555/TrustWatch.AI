import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { connectDB } from './config/database';
import { logger } from './utils/logger';
import { startCrawlScheduler } from './scheduler/crawlScheduler';

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

// Load environment variables
const envPaths = [
  path.resolve(__dirname, '../.env'),      // backend/.env
  path.resolve(__dirname, '../../.env'),   // root .env
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    if (process.env.NODE_ENV === 'development') {
      logger.info(`Loaded .env from: ${envPath}`);
    }
    break;
  }
}

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
