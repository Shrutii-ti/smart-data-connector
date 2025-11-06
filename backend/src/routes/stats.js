/**
 * Statistics routes
 */
const express = require('express');
const { getTestStats } = require('../controllers/apiTestController');
const { getDatasourceStats } = require('../controllers/datasourceController');
const { getDatabaseStatus } = require('../config/database');

const router = express.Router();

/**
 * GET /api/stats
 * Get overall statistics
 */
router.get('/', async (req, res) => {
  try {
    const testStats = await getTestStats();
    const datasourceStats = await getDatasourceStats();
    const dbStatus = getDatabaseStatus();

    res.json({
      ok: true,
      database: {
        status: dbStatus
      },
      apiTests: testStats,
      datasources: datasourceStats
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: `Error getting statistics: ${error.message}`
    });
  }
});

/**
 * GET /api/stats/tests
 * Get API test statistics
 */
router.get('/tests', async (req, res) => {
  try {
    const stats = await getTestStats();
    res.json({
      ok: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: `Error getting test statistics: ${error.message}`
    });
  }
});

/**
 * GET /api/stats/datasources
 * Get datasource statistics
 */
router.get('/datasources', async (req, res) => {
  try {
    const stats = await getDatasourceStats();
    res.json({
      ok: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: `Error getting datasource statistics: ${error.message}`
    });
  }
});

module.exports = router;
