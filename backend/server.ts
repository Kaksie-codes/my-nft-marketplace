import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './utils/connectDB';
import { startAllIndexers } from './indexer';
import { requestLogger } from './middleware/logger.middleware';
import { errorHandler } from './middleware/error.middleware';

import userRoutes       from './routes/users.route';
import collectionRoutes from './routes/collections.route';
import nftRoutes        from './routes/nfts.route';
import listingRoutes    from './routes/listings.route';
import activityRoutes   from './routes/activity.route';
import newsletterRoutes   from './routes/newsletter.route';
import adminRoutes from './routes/admin.route';
import uploadRoutes from './routes/upload.route';

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Core middleware ──────────────────────────────────────────────────────────
// app.use(cors({
//   origin:      process.env.CLIENT_URL || 'http://localhost:5173',
//   credentials: true,
// }));
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://my-nft-marketplace-j1gh.vercel.app'
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Request logger ───────────────────────────────────────────────────────────
// Logs every request with method, path, status code and response time.
// e.g. GET /api/users/0xabc 200 - 12ms
app.use(requestLogger);

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/', (_req, res) => res.send('NFT Marketplace API is running'));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/users',       userRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/nfts',        nftRoutes);
app.use('/api/listings',    listingRoutes);
app.use('/api/activity',    activityRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, error: 'Not found' }));

// ── Global error handler ─────────────────────────────────────────────────────
// Must be the very last app.use and must have all 4 params for Express to
// recognise it as an error handler, not a regular middleware.
app.use(errorHandler);


// ── Startup ──────────────────────────────────────────────────────────────────
async function main() {
  // 1. Connect to MongoDB first — indexers and routes both need it
  await connectDB();

  // 2. Start blockchain event indexers — they need DB to be ready
  await startAllIndexers();

  // 3. Start HTTP server last
  app.listen(PORT, () => {
    console.log(`\n🌐 Server running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health\n`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});