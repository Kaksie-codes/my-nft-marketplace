import { Router, Request, Response } from 'express';
import { Collection } from '../models/collection.model';
import { NFT } from '../models/nft.model';
import { qs } from '../utils';

const router = Router();

// GET /api/collections — all collections, paginated
router.get('/', async (req: Request, res: Response) => {
  const page = parseInt(qs(req.query.page) ?? '1');
  const limit = parseInt(qs(req.query.limit) ?? '20');
  const creator = qs(req.query.creator);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (creator) filter.creator = creator.toLowerCase();

  try {
    const [collections, total] = await Promise.all([
      Collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Collection.countDocuments(filter),
    ]);
    res.json({ collections, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/collections/:address — single collection
router.get('/:address', async (req: Request<{ address: string }>, res: Response) => {
  const address = req.params.address.toLowerCase();

  try {
    const collection = await Collection.findOne({ address });
    if (!collection) return res.status(404).json({ error: 'Collection not found' });

    const nftCount = await NFT.countDocuments({ collection: address });
    res.json({ ...collection.toObject(), nftCount });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/collections/:address/nfts — NFTs in collection
router.get('/:address/nfts', async (req: Request<{ address: string }>, res: Response) => {
  const page = parseInt(qs(req.query.page) ?? '1');
  const limit = parseInt(qs(req.query.limit) ?? '20');
  const category = qs(req.query.category);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { collection: req.params.address.toLowerCase() };
  if (category) filter.category = category;

  try {
    const [nfts, total] = await Promise.all([
      NFT.find(filter).sort({ tokenId: 1 }).skip(skip).limit(limit),
      NFT.countDocuments(filter),
    ]);
    res.json({ nfts, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;