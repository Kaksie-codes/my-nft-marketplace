import { Router, Request, Response } from 'express';
import { User } from '../models/user.model';
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

// ── POST /api/users/connect ──────────────────────────────────────────────────
router.post('/connect', async (req: Request, res: Response): Promise<void> => {
  const { address } = req.body;
  if (!address) return void sendBadRequest(res, 'address required');

  try {
    const user = await User.findOneAndUpdate(
      { address: address.toLowerCase() },
      { $setOnInsert: { address: address.toLowerCase() } },
      { upsert: true, new: true }
    );
    sendSuccess(res, user);
  } catch (err) {
    sendServerError(res, err, 'POST /users/connect');
  }
});

// ── PUT /api/users/profile ───────────────────────────────────────────────────
router.put('/profile', async (req: Request, res: Response): Promise<void> => {
  const { address, username, avatar } = req.body;
  if (!address) return void sendBadRequest(res, 'address required');

  const update: Record<string, unknown> = {};
  if (username !== undefined) update.username = username;
  if (avatar   !== undefined) update.avatar   = avatar;

  if (Object.keys(update).length === 0)
    return void sendBadRequest(res, 'No fields to update');

  try {
    const user = await User.findOneAndUpdate(
      { address: address.toLowerCase() },
      update,
      { new: true }
    );
    if (!user) return void sendNotFound(res, 'User not found');
    sendSuccess(res, user);
  } catch (err) {
    sendServerError(res, err, 'PUT /users/profile');
  }
});

// ── GET /api/users/top-creators ──────────────────────────────────────────────
// IMPORTANT: Must be defined BEFORE /:address routes
router.get('/top-creators', async (req: Request, res: Response): Promise<void> => {
  const limit  = Math.min(50, parseInt(qs(req.query.limit) ?? '8'));
  const period = qs(req.query.period);

  const matchFilter: Record<string, unknown> = {};
  if (period === '24h') matchFilter.mintedAt = { $gte: new Date(Date.now() - 1  * 24 * 60 * 60 * 1000) };
  if (period === '7d')  matchFilter.mintedAt = { $gte: new Date(Date.now() - 7  * 24 * 60 * 60 * 1000) };
  if (period === '30d') matchFilter.mintedAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };

  try {
    const topMinters = await NFT.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$minter', nftCount: { $sum: 1 } } },
      { $sort:  { nftCount: -1 } },
      { $limit: limit },
    ]);

    const results = await Promise.all(
      topMinters.map(async ({ _id: address, nftCount }: { _id: string; nftCount: number }) => {
        const user = await User.findOne({ address });
        return { address, nftCount, username: user?.username ?? null, avatar: user?.avatar ?? null };
      })
    );

    sendSuccess(res, results);
  } catch (err) {
    sendServerError(res, err, 'GET /users/top-creators');
  }
});

// ── GET /api/users/:address ──────────────────────────────────────────────────
router.get('/:address', async (req: Request<{ address: string }>, res: Response): Promise<void> => {
  const address = req.params.address.toLowerCase();

  try {
    const user = await User.findOne({ address });
    if (!user) return void sendNotFound(res, 'User not found');
    sendSuccess(res, user);
  } catch (err) {
    sendServerError(res, err, `GET /users/${address}`);
  }
});

