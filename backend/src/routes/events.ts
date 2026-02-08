import express from 'express';
import { Company } from '../models/Company';
import { ChangeEvent } from '../models/ChangeEvent';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// Get events
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { companyId, severity } = req.query;

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

    if (severity) {
      query.severity = severity;
    }

    const events = await ChangeEvent.find(query)
      .sort({ detectedAt: -1 })
      .limit(100)
      .populate('companyId', 'displayName domain');

    res.json({ events });
  } catch (error: any) {
    logger.error('Get events error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get event by ID
router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const event = await ChangeEvent.findById(req.params.id).populate('companyId', 'displayName domain');

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Verify user owns the company
    const company = await Company.findOne({
      _id: event.companyId,
      userId: req.userId,
    });

    if (!company) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ event });
  } catch (error: any) {
    logger.error('Get event error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Acknowledge event
router.post('/:id/ack', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const event = await ChangeEvent.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Verify user owns the company
    const company = await Company.findOne({
      _id: event.companyId,
      userId: req.userId,
    });

    if (!company) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    event.acknowledged = true;
    await event.save();

    logger.info(`Event acknowledged: ${event._id}`, { userId: req.userId });

    res.json({ event });
  } catch (error: any) {
    logger.error('Acknowledge event error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
