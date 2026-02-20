import { Router, Request, Response } from 'express';
import { NFT } from '../models/nft.model';
import { Listing } from '../models/listing.model';
import { qs } from '../utils';

const router = Router();

// GET /api/nfts/category/:category — NFTs by category
router.get('/category/:category', async (req: Request<{ category: string }>, res: Response) => {
  const page = parseInt(qs(req.query.page) ?? '1');
  const limit = parseInt(qs(req.query.limit) ?? '20');
  const skip = (page - 1) * limit;

  try {
    const [nfts, total] = await Promise.all([
      NFT.find({ category: req.params.category }).sort({ mintedAt: -1 }).skip(skip).limit(limit),
      NFT.countDocuments({ category: req.params.category }),
    ]);
    res.json({ nfts, total, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/nfts/:collection/:tokenId — single NFT with active listing if any
router.get('/:collection/:tokenId', async (req: Request<{ collection: string; tokenId: string }>, res: Response) => {
  const collection = req.params.collection.toLowerCase();
  const tokenId = parseInt(req.params.tokenId);

  if (isNaN(tokenId)) return res.status(400).json({ error: 'Invalid token ID' });

  try {
    const nft = await NFT.findOne({ collection, tokenId });
    if (!nft) return res.status(404).json({ error: 'NFT not found' });

    const activeListing = await Listing.findOne({ collection, tokenId, status: 'active' });

    res.json({ ...nft.toObject(), activeListing: activeListing || null });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;