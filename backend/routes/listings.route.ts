import { Router, Request, Response } from 'express';
import { Listing } from '../models/listing.model';
import { Bid } from '../models/bid.model';
import { qs } from '../utils';
import {
  sendSuccess,
  sendPaginated,
  sendBadRequest,
  sendNotFound,
  sendServerError,
} from '../utils/response';

const router = Router();

// ── GET /api/listings ────────────────────────────────────────────────────────
// All listings, paginated. Filterable by status, seller, and collection.
// Defaults to status=active if not specified.
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const page       = Math.max(1, parseInt(qs(req.query.page)   ?? '1'));
  const limit      = Math.min(100, parseInt(qs(req.query.limit) ?? '20'));
  const status     = qs(req.query.status)     ?? 'active';
  const seller     = qs(req.query.seller);
  const collection = qs(req.query.collection);
  const skip       = (page - 1) * limit;

  const filter: Record<string, unknown> = { status };
  if (seller)     filter.seller     = seller.toLowerCase();
  if (collection) filter.collection = collection.toLowerCase();

  try {
    const [listings, total] = await Promise.all([
      Listing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Listing.countDocuments(filter),
    ]);
    sendPaginated(res, listings, total, page, limit);
  } catch (err) {
    sendServerError(res, err, 'GET /listings');
  }
});

// ── GET /api/listings/auctions ───────────────────────────────────────────────
// Active auctions only, sorted by end time ascending so soonest-ending
// auctions appear first — most useful for the frontend auction view.
// NOTE: This route must be defined BEFORE /:id to avoid Express matching
// the string "auctions" as a listing ID.
router.get('/auctions', async (req: Request, res: Response): Promise<void> => {
  const page  = Math.max(1, parseInt(qs(req.query.page)   ?? '1'));
  const limit = Math.min(100, parseInt(qs(req.query.limit) ?? '20'));
  const skip  = (page - 1) * limit;

  const filter = { type: 'auction', status: 'active' };

  try {
    const [listings, total] = await Promise.all([
      Listing.find(filter).sort({ endTime: 1 }).skip(skip).limit(limit),
      Listing.countDocuments(filter),
    ]);
    sendPaginated(res, listings, total, page, limit);
  } catch (err) {
    sendServerError(res, err, 'GET /listings/auctions');
  }
});

// ── GET /api/listings/fixed ──────────────────────────────────────────────────
// Active fixed-price listings only.
// NOTE: Must also be defined BEFORE /:id for the same reason as /auctions.
router.get('/fixed', async (req: Request, res: Response): Promise<void> => {
  const page  = Math.max(1, parseInt(qs(req.query.page)   ?? '1'));
  const limit = Math.min(100, parseInt(qs(req.query.limit) ?? '20'));
  const skip  = (page - 1) * limit;

  const filter = { type: 'fixed', status: 'active' };

  try {
    const [listings, total] = await Promise.all([
      Listing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Listing.countDocuments(filter),
    ]);
    sendPaginated(res, listings, total, page, limit);
  } catch (err) {
    sendServerError(res, err, 'GET /listings/fixed');
  }
});

// ── GET /api/listings/:id ────────────────────────────────────────────────────
// Single listing by listingId, with full bid history attached.
router.get('/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  // FIX: listingId kept as String — stored as String in DB (uint256 safe).
  // parseInt was used before which would never match anything in the DB.
  const listingId = req.params.id.trim();
  if (!listingId) return void sendBadRequest(res, 'Invalid listing ID');

  try {
    const listing = await Listing.findOne({ listingId });
    if (!listing) return void sendNotFound(res, 'Listing not found');

    // Fetch bid history in the same request so frontend doesn't need a second call
    const bids = await Bid.find({ listingId }).sort({ timestamp: -1 });

    sendSuccess(res, { ...listing.toObject(), bids });
  } catch (err) {
    sendServerError(res, err, `GET /listings/${listingId}`);
  }
});

export default router;