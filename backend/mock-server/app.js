const express = require('express');
const { mockOrders } = require('./data');

const app = express();

// Middleware to parse JSON
app.use(express.json());

// Auth middleware
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
};

// GET /orders - Paginated orders endpoint
app.get('/orders', requireAuth, (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  // Calculate pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  // Get paginated data
  const paginatedOrders = mockOrders.slice(startIndex, endIndex);

  // Build response
  const response = {
    orders: paginatedOrders,
    meta: {
      page: page,
      per_page: limit,
      total: mockOrders.length,
      total_pages: Math.ceil(mockOrders.length / limit)
    }
  };

  res.status(200).json(response);
});

// GET /html - Returns HTML for testing non-JSON response
app.get('/html', requireAuth, (req, res) => {
  res.status(200).send('<!DOCTYPE html><html><body><h1>This is HTML, not JSON</h1></body></html>');
});

module.exports = app;