// ── GET /api/users/:address/nfts ─────────────────────────────────────────────
// Returns NFTs the user currently "possesses" — either directly in their wallet
// OR held in marketplace escrow because they have an active listing.
//
// ?filter=owned   → wallet-held + actively listed by address  (default, used by My NFTs page)
// ?filter=created → all NFTs where minter === address         (used by profile Created tab)
// ?filter=all     → owned + created union                     (used by profile All tab)
// ?category=art   → restrict to one category
router.get('/:address/nfts', async (req: Request<{ address: string }>, res: Response): Promise<void> => {
  const address  = req.params.address.toLowerCase();
  const page     = Math.max(1, parseInt(qs(req.query.page)   ?? '1'));
  const limit    = Math.min(100, parseInt(qs(req.query.limit) ?? '20'));
  const skip     = (page - 1) * limit;
  const filter   = qs(req.query.filter)   ?? 'owned';
  const category = qs(req.query.category);
  const marketplaceAddr = (process.env.MARKETPLACE_CONTRACT_ADDRESS || '').toLowerCase();

  let mongoFilter: Record<string, unknown>;

  if (filter === 'created') {
    // Profile "Created" tab — all NFTs ever minted by this address
    mongoFilter = { minter: address };
  } else if (filter === 'all') {
    // Profile "All" tab — union of owned + created
    mongoFilter = { $or: [{ owner: address }, { minter: address }] };
  } else {
    // "My NFTs" page — wallet-held OR actively listed by this address.
    // When an NFT is listed, the marketplace contract takes custody so
    // owner becomes the marketplace address. We need to include those too.
    if (marketplaceAddr) {
      // Find token IDs of NFTs actively listed by this seller
      const activeListings = await Listing.find(
        { seller: address, status: 'active' },
        { collection: 1, tokenId: 1 }
      ).lean();

      if (activeListings.length > 0) {
        // Build an $or: directly owned OR matches one of the active listings
        const listedConditions = activeListings.map(l => ({
          collection: l.collection,
          tokenId:    l.tokenId,
          owner:      marketplaceAddr,
        }));
        mongoFilter = { $or: [{ owner: address }, ...listedConditions] };
      } else {
        mongoFilter = { owner: address };
      }
    } else {
      // Fallback if marketplace address not configured
      mongoFilter = { owner: address };
    }
  }

  // Wrap in $and if category is set AND the base filter already uses $or,
  // so category applies across the whole query rather than just the last branch.
  let finalFilter: Record<string, unknown>;
  if (category && '$or' in mongoFilter) {
    finalFilter = { $and: [mongoFilter, { category }] };
  } else if (category) {
    finalFilter = { ...mongoFilter, category };
  } else {
    finalFilter = mongoFilter;
  }

  try {
    const [nfts, total] = await Promise.all([
      NFT.find(finalFilter).sort({ mintedAt: -1 }).skip(skip).limit(limit),
      NFT.countDocuments(finalFilter),
    ]);
    sendPaginated(res, nfts, total, page, limit);
  } catch (err) {
    sendServerError(res, err, `GET /users/${address}/nfts`);
  }
});

// ── GET /api/users/:address/activity ────────────────────────────────────────
router.get('/:address/activity', async (req: Request<{ address: string }>, res: Response): Promise<void> => {
  const address = req.params.address.toLowerCase();
  const page    = Math.max(1, parseInt(qs(req.query.page)   ?? '1'));
  const limit   = Math.min(100, parseInt(qs(req.query.limit) ?? '20'));
  const skip    = (page - 1) * limit;

  const activityFilter = { $or: [{ from: address }, { to: address }] };

  try {
    const [activity, total] = await Promise.all([
      Activity.find(activityFilter).sort({ timestamp: -1 }).skip(skip).limit(limit),
      Activity.countDocuments(activityFilter),
    ]);
    sendPaginated(res, activity, total, page, limit);
  } catch (err) {
    sendServerError(res, err, `GET /users/${address}/activity`);
  }
});

export default router;





// import { Router, Request, Response } from 'express';
// import { User } from '../models/user.model';
// import { NFT } from '../models/nft.model';
// import { Activity } from '../models/activity.model';
// import { qs } from '../utils';
// import {
//   sendSuccess,
//   sendPaginated,
//   sendBadRequest,
//   sendNotFound,
//   sendServerError,
// } from '../utils/response';

// const router = Router();

// // ── POST /api/users/connect ──────────────────────────────────────────────────
// router.post('/connect', async (req: Request, res: Response): Promise<void> => {
//   const { address } = req.body;
//   if (!address) return void sendBadRequest(res, 'address required');

//   try {
//     const user = await User.findOneAndUpdate(
//       { address: address.toLowerCase() },
//       { $setOnInsert: { address: address.toLowerCase() } },
//       { upsert: true, new: true }
//     );
//     sendSuccess(res, user);
//   } catch (err) {
//     sendServerError(res, err, 'POST /users/connect');
//   }
// });

// // ── PUT /api/users/profile ───────────────────────────────────────────────────
// router.put('/profile', async (req: Request, res: Response): Promise<void> => {
//   const { address, username, avatar } = req.body;
//   if (!address) return void sendBadRequest(res, 'address required');

//   const update: Record<string, unknown> = {};
//   if (username !== undefined) update.username = username;
//   if (avatar   !== undefined) update.avatar   = avatar;

//   if (Object.keys(update).length === 0)
//     return void sendBadRequest(res, 'No fields to update');

//   try {
//     const user = await User.findOneAndUpdate(
//       { address: address.toLowerCase() },
//       update,
//       { new: true }
//     );
//     if (!user) return void sendNotFound(res, 'User not found');
//     sendSuccess(res, user);
//   } catch (err) {
//     sendServerError(res, err, 'PUT /users/profile');
//   }
// });

