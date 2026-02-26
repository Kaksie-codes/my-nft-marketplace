import { Router, Request, Response } from 'express';
import { Collection } from '../models/collection.model';
import { NFT } from '../models/nft.model';
import { qs } from '../utils';
import {
  sendSuccess,
  sendPaginated,
  sendNotFound,
  sendServerError,
} from '../utils/response';

const router = Router();

// ── GET /api/collections ─────────────────────────────────────────────────────
// All collections, paginated. Filterable by creator wallet address.
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const page    = Math.max(1, parseInt(qs(req.query.page)   ?? '1'));
  const limit   = Math.min(100, parseInt(qs(req.query.limit) ?? '20'));
  const creator = qs(req.query.creator);
  const skip    = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (creator) filter.creator = creator.toLowerCase();

  try {
    const [collections, total] = await Promise.all([
      Collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Collection.countDocuments(filter),
    ]);
    sendPaginated(res, collections, total, page, limit);
  } catch (err) {
    sendServerError(res, err, 'GET /collections');
  }
});

// ── GET /api/collections/:address ───────────────────────────────────────────
// Single collection by contract address.
// Also returns total NFT count so the frontend doesn't need a second request.
router.get('/:address', async (req: Request<{ address: string }>, res: Response): Promise<void> => {
  const address = req.params.address.toLowerCase();

  try {
    const collection = await Collection.findOne({ address });
    if (!collection) return void sendNotFound(res, 'Collection not found');

    // Attach NFT count — useful for displaying "X items" on the collection page
    const nftCount = await NFT.countDocuments({ collection: address });

    sendSuccess(res, { ...collection.toObject(), nftCount });
  } catch (err) {
    sendServerError(res, err, `GET /collections/${address}`);
  }
});

// ── GET /api/collections/:address/nfts ──────────────────────────────────────
// All NFTs in a collection, paginated. Filterable by category.
// Sorted by tokenId ascending so the collection displays in mint order.
router.get('/:address/nfts', async (req: Request<{ address: string }>, res: Response): Promise<void> => {
  const address  = req.params.address.toLowerCase();
  const page     = Math.max(1, parseInt(qs(req.query.page)   ?? '1'));
  const limit    = Math.min(100, parseInt(qs(req.query.limit) ?? '20'));
  const category = qs(req.query.category);
  const skip     = (page - 1) * limit;

  const filter: Record<string, unknown> = { collection: address };
  if (category) filter.category = category;

  try {
    const [nfts, total] = await Promise.all([
      NFT.find(filter).sort({ tokenId: 1 }).skip(skip).limit(limit),
      NFT.countDocuments(filter),
    ]);
    sendPaginated(res, nfts, total, page, limit);
  } catch (err) {
    sendServerError(res, err, `GET /collections/${address}/nfts`);
  }
});

export default router;