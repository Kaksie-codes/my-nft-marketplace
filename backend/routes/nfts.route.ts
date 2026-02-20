import { Router, Request, Response } from 'express';
import { NFT } from '../models/nft.model';
import { Listing } from '../models/listing.model';
import { qs } from '../utils';
import {
  sendSuccess,
  sendPaginated,
  sendBadRequest,
  sendNotFound,
  sendServerError,
} from '../utils/response';

const router = Router();

// ── GET /api/nfts/category/:category ────────────────────────────────────────
// Fetch all NFTs in a given category. Paginated.
router.get('/category/:category', async (req: Request<{ category: string }>, res: Response): Promise<void> => {
  const { category } = req.params;
  const page  = Math.max(1, parseInt(qs(req.query.page)   ?? '1'));
  const limit = Math.min(100, parseInt(qs(req.query.limit) ?? '20'));
  const skip  = (page - 1) * limit;

  try {
    const [nfts, total] = await Promise.all([
      NFT.find({ category }).sort({ mintedAt: -1 }).skip(skip).limit(limit),
      NFT.countDocuments({ category }),
    ]);
    sendPaginated(res, nfts, total, page, limit);
  } catch (err) {
    sendServerError(res, err, `GET /nfts/category/${category}`);
  }
});

// ── GET /api/nfts/:collection/:tokenId ──────────────────────────────────────
// Fetch a single NFT by collection address and token ID.
// Also returns the active listing for this NFT if one exists.
router.get('/:collection/:tokenId', async (
  req: Request<{ collection: string; tokenId: string }>,
  res: Response
): Promise<void> => {
  const collection = req.params.collection.toLowerCase();
  // FIX: tokenId kept as String — model stores it as String (uint256 safe).
  // parseInt was used before which would never match the String stored in DB.
  const tokenId = req.params.tokenId.trim();

  if (!tokenId) return void sendBadRequest(res, 'Invalid token ID');

  try {
    const nft = await NFT.findOne({ collection, tokenId });
    if (!nft) return void sendNotFound(res, 'NFT not found');

    // Attach the active listing so the frontend doesn't need a second request
    const activeListing = await Listing.findOne({ collection, tokenId, status: 'active' });

    sendSuccess(res, { ...nft.toObject(), activeListing: activeListing ?? null });
  } catch (err) {
    sendServerError(res, err, `GET /nfts/${collection}/${tokenId}`);
  }
});

export default router;