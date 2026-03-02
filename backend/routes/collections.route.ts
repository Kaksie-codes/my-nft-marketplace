import { Router, Request, Response } from 'express';
import { Collection } from '../models/collection.model';
import { NFT } from '../models/nft.model';
import { Listing } from '../models/listing.model';
import { qs } from '../utils';
import {
  sendSuccess,
  sendPaginated,
  sendNotFound,
  sendServerError,
} from '../utils/response';

const router = Router();

// ── GET /api/collections ─────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const page         = Math.max(1, parseInt(qs(req.query.page)   ?? '1'));
  const limit        = Math.min(100, parseInt(qs(req.query.limit) ?? '20'));
  const creator      = qs(req.query.creator);
  const collaborator = qs(req.query.collaborator);
  const visibility   = qs(req.query.visibility);
  const skip         = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (creator)      filter.creator             = creator.toLowerCase();
  if (collaborator) filter.collaborators        = collaborator.toLowerCase();
  if (visibility === 'public') filter.publicMintEnabled = true;

  const sortBy = qs(req.query.sortBy);

  try {
    let withCounts: (Record<string, unknown> & { nftCount: number })[];
    let total: number;

    if (sortBy === 'nftCount') {
      // Use aggregation so we can sort by nftCount BEFORE pagination.
      // Fetching then sorting in-memory only sorts the current page, meaning
      // collections with the most NFTs could be buried on later pages.
      const matchStage = Object.keys(filter).length > 0 ? [{ $match: filter }] : [];

      const pipeline = [
        ...matchStage,
        {
          $lookup: {
            from:         'nfts',
            localField:   'address',
            foreignField: 'collection',
            as:           '_nftDocs',
          },
        },
        { $addFields: { nftCount: { $size: '$_nftDocs' } } },
        { $project:   { _nftDocs: 0 } },            // drop the joined docs
        { $sort:      { nftCount: -1, createdAt: -1 } as Record<string, 1 | -1> },
        {
          $facet: {
            data:  [{ $skip: skip }, { $limit: limit }],
            count: [{ $count: 'total' }],
          },
        },
      ];

      const [result] = await Collection.aggregate(pipeline);
      withCounts = result.data ?? [];
      total      = result.count?.[0]?.total ?? 0;
    } else {
      // Default: sort by createdAt, attach nftCounts via separate aggregation
      const [collections, count] = await Promise.all([
        Collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        Collection.countDocuments(filter),
      ]);
      total = count;

      if (collections.length === 0) {
        return void sendPaginated(res, [], total, page, limit);
      }

      const addresses  = collections.map(c => c.address);
      const counts     = await NFT.aggregate([
        { $match: { collection: { $in: addresses } } },
        { $group: { _id: '$collection', nftCount: { $sum: 1 } } },
      ]);
      const countMap   = new Map<string, number>();
      for (const { _id, nftCount } of counts) countMap.set(_id, nftCount);

      withCounts = collections.map(col => ({ ...col, nftCount: countMap.get(col.address) ?? 0 }));
    }

    sendPaginated(res, withCounts, total, page, limit);
  } catch (err) {
    sendServerError(res, err, 'GET /collections');
  }
});

// ── GET /api/collections/:address ────────────────────────────────────────────
router.get('/:address', async (req: Request<{ address: string }>, res: Response): Promise<void> => {
  const address = req.params.address.toLowerCase();

  try {
    const collection = await Collection.findOne({ address });
    if (!collection) return void sendNotFound(res, 'Collection not found');

    const nftCount = await NFT.countDocuments({ collection: address });
    sendSuccess(res, { ...collection.toObject(), nftCount });
  } catch (err) {
    sendServerError(res, err, `GET /collections/${address}`);
  }
});