// // ── GET /api/users/top-creators ──────────────────────────────────────────────
// // IMPORTANT: Must be defined BEFORE /:address routes
// router.get('/top-creators', async (req: Request, res: Response): Promise<void> => {
//   const limit  = Math.min(50, parseInt(qs(req.query.limit) ?? '8'));
//   const period = qs(req.query.period);

//   const matchFilter: Record<string, unknown> = {};
//   if (period === '24h') matchFilter.mintedAt = { $gte: new Date(Date.now() - 1  * 24 * 60 * 60 * 1000) };
//   if (period === '7d')  matchFilter.mintedAt = { $gte: new Date(Date.now() - 7  * 24 * 60 * 60 * 1000) };
//   if (period === '30d') matchFilter.mintedAt = { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };

//   try {
//     const topMinters = await NFT.aggregate([
//       { $match: matchFilter },
//       { $group: { _id: '$minter', nftCount: { $sum: 1 } } },
//       { $sort:  { nftCount: -1 } },
//       { $limit: limit },
//     ]);

//     const results = await Promise.all(
//       topMinters.map(async ({ _id: address, nftCount }: { _id: string; nftCount: number }) => {
//         const user = await User.findOne({ address });
//         return { address, nftCount, username: user?.username ?? null, avatar: user?.avatar ?? null };
//       })
//     );

//     sendSuccess(res, results);
//   } catch (err) {
//     sendServerError(res, err, 'GET /users/top-creators');
//   }
// });

// // ── GET /api/users/:address ──────────────────────────────────────────────────
// router.get('/:address', async (req: Request<{ address: string }>, res: Response): Promise<void> => {
//   const address = req.params.address.toLowerCase();

//   try {
//     const user = await User.findOne({ address });
//     if (!user) return void sendNotFound(res, 'User not found');
//     sendSuccess(res, user);
//   } catch (err) {
//     sendServerError(res, err, `GET /users/${address}`);
//   }
// });

// // ── GET /api/users/:address/nfts ─────────────────────────────────────────────
// // ?filter=owned  → NFTs where owner === address             (default)
// // ?filter=created → NFTs where minter === address           (survives sales)
// // ?filter=all    → NFTs where owner === OR minter === address
// router.get('/:address/nfts', async (req: Request<{ address: string }>, res: Response): Promise<void> => {
//   const address = req.params.address.toLowerCase();
//   const page    = Math.max(1, parseInt(qs(req.query.page)   ?? '1'));
//   const limit   = Math.min(100, parseInt(qs(req.query.limit) ?? '20'));
//   const skip    = (page - 1) * limit;
//   const filter  = qs(req.query.filter) ?? 'owned';

//   let mongoFilter: Record<string, unknown>;
//   if (filter === 'created') {
//     mongoFilter = { minter: address };
//   } else if (filter === 'all') {
//     mongoFilter = { $or: [{ owner: address }, { minter: address }] };
//   } else {
//     // Default: 'owned'
//     mongoFilter = { owner: address };
//   }

//   try {
//     const [nfts, total] = await Promise.all([
//       NFT.find(mongoFilter).sort({ mintedAt: -1 }).skip(skip).limit(limit),
//       NFT.countDocuments(mongoFilter),
//     ]);
//     sendPaginated(res, nfts, total, page, limit);
//   } catch (err) {
//     sendServerError(res, err, `GET /users/${address}/nfts`);
//   }
// });

// // ── GET /api/users/:address/activity ────────────────────────────────────────
// router.get('/:address/activity', async (req: Request<{ address: string }>, res: Response): Promise<void> => {
//   const address = req.params.address.toLowerCase();
//   const page    = Math.max(1, parseInt(qs(req.query.page)   ?? '1'));
//   const limit   = Math.min(100, parseInt(qs(req.query.limit) ?? '20'));
//   const skip    = (page - 1) * limit;

//   const activityFilter = { $or: [{ from: address }, { to: address }] };

//   try {
//     const [activity, total] = await Promise.all([
//       Activity.find(activityFilter).sort({ timestamp: -1 }).skip(skip).limit(limit),
//       Activity.countDocuments(activityFilter),
//     ]);
//     sendPaginated(res, activity, total, page, limit);
//   } catch (err) {
//     sendServerError(res, err, `GET /users/${address}/activity`);
//   }
// });

// export default router;