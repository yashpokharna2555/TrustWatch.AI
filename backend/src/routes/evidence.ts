import express from 'express';
import { Company } from '../models/Company';
import { Evidence } from '../models/Evidence';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Get evidence
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

    const evidence = await Evidence.find(query)
      .sort({ createdAt: -1 })
      .populate('companyId', 'displayName domain');

    res.json({ evidence });
  } catch (error: any) {
    logger.error('Get evidence error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
