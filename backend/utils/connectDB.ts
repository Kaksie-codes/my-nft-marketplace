import mongoose from 'mongoose';

let isConnected = false;

// Register the runtime error listener at module level — outside the function.
// This ensures it's only registered once no matter how many times connectDB
// is called, and catches any errors that occur after initial connection.
mongoose.connection.on('error', (err) => {
  console.error('MongoDB runtime error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
  isConnected = false; // Reset flag so reconnection is allowed if called again
});

export async function connectDB(): Promise<void> {
  // Guard: skip if already connected
  if (isConnected) return;

  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not set in .env');

  try {
    const conn = await mongoose.connect(uri);
    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`MongoDB Connection Error: ${error.message}`);
    } else {
      console.error('Unknown MongoDB connection error');
    }

    // Re-throw so the caller (main() in server.ts) can catch it and exit
    throw error;
  }
}