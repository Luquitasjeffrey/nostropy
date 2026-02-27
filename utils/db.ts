import mongoose from 'mongoose';

let isConnected = false;

/**
 * Initialize mongoose connection using MONGODB_URL env variable.
 * Returns the mongoose connection instance.
 */
export async function connectToDatabase() {
  if (isConnected) {
    return mongoose.connection;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  const options = {
    // useNewUrlParser: true, // not needed in mongoose >=6
    // useUnifiedTopology: true,
  };

  try {
    await mongoose.connect(uri, options);
    isConnected = true;
    console.log('✅ MongoDB connected');
    return mongoose.connection;
  } catch (error) {
    console.error('Failed to connect to MongoDB', error);
    throw error;
  }
}
