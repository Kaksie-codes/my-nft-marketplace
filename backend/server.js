// Import required modules using ES module syntax
import dotenv from 'dotenv'; // Loads environment variables from .env file
import express from 'express'; // Express framework for building APIs
import mongoose from 'mongoose'; // MongoDB ODM
import cors from 'cors'; // Enables Cross-Origin Resource Sharing
import path from 'path'
import cookieParser from 'cookie-parser';
import bodyParser from 'body-parser';

// Import route modules
import authRoutes from './routes/auth.route.js'; // Auth routes (signup, login)
import { errorHandler } from './middleware/error.middleware.js';

// This enables us to read the content of the .env file
dotenv.config({ path: './.env.local' });
const __dirname = path.resolve();

// Create Express app
const app = express();


//this middleware helps the backend receive json data from the frontend
// Parse incoming JSON requests
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Use cookie-parser middleware to parse cookies
app.use(cookieParser());

// Set payload size limit
app.use(bodyParser.json({ limit: '10mb' }));

// Enable CORS for all requests
app.use(cors());

app.use(express.static(path.join(__dirname, '/frontend/dist')));

// Mount authentication routes at /api/auth
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.send('NFT Marketplace API is running'); // Simple response to verify server is running
});

// app.get('/*', (req, res) => {
//     res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'))
// })

// Error handling middleware
app.use(errorHandler);

// Start the Express server
const PORT = process.env.PORT || 5000;
// Connect to MongoDB database
mongoose.connect(process.env.MONGO_URI, {autoIndex:true})
.then(() => {
    console.log('connected to database');
  
    //listen for requests after connections has been made to the database
    app.listen(PORT, () => {
        console.log(`server started listening on port ${PORT}`);
    })
})
.catch(err => console.log('error', err));
