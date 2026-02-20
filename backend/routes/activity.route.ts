import { Router, Request, Response } from 'express';
import { Activity } from '../models/activity.model';
import { qs } from '../utils';
import { sendPaginated, sendServerError } from '../utils/response';

const router = Router();

// ── GET /api/activity ────────────────────────────────────────────────────────
// Global activity feed across the entire marketplace. Paginated.
// Filterable by activity type (mint, sale, bid, etc.) and collection address.
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const page       = Math.max(1, parseInt(qs(req.query.page)   ?? '1'));
  const limit      = Math.min(100, parseInt(qs(req.query.limit) ?? '30'));
  const type       = qs(req.query.type);
  const collection = qs(req.query.collection);
  const skip       = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (type)       filter.type       = type;
  if (collection) filter.collection = collection.toLowerCase();

  try {
    const [activities, total] = await Promise.all([
      Activity.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
      Activity.countDocuments(filter),
    ]);
    sendPaginated(res, activities, total, page, limit);
  } catch (err) {
    sendServerError(res, err, 'GET /activity');
  }
});

export default router;