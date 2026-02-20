import { Router, Request, Response } from 'express';
import { Activity } from '../models/activity.model';

const router = Router();

// GET /api/activity — global activity feed
router.get('/', async (req: Request, res: Response) => {
  const { page = '1', limit = '30', type, collection } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const filter: any = {};
  if (type) filter.type = type;
  if (collection) filter.collection = (collection as string).toLowerCase();

  try {
    const [activities, total] = await Promise.all([
      Activity.find(filter).sort({ timestamp: -1 }).skip(skip).limit(parseInt(limit as string)),
      Activity.countDocuments(filter),
    ]);
    res.json({ activities, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;