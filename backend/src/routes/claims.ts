import express from 'express';
import { Company } from '../models/Company';
import { Claim } from '../models/Claim';
import { ClaimVersion } from '../models/ClaimVersion';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Get claims
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
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

    const claims = await Claim.find(query)
      .sort({ lastSeenAt: -1 })
      .populate('companyId', 'displayName domain');

    res.json({ claims });
  } catch (error: any) {
    logger.error('Get claims error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get claim by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const claim = await Claim.findById(req.params.id).populate('companyId', 'displayName domain');

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    // Verify user owns the company
    const company = await Company.findOne({
      _id: claim.companyId,
      userId: req.userId,
    });

    if (!company) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ claim });
  } catch (error: any) {
    logger.error('Get claim error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get claim versions (timeline)
router.get('/:id/versions', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const claim = await Claim.findById(req.params.id);

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    // Verify user owns the company
    const company = await Company.findOne({
      _id: claim.companyId,
      userId: req.userId,
    });

    if (!company) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const versions = await ClaimVersion.find({ claimId: claim._id }).sort({ seenAt: -1 });

    res.json({ versions });
  } catch (error: any) {
    logger.error('Get claim versions error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
