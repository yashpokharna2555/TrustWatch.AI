import express from 'express';
import mongoose from 'mongoose';
import { sendTestEmail } from '../services/email';
import { firecrawlClient } from '../services/firecrawl';
import { reductoClient } from '../services/reducto';
import { logger } from '../utils/logger';

const router = express.Router();

// Test MongoDB connection
router.get('/mongodb', async (req, res) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    const dbName = mongoose.connection.name;
    const host = mongoose.connection.host;

    res.json({
      status: isConnected ? 'connected' : 'disconnected',
      database: dbName,
      host,
    });
  } catch (error: any) {
    logger.error('MongoDB test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test Firecrawl
router.post('/firecrawl', async (req, res) => {
  try {
    const testUrl = req.body.url || 'https://firecrawl.dev';
    
    logger.info(`Testing Firecrawl with URL: ${testUrl}`);
    const result = await firecrawlClient.scrape(testUrl);

    res.json({
      status: 'success',
      url: testUrl,
      contentLength: result.markdown.length,
      preview: result.markdown.substring(0, 200) + '...',
    });
  } catch (error: any) {
    logger.error('Firecrawl test error:', error);
    res.status(500).json({ 
      error: error.message,
      hint: 'Check your FIRECRAWL_API_KEY in .env',
    });
  }
});

// Test Resend
router.post('/resend', async (req, res) => {
  try {
    const to = req.body.to || process.env.ALERT_TO_EMAIL || 'test@example.com';
    
    logger.info(`Testing Resend email to: ${to}`);
    await sendTestEmail(to);

    res.json({
      status: 'success',
      message: `Test email sent to ${to}`,
    });
  } catch (error: any) {
    logger.error('Resend test error:', error);
    res.status(500).json({ 
      error: error.message,
      hint: 'Check your RESEND_API_KEY in .env',
    });
  }
});

// Test Reducto
router.post('/reducto', async (req, res) => {
  try {
    const pdfUrl = req.body.url || 'https://www.africau.edu/images/default/sample.pdf';
    
    logger.info(`Testing Reducto with PDF: ${pdfUrl}`);
    const result = await reductoClient.parsePDF(pdfUrl);
    const fields = reductoClient.extractEvidenceFields(result.text);

    res.json({
      status: 'success',
      pdfUrl,
      textLength: result.text.length,
      extractedFields: fields,
      metadata: result.metadata, // Includes job_id, pages, credits, studio_link
      preview: result.text.substring(0, 500) + '...',
    });
  } catch (error: any) {
    logger.error('Reducto test error:', error);
    res.status(500).json({ 
      error: error.message,
      hint: 'Check your REDUCTO_API_KEY in .env',
    });
  }
});

export default router;
