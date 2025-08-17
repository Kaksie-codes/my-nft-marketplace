
// Load environment variables
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/nftmarketplace', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Auth routes (signup, login)
app.use('/api/auth', require('./routes/auth'));
// User profile routes
app.use('/api/user', require('./routes/user'));

// Health check
app.get('/', (req, res) => {
  res.send('NFT Marketplace API is running');
});

// Start server
app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on http://localhost:${process.env.PORT || 5000}`);
});
