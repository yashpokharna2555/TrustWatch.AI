import express from 'express';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { Company } from '../models/Company';
import { CrawlTarget } from '../models/CrawlTarget';
import { crawlService } from '../services/crawlService';
import { logger } from '../utils/logger';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Seed demo data
router.post('/seed', async (req, res) => {
  try {
    logger.info('Seeding demo data...');

    // Create demo user
    let user = await User.findOne({ email: 'demo@trustwatch.com' });
    if (!user) {
      const passwordHash = await bcrypt.hash('demo123', 10);
      user = await User.create({
        email: 'demo@trustwatch.com',
        passwordHash,
      });
      logger.info('Demo user created: demo@trustwatch.com / demo123');
    }

    // Create demo company
    let company = await Company.findOne({ 
      userId: user._id, 
      domain: 'acmecorp.com' 
    });

    if (!company) {
      company = await Company.create({
        userId: user._id,
        domain: 'acmecorp.com',
        displayName: 'Acme Corp (Demo)',
        categoriesEnabled: ['security', 'privacy', 'sla'],
        riskScore: 0,
      });
      logger.info('Demo company created: Acme Corp');
    }

    // Create demo crawl targets (v1 and v2)
    const targetV1 = 'http://localhost:3000/demo-sites/acme/security-v1';
    const targetV2 = 'http://localhost:3000/demo-sites/acme/security-v2';

    await CrawlTarget.findOneAndUpdate(
      { companyId: company._id, url: targetV1 },
      {
        companyId: company._id,
        url: targetV1,
        type: 'seed',
      },
      { upsert: true }
    );

    await CrawlTarget.findOneAndUpdate(
      { companyId: company._id, url: targetV2 },
      {
        companyId: company._id,
        url: targetV2,
        type: 'seed',
      },
      { upsert: true }
    );

    logger.info('Demo data seeded successfully');

    res.json({
      message: 'Demo data seeded',
      user: {
        email: user.email,
        password: 'demo123',
      },
      company: {
        id: company._id,
        name: company.displayName,
      },
    });
  } catch (error: any) {
    logger.error('Demo seed error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Run demo crawl (v1 then v2)
router.post('/run', authMiddleware, async (req: AuthRequest, res) => {
  try {
    logger.info('Running demo crawl...');

    // Get current user from auth
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find or create demo company for this user
    let company = await Company.findOne({
      userId,
      domain: 'acmecorp.com',
    });

    if (!company) {
      logger.info('Creating demo company for user');
      company = await Company.create({
        userId,
        domain: 'acmecorp.com',
        displayName: 'Acme Corp (Demo)',
        categoriesEnabled: ['security', 'privacy', 'sla'],
        riskScore: 0,
      });
    }

    // Create demo crawl targets (v1 and v2)
    const targetV1 = 'http://localhost:3000/demo-sites/acme/security-v1';
    const targetV2 = 'http://localhost:3000/demo-sites/acme/security-v2';

    await CrawlTarget.findOneAndUpdate(
      { companyId: company._id, url: targetV1 },
      {
        companyId: company._id,
        url: targetV1,
        type: 'seed',
      },
      { upsert: true }
    );

    await CrawlTarget.findOneAndUpdate(
      { companyId: company._id, url: targetV2 },
      {
        companyId: company._id,
        url: targetV2,
        type: 'seed',
      },
      { upsert: true }
    );

    // Step 1: Crawl v1 (baseline)
    logger.info('Demo: Crawling v1 (baseline)...');
    const targetV1Doc = await CrawlTarget.findOne({
      companyId: company._id,
      url: targetV1,
    });

    if (targetV1Doc) {
      // Reset hash to force crawl
      await CrawlTarget.updateOne(
        { _id: targetV1Doc._id },
        { $set: { lastHash: undefined } }
      );

      await crawlService.crawlCompany(company._id);
      logger.info('Demo: v1 crawl complete');
    }

    // Step 2: Crawl v2 (with changes)
    logger.info('Demo: Crawling v2 (with changes)...');
    const targetV2Doc = await CrawlTarget.findOne({
      companyId: company._id,
      url: targetV2,
    });

    if (targetV2Doc) {
      // Delete v1 target
      await CrawlTarget.deleteOne({ _id: targetV1Doc?._id });

      // Reset v2 hash to force re-crawl
      await CrawlTarget.updateOne(
        { _id: targetV2Doc._id },
        { $set: { lastHash: undefined } }
      );

      await crawlService.crawlCompany(company._id);
      logger.info('Demo: v2 crawl complete');
    }

    logger.info('Demo crawl completed successfully');

    res.json({
      message: 'Demo crawl completed',
      companyId: company._id,
      note: 'Check dashboard for critical events',
    });
  } catch (error: any) {
    logger.error('Demo run error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
