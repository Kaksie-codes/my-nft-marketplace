// Import required modules using ES module syntax
import 'dotenv/config'; // Alternative way to load .env variables
import express from 'express'; // Express framework for building APIs
import cors from 'cors'; // Enables Cross-Origin Resource Sharing
import path from 'path'
import bodyParser from 'body-parser';
import { connectDB } from './utils/connectDB.js'; 
// import { startAllIndexers } from './indexer';

// import userRoutes from './routes/users';
// import collectionRoutes from './routes/collections';
// import nftRoutes from './routes/nfts';
// import listingRoutes from './routes/listings';
// import activityRoutes from './routes/activity';



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
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}));


// Health check
app.get('/health', (_req, res) => res.json({ ok: true }));

// Routes
// app.use('/api/users', userRoutes);
// app.use('/api/collections', collectionRoutes);
// app.use('/api/nfts', nftRoutes);
// app.use('/api/listings', listingRoutes);
// app.use('/api/activity', activityRoutes);

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
  await connectDB();
//   await startAllIndexers();

  app.listen(PORT, () => {
    console.log(`\n🌐 Server running on http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health\n`);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
