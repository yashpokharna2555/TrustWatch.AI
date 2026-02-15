import express from 'express';
import { Types } from 'mongoose';
import { Company } from '../models/Company';
import { CrawlTarget } from '../models/CrawlTarget';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { enqueueCrawlTarget } from '../queue/enqueue';

const router = express.Router();

// Get all companies for user
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const companies = await Company.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json({ companies });
  } catch (error: any) {
    logger.error('Get companies error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get company by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const company = await Company.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json({ company });
  } catch (error: any) {
    logger.error('Get company error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add company
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { domain, displayName, categories } = req.body;

    if (!domain || !displayName) {
      return res.status(400).json({ error: 'Domain and display name required' });
    }

    // Create company
    const company = await Company.create({
      userId: req.userId,
      domain: domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, ''),
      displayName,
      categoriesEnabled: categories || ['security', 'privacy'],
      riskScore: 0,
    });

    // Create initial crawl targets
    const targets = [];
    const baseUrl = `https://${company.domain}`;

    // Normalize categories to lowercase
    const normalizedCategories = categories.map((c: string) => c.toLowerCase());

    // Check if this is a demo site (full path already included)
    const isDemoSite = company.domain.includes('demo-sites');

    if (isDemoSite) {
      // For demo sites, use the URL as-is (it already points to the full page)
      logger.info(`Creating demo site crawl target: ${baseUrl}`);
      targets.push({ url: baseUrl, type: 'seed' });
    } else {
      // For regular domains, append standard paths
      if (normalizedCategories.includes('security')) {
        targets.push(
          { url: `${baseUrl}/security`, type: 'seed' },
          { url: `${baseUrl}/trust`, type: 'seed' },
          { url: `${baseUrl}/compliance`, type: 'seed' }
        );
      }

      if (normalizedCategories.includes('privacy')) {
        targets.push(
          { url: `${baseUrl}/privacy`, type: 'seed' },
          { url: `${baseUrl}/terms`, type: 'seed' }
        );
      }

      if (normalizedCategories.includes('sla')) {
        targets.push(
          { url: `${baseUrl}/sla`, type: 'seed' },
          { url: `${baseUrl}/status`, type: 'seed' }
        );
      }

      if (normalizedCategories.includes('pricing')) {
        targets.push({ url: `${baseUrl}/pricing`, type: 'seed' });
      }
    }

    // Create crawl targets
    for (const target of targets) {
      try {
        await CrawlTarget.create({
          companyId: company._id,
          url: target.url,
          type: target.type,
        });
      } catch (error: any) {
        // Ignore duplicate key errors
        if (error.code !== 11000) {
          logger.error('Failed to create crawl target:', error);
        }
      }
    }

    logger.info(`Company added: ${displayName} (${domain})`, { userId: req.userId });

    // Enqueue initial crawl jobs (don't execute directly)
    const createdTargets = await CrawlTarget.find({ companyId: company._id });
    for (const target of createdTargets) {
      await enqueueCrawlTarget({
        companyId: company._id.toString(),
        targetId: target._id.toString(),
        url: target.url,
      });
    }
    logger.info(`Enqueued ${createdTargets.length} crawl jobs for ${displayName}`);

    res.json({ company });
  } catch (error: any) {
    logger.error('Add company error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete company
router.delete('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const company = await Company.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Delete associated crawl targets
    await CrawlTarget.deleteMany({ companyId: company._id });

    logger.info(`Company deleted: ${company.displayName}`, { userId: req.userId });

    res.json({ message: 'Company deleted' });
  } catch (error: any) {
    logger.error('Delete company error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
