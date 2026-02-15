import express from 'express';
import { Types } from 'mongoose';
import { Company } from '../models/Company';
import { CrawlTarget } from '../models/CrawlTarget';
import { CrawlRun } from '../models/CrawlRun';
import { enqueueCrawlTarget } from '../queue/enqueue';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Trigger crawl
router.post('/run', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.body;

    if (companyId) {
      // Crawl specific company
      const company = await Company.findOne({
        _id: companyId,
        userId: req.userId,
      });

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      logger.info(`Manual crawl triggered for company ${companyId}`, { userId: req.userId });

      // Enqueue crawl jobs (don't execute directly)
      const targets = await CrawlTarget.find({ companyId: company._id });
      for (const target of targets) {
        await enqueueCrawlTarget({
          companyId: company._id.toString(),
          targetId: target._id.toString(),
          url: target.url,
        });
      }

      res.json({ message: 'Crawl jobs enqueued', companyId, jobsEnqueued: targets.length });
    } else {
      // Crawl all companies for user
      const companies = await Company.find({ userId: req.userId });

      logger.info(`Manual crawl triggered for all companies`, {
        userId: req.userId,
        count: companies.length,
      });

      let totalJobsEnqueued = 0;

      // Enqueue crawls for all companies
      for (const company of companies) {
        const targets = await CrawlTarget.find({ companyId: company._id });
        for (const target of targets) {
          await enqueueCrawlTarget({
            companyId: company._id.toString(),
            targetId: target._id.toString(),
            url: target.url,
          });
          totalJobsEnqueued++;
        }
      }

      res.json({ message: 'Crawl jobs enqueued for all companies', count: companies.length, jobsEnqueued: totalJobsEnqueued });
    }
  } catch (error: any) {
    logger.error('Crawl run error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get crawl status
router.get('/status', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { companyId } = req.query;

    let query: any = {};
    
    if (companyId) {
      // Verify user owns this company
      const company = await Company.findOne({
        _id: companyId,
        userId: req.userId,
      });

      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      query.companyId = companyId;
    } else {
      // Get all companies for user
      const companies = await Company.find({ userId: req.userId });
      query.companyId = { $in: companies.map(c => c._id) };
    }

    const runs = await CrawlRun.find(query)
      .sort({ startedAt: -1 })
      .limit(10)
      .populate('companyId', 'displayName domain');

    res.json({ runs });
  } catch (error: any) {
    logger.error('Get crawl status error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
