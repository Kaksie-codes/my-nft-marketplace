import { Router, Request, Response, NextFunction } from 'express';
import { NFT }        from '../models/nft.model';
import { Collection } from '../models/collection.model';
import { Listing }    from '../models/listing.model';
import { User }       from '../models/user.model';
import { Activity }   from '../models/activity.model';
import { qs }         from '../utils';
import {
  sendSuccess,
  sendPaginated,
  sendServerError,
} from '../utils/response';

const router = Router();

// ── Middleware: verify caller is the marketplace owner ────────────────────────
// Reads MARKETPLACE_OWNER_ADDRESS from .env and compares it to the
// x-caller-address header sent by the frontend (the connected wallet address).
function requireOwner(req: Request, res: Response, next: NextFunction): void {
  const caller = (req.headers['x-caller-address'] as string | undefined)?.toLowerCase().trim();
  const owner  = (process.env.MARKETPLACE_OWNER_ADDRESS || '').toLowerCase().trim();

  // Surface a helpful error in dev if the env var isn't set at all
  if (!owner) {
    res.status(500).json({ success: false, error: 'MARKETPLACE_OWNER_ADDRESS is not set in .env' });
    return;
  }

  if (!caller || caller !== owner) {
    res.status(403).json({ success: false, error: 'Forbidden — admin only' });
    return;
  }

  next();
}

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get('/stats', requireOwner, async (_req: Request, res: Response): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalNFTs,
      totalCollections,
      totalUsers,
      totalActiveListings,
      totalSales,
      allSoldListings,
      fixedCount,
      auctionCount,
    ] = await Promise.all([
      NFT.countDocuments({}),
      Collection.countDocuments({}),
      User.countDocuments({}),
      Listing.countDocuments({ status: 'active' }),
      Activity.countDocuments({ type: 'sale' }),
      // Only fetch the price field — no need to load full docs
      Listing.find({ status: 'sold' }, { price: 1, _id: 0 }).lean(),
      Listing.countDocuments({ status: 'active', type: 'fixed' }),
      Listing.countDocuments({ status: 'active', type: 'auction' }),
    ]);

    // ── Volume & fees ─────────────────────────────────────────────────────────
    // Keep as BigInt throughout to avoid floating-point loss on large wei values.
    // Only convert to Number at the very end for JSON serialisation.
    let totalVolumeWei = BigInt(0);
    for (const l of allSoldListings) {
      try { totalVolumeWei += BigInt(l.price); } catch { /* skip malformed */ }
    }
    const feeBps       = parseInt(process.env.MARKETPLACE_FEE_BPS || '250', 10);
    const totalFeesWei = (totalVolumeWei * BigInt(feeBps)) / BigInt(10_000);

    // ── Sales over time ───────────────────────────────────────────────────────
    // Activity.timestamp may be stored as a Date OR an ISO string depending on
    // which version of the indexer wrote it. Using $toDate handles both cases.
    const salesOverTime = await Activity.aggregate([
      {
        $match: {
          type: 'sale',
          // Cast to date for comparison so both Date objects and ISO strings work
          $expr: { $gte: [{ $toDate: '$timestamp' }, thirtyDaysAgo] },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date:   { $toDate: '$timestamp' },
            },
          },
          count: { $sum: 1 },
          // price is stored as a wei string — convert to double for summing
          volume: {
            $sum: {
              $convert: {
                input:   { $ifNull: ['$price', '0'] },
                to:      'double',
                onError: 0,
                onNull:  0,
              },
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // ── Mints over time ───────────────────────────────────────────────────────
    // NFT.mintedAt is also stored as a string in this codebase
    const mintsOverTime = await NFT.aggregate([
      {
        $match: {
          $expr: { $gte: [{ $toDate: '$mintedAt' }, thirtyDaysAgo] },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date:   { $toDate: '$mintedAt' },
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    sendSuccess(res, {
      totalNFTs,
      totalCollections,
      totalUsers,
      totalActiveListings,
      totalSales,
      totalVolumeEth:  (Number(totalVolumeWei) / 1e18).toFixed(4),
      totalFeesEth:    (Number(totalFeesWei)   / 1e18).toFixed(4),
      fixedListings:   fixedCount,
      auctionListings: auctionCount,
      salesOverTime,
      mintsOverTime,
    });
  } catch (err) {
    sendServerError(res, err, 'GET /admin/stats');
  }
});

// ── GET /api/admin/listings ───────────────────────────────────────────────────
router.get('/listings', requireOwner, async (req: Request, res: Response): Promise<void> => {
  const page   = Math.max(1,   parseInt(qs(req.query.page)   ?? '1',  10));
  const limit  = Math.min(100, parseInt(qs(req.query.limit)  ?? '20', 10));
  const status = qs(req.query.status);
  const skip   = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;

  try {
    const [listings, total] = await Promise.all([
      Listing.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Listing.countDocuments(filter),
    ]);
    sendPaginated(res, listings, total, page, limit);
  } catch (err) {
    sendServerError(res, err, 'GET /admin/listings');
  }
});

// ── GET /api/admin/refunds ────────────────────────────────────────────────────
// Returns active auctions that have at least one bid — the highestBidder has
// ETH locked in the contract and can call withdrawRefund() on-chain.
router.get('/refunds', requireOwner, async (req: Request, res: Response): Promise<void> => {
  const page  = Math.max(1,   parseInt(qs(req.query.page)  ?? '1',  10));
  const limit = Math.min(100, parseInt(qs(req.query.limit) ?? '20', 10));
  const skip  = (page - 1) * limit;

  const filter = {
    status:        'active',
    type:          'auction',
    highestBidder: { $exists: true, $ne: null },
  };

  try {
    const [auctions, total] = await Promise.all([
      Listing.find(filter, {
        listingId: 1, highestBidder: 1, highestBid: 1, collection: 1, tokenId: 1,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Listing.countDocuments(filter),
    ]);

    sendPaginated(res, auctions, total, page, limit);
  } catch (err) {
    sendServerError(res, err, 'GET /admin/refunds');
  }
});

export default router;