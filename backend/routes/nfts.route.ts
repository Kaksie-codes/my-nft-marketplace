import { Router, Request, Response } from 'express';
import { NFT } from '../models/nft.model';
import { Listing } from '../models/listing.model';
import { Activity } from '../models/activity.model';
import { qs } from '../utils';
import {
  sendSuccess,
  sendPaginated,
  sendBadRequest,
  sendNotFound,
  sendServerError,
} from '../utils/response';

const router = Router();

// ── Shared helper — attach activeListing to a page of NFTs ───────────────────
// One bulk Listing query replaces N individual queries.
async function attachListings<T extends { collection: string; tokenId: string }>(
  nfts: T[]
): Promise<(T & { activeListing: unknown })[]> {
  if (nfts.length === 0) return nfts.map(n => ({ ...n, activeListing: null }));

  const conditions = nfts.map(n => ({ collection: n.collection, tokenId: n.tokenId }));
  const activeListings = await Listing.find({ status: 'active', $or: conditions }).lean();

  const listingMap = new Map<string, typeof activeListings[0]>();
  for (const listing of activeListings) {
    listingMap.set(`${listing.collection}:${listing.tokenId}`, listing);
  }

  return nfts.map(nft => ({
    ...nft,
    activeListing: listingMap.get(`${nft.collection}:${nft.tokenId}`) ?? null,
  }));
}

// ── GET /api/nfts/stats ───────────────────────────────────────────────────────
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [totalNFTs, totalSales, totalArtists] = await Promise.all([
      NFT.countDocuments({}),
      Activity.countDocuments({ type: 'sale' }),
      NFT.distinct('minter').then(r => r.length),
    ]);
    sendSuccess(res, { totalNFTs, totalSales, totalArtists });
  } catch (err) {
    sendServerError(res, err, 'GET /nfts/stats');
  }
});

// ── GET /api/nfts/category/:category ─────────────────────────────────────────
router.get('/category/:category', async (req: Request<{ category: string }>, res: Response): Promise<void> => {
  const { category } = req.params;
  const page  = Math.max(1, parseInt(qs(req.query.page)   ?? '1'));
  const limit = Math.min(100, parseInt(qs(req.query.limit) ?? '20'));
  const skip  = (page - 1) * limit;

  const KNOWN_CATEGORIES = ['art', 'collectibles', 'music', 'photography', 'video', 'utility', 'sports', 'virtual_worlds'];

  const filter = category === 'other'
    ? { category: { $nin: KNOWN_CATEGORIES } }
    : { category };

  try {
    const [nfts, total] = await Promise.all([
      NFT.find(filter).sort({ mintedAt: -1 }).skip(skip).limit(limit).lean(),
      NFT.countDocuments(filter),
    ]);
    const nftsWithListings = await attachListings(nfts);
    sendPaginated(res, nftsWithListings, total, page, limit);
  } catch (err) {
    sendServerError(res, err, `GET /nfts/category/${category}`);
  }
});

// ── GET /api/nfts ─────────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const page  = Math.max(1, parseInt(qs(req.query.page)  ?? '1'));
  const limit = Math.min(100, parseInt(qs(req.query.limit) ?? '20'));
  const skip  = (page - 1) * limit;

  try {
    const [nfts, total] = await Promise.all([
      NFT.find({}).sort({ mintedAt: -1 }).skip(skip).limit(limit).lean(),
      NFT.countDocuments({}),
    ]);
    const nftsWithListings = await attachListings(nfts);
    sendPaginated(res, nftsWithListings, total, page, limit);
  } catch (err) {
    sendServerError(res, err, 'GET /nfts');
  }
});

// ── GET /api/nfts/:collection/:tokenId ───────────────────────────────────────
router.get('/:collection/:tokenId', async (
  req: Request<{ collection: string; tokenId: string }>,
  res: Response
): Promise<void> => {
  const collection = req.params.collection.toLowerCase();
  const tokenId    = req.params.tokenId.trim();

  if (!tokenId) return void sendBadRequest(res, 'Invalid token ID');

  try {
    const nft = await NFT.findOne({ collection, tokenId });
    if (!nft) return void sendNotFound(res, 'NFT not found');

    const activeListing = await Listing.findOne({ collection, tokenId, status: 'active' });
    sendSuccess(res, { ...nft.toObject(), activeListing: activeListing ?? null });
  } catch (err) {
    sendServerError(res, err, `GET /nfts/${collection}/${tokenId}`);
  }
});

export default router;