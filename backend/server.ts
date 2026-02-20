// Import required modules using ES module syntax
import 'dotenv/config'; // Alternative way to load .env variables
import express from 'express'; // Express framework for building APIs
import cors from 'cors'; // Enables Cross-Origin Resource Sharing
import { connectDB } from './utils/connectDB'; 
import { startAllIndexers } from './indexer';

import userRoutes from './routes/users.route';
import collectionRoutes from './routes/collections.route';
import nftRoutes from './routes/nfts.route';
import listingRoutes from './routes/listings.route';
import activityRoutes from './routes/activity.route';



// // Import route modules
// import authRoutes from './routes/auth.route.js'; // Auth routes (signup, login)
// import { errorHandler } from './middleware/error.middleware.js';


// Create Express app
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
//this middleware helps the backend receive json data from the frontend
// Parse incoming JSON requests
// Enable CORS for all requests
app.use(cors({
  origin: process.env.VITE_SERVER_DOMAIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({extended: true}));


// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/nfts', nftRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/activity', activityRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.send('NFT Marketplace API is running'); // Simple response to verify server is running
});


// Error handling middleware
// app.use(errorHandler);

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Start the Express server
// Start
async function main() {
  await connectDB();         // DB must be connected first
  await startAllIndexers();  // then start indexers — they need DB to be ready

  app.listen(PORT, () => {
    console.log(`\n🌐 Server running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health\n`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});


