/**
 * Main Express application
 */
require('dotenv').config();
const express = require('express');
const { connectDatabase } = require('./config/database');
const testRouter = require('./routes/test');

const app = express();

// Connect to MongoDB
connectDatabase().catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  // App continues to work without database
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const statsRouter = require('./routes/stats');
app.use('/api', testRouter);
app.use('/api/stats', statsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Only start server if not in test mode
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