// ── GET /api/collections/:address/nfts ───────────────────────────────────────
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
      NFT.find(filter).sort({ tokenId: 1 }).skip(skip).limit(limit).lean(),
      NFT.countDocuments(filter),
    ]);

    // ── Attach active listing to each NFT ─────────────────────────────────
    // Same bulk-join pattern as users.route.ts — one query for all listings
    // on this page rather than N individual queries.
    if (nfts.length > 0) {
      const conditions = nfts.map(n => ({ collection: n.collection, tokenId: n.tokenId }));
      const activeListings = await Listing.find({
        status: 'active',
        $or: conditions,
      }).lean();

      const listingMap = new Map<string, typeof activeListings[0]>();
      for (const listing of activeListings) {
        listingMap.set(`${listing.collection}:${listing.tokenId}`, listing);
      }

      const nftsWithListings = nfts.map(nft => ({
        ...nft,
        activeListing: listingMap.get(`${nft.collection}:${nft.tokenId}`) ?? null,
      }));

      return void sendPaginated(res, nftsWithListings, total, page, limit);
    }

    sendPaginated(res, nfts, total, page, limit);
  } catch (err) {
    sendServerError(res, err, `GET /collections/${address}/nfts`);
  }
});

export default router;





// import { Router, Request, Response } from 'express';
// import { Collection } from '../models/collection.model';
// import { NFT } from '../models/nft.model';
// import { qs } from '../utils';
// import {
//   sendSuccess,
//   sendPaginated,
//   sendNotFound,
//   sendServerError,
// } from '../utils/response';

// const router = Router();

// // ── GET /api/collections ─────────────────────────────────────────────────────
// // All collections, paginated. Filterable by creator wallet address.
// router.get('/', async (req: Request, res: Response): Promise<void> => {
//   const page    = Math.max(1, parseInt(qs(req.query.page)   ?? '1'));
//   const limit   = Math.min(100, parseInt(qs(req.query.limit) ?? '20'));
//   const creator = qs(req.query.creator);
//   const skip    = (page - 1) * limit;

//   const filter: Record<string, unknown> = {};
//   if (creator) filter.creator = creator.toLowerCase();

//   try {
//     const [collections, total] = await Promise.all([
//       Collection.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
//       Collection.countDocuments(filter),
//     ]);
//     sendPaginated(res, collections, total, page, limit);
//   } catch (err) {
//     sendServerError(res, err, 'GET /collections');
//   }
// });

// // ── GET /api/collections/:address ───────────────────────────────────────────
// // Single collection by contract address.
// // Also returns total NFT count so the frontend doesn't need a second request.
// router.get('/:address', async (req: Request<{ address: string }>, res: Response): Promise<void> => {
//   const address = req.params.address.toLowerCase();

//   try {
//     const collection = await Collection.findOne({ address });
//     if (!collection) return void sendNotFound(res, 'Collection not found');

//     // Attach NFT count — useful for displaying "X items" on the collection page
//     const nftCount = await NFT.countDocuments({ collection: address });

//     sendSuccess(res, { ...collection.toObject(), nftCount });
//   } catch (err) {
//     sendServerError(res, err, `GET /collections/${address}`);
//   }
// });

// // ── GET /api/collections/:address/nfts ──────────────────────────────────────
// // All NFTs in a collection, paginated. Filterable by category.
// // Sorted by tokenId ascending so the collection displays in mint order.
// router.get('/:address/nfts', async (req: Request<{ address: string }>, res: Response): Promise<void> => {
//   const address  = req.params.address.toLowerCase();
//   const page     = Math.max(1, parseInt(qs(req.query.page)   ?? '1'));
//   const limit    = Math.min(100, parseInt(qs(req.query.limit) ?? '20'));
//   const category = qs(req.query.category);
//   const skip     = (page - 1) * limit;

//   const filter: Record<string, unknown> = { collection: address };
//   if (category) filter.category = category;

//   try {
//     const [nfts, total] = await Promise.all([
//       NFT.find(filter).sort({ tokenId: 1 }).skip(skip).limit(limit),
//       NFT.countDocuments(filter),
//     ]);
//     sendPaginated(res, nfts, total, page, limit);
//   } catch (err) {
//     sendServerError(res, err, `GET /collections/${address}/nfts`);
//   }
// });

// export default router;