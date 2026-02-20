import { Router, Request, Response } from 'express';
import { Listing } from '../models/listing.model';
import { Bid } from '../models/bid.model';
import { qs } from '../utils';

const router = Router();

// GET /api/listings — all active listings, paginated
router.get('/', async (req: Request, res: Response) => {
  const page = parseInt(qs(req.query.page) ?? '1');
  const limit = parseInt(qs(req.query.limit) ?? '20');
  const status = qs(req.query.status) ?? 'active';
  const seller = qs(req.query.seller);
  const collection = qs(req.query.collection);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { status };
  if (seller) filter.seller = seller.toLowerCase();
  if (collection) filter.collection = collection.toLowerCase();

  try {
    const [listings, total] = await Promise.all([
      Listing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Listing.countDocuments(filter),
    ]);
    res.json({ listings, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/listings/auctions — active auctions only
router.get('/auctions', async (req: Request, res: Response) => {
  const page = parseInt(qs(req.query.page) ?? '1');
  const limit = parseInt(qs(req.query.limit) ?? '20');
  const skip = (page - 1) * limit;

  try {
    const [listings, total] = await Promise.all([
      Listing.find({ type: 'auction', status: 'active' }).sort({ endTime: 1 }).skip(skip).limit(limit),
      Listing.countDocuments({ type: 'auction', status: 'active' }),
    ]);
    res.json({ listings, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/listings/fixed — fixed price only
router.get('/fixed', async (req: Request, res: Response) => {
  const page = parseInt(qs(req.query.page) ?? '1');
  const limit = parseInt(qs(req.query.limit) ?? '20');
  const skip = (page - 1) * limit;

  try {
    const [listings, total] = await Promise.all([
      Listing.find({ type: 'fixed', status: 'active' }).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Listing.countDocuments({ type: 'fixed', status: 'active' }),
    ]);
    res.json({ listings, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/listings/:id — single listing with full bid history
router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  const listingId = parseInt(req.params.id);
  if (isNaN(listingId)) return res.status(400).json({ error: 'Invalid listing ID' });

  try {
    const listing = await Listing.findOne({ listingId });
    if (!listing) return res.status(404).json({ error: 'Listing not found' });

    const bids = await Bid.find({ listingId }).sort({ timestamp: -1 });
    res.json({ ...listing.toObject(), bids });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;