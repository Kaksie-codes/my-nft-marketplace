import { Router, Request, Response } from 'express';
import { User } from '../models/user.model';
import { NFT } from '../models/nft.model';
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
// IMPORTANT: Must be defined BEFORE /:address to avoid Express matching
// "top-creators" as a wallet address parameter.
// Returns top 8 creators ranked by number of NFTs minted.
router.get('/top-creators', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Aggregate NFTs grouped by minter, count descending, top 8
    const topMinters = await NFT.aggregate([
      { $group: { _id: '$minter', nftCount: { $sum: 1 } } },
      { $sort:  { nftCount: -1 } },
      { $limit: 8 },
    ]);

    // Enrich each result with username and avatar from the users collection
    const results = await Promise.all(
      topMinters.map(async ({ _id: address, nftCount }: { _id: string; nftCount: number }) => {
        const user = await User.findOne({ address });
        return {
          address,
          nftCount,
          username: user?.username  ?? null,
          avatar:   user?.avatar    ?? null,
        };
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
router.get('/:address/nfts', async (req: Request<{ address: string }>, res: Response): Promise<void> => {
  const address = req.params.address.toLowerCase();
  const page    = Math.max(1, parseInt(qs(req.query.page)   ?? '1'));
  const limit   = Math.min(100, parseInt(qs(req.query.limit) ?? '20'));
  const skip    = (page - 1) * limit;

  try {
    const [nfts, total] = await Promise.all([
      NFT.find({ owner: address }).sort({ mintedAt: -1 }).skip(skip).limit(limit),
      NFT.countDocuments({ owner: address }),
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

  const filter = { $or: [{ from: address }, { to: address }] };

  try {
    const [activity, total] = await Promise.all([
      Activity.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
      Activity.countDocuments(filter),
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
// router.get('/:address/nfts', async (req: Request<{ address: string }>, res: Response): Promise<void> => {
//   const address = req.params.address.toLowerCase();
//   const page    = Math.max(1, parseInt(qs(req.query.page)   ?? '1'));
//   const limit   = Math.min(100, parseInt(qs(req.query.limit) ?? '20'));
//   const skip    = (page - 1) * limit;

//   try {
//     const [nfts, total] = await Promise.all([
//       NFT.find({ owner: address }).sort({ mintedAt: -1 }).skip(skip).limit(limit),
//       NFT.countDocuments({ owner: address }),
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

//   const filter = { $or: [{ from: address }, { to: address }] };

//   try {
//     const [activity, total] = await Promise.all([
//       Activity.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
//       Activity.countDocuments(filter),
//     ]);
//     sendPaginated(res, activity, total, page, limit);
//   } catch (err) {
//     sendServerError(res, err, `GET /users/${address}/activity`);
//   }
// });

// export default router;