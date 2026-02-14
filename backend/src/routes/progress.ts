import express, { Request, Response } from 'express';
import { crawlProgressEmitter } from '../utils/crawlProgress';
import { logger } from '../utils/logger';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import Company from '../models/Company';

const router = express.Router();

// Server-Sent Events endpoint for real-time crawl progress
// Now secured with authentication and user-scoped
router.get('/progress', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Get user's company IDs for filtering
  const userCompanies = await Company.find({ userId }).select('_id');
  const userCompanyIds = userCompanies.map(c => c._id.toString());

  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // Only allow requests from our frontend domain
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.setHeader('Access-Control-Allow-Origin', frontendUrl);
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Send initial connection message
  res.write('data: {"type":"connected","message":"Monitoring status connected"}\n\n');

  // Listen for progress events and filter by user's companies
  const progressListener = (progress: any) => {
    // Only send progress for this user's companies
    if (userCompanyIds.includes(progress.companyId)) {
      const data = JSON.stringify(progress);
      res.write(`data: ${data}\n\n`);
    }
  };

  crawlProgressEmitter.on('progress', progressListener);

  // Clean up on client disconnect
  req.on('close', () => {
    crawlProgressEmitter.off('progress', progressListener);
    if (process.env.NODE_ENV === 'development') {
      logger.info('Client disconnected from progress stream');
    }
  });
});

export default router;
