

// Import required modules using ES module syntax
import dotenv from 'dotenv'; // Loads environment variables from .env file
import express from 'express'; // Express framework for building APIs
import mongoose from 'mongoose'; // MongoDB ODM
import cors from 'cors'; // Enables Cross-Origin Resource Sharing

// Import route modules
import authRoutes from './routes/auth.js'; // Auth routes (signup, login)
import userRoutes from './routes/user.js'; // User profile routes

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Enable CORS for all requests
app.use(cors());

// Parse incoming JSON requests
app.use(express.json());

// Connect to MongoDB database
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nftmarketplace');

// Mount authentication routes at /api/auth
app.use('/api/auth', authRoutes);

// Mount user profile routes at /api/user
app.use('/api/user', userRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.send('NFT Marketplace API is running'); // Simple response to verify server is running
});

// Start the Express server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`); // Log server URL
});
