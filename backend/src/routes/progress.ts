import express, { Request, Response } from 'express';
import { crawlProgressEmitter } from '../utils/crawlProgress';
import { logger } from '../utils/logger';

const router = express.Router();

// Server-Sent Events endpoint for real-time crawl progress
router.get('/progress', (req: Request, res: Response) => {
  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial connection message
  res.write('data: {"type":"connected","message":"Progress stream connected"}\n\n');

  // Listen for progress events
  const progressListener = (progress: any) => {
    const data = JSON.stringify(progress);
    res.write(`data: ${data}\n\n`);
  };

  crawlProgressEmitter.on('progress', progressListener);

  // Clean up on client disconnect
  req.on('close', () => {
    crawlProgressEmitter.off('progress', progressListener);
    logger.info('Client disconnected from progress stream');
  });
});

export default router;
