/**
 * MongoDB Database Configuration
 */
const mongoose = require('mongoose');

/**
 * Connect to MongoDB database
 * @returns {Promise<void>}
 */
async function connectDatabase() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-data-connector';

    await mongoose.connect(mongoURI, {
      // Connection options
      // useNewUrlParser and useUnifiedTopology are no longer needed in Mongoose 6+
    });

    console.log('✓ MongoDB connected successfully');
    console.log(`  Database: ${mongoose.connection.name}`);
    console.log(`  Host: ${mongoose.connection.host}`);
  } catch (error) {
    console.error('✗ MongoDB connection error:', error.message);
    // Don't exit process - allow app to run without DB for testing APIs
    console.warn('  App will continue without database functionality');
  }
}

/**
 * Disconnect from MongoDB database
 * @returns {Promise<void>}
 */
async function disconnectDatabase() {
  try {
    await mongoose.disconnect();
    console.log('✓ MongoDB disconnected');
  } catch (error) {
    console.error('✗ Error disconnecting from MongoDB:', error.message);
  }
}

/**
 * Get database connection status
 * @returns {string} Connection state
 */
function getDatabaseStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[mongoose.connection.readyState] || 'unknown';
}

/**
 * Check if database is connected
 * @returns {boolean} True if connected
 */
function isConnected() {
  return mongoose.connection.readyState === 1;
}

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('MongoDB event: Connected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB event: Error -', err.message);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB event: Disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getDatabaseStatus,
  isConnected
};
