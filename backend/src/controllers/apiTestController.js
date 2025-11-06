/**
 * API Test Controller
 * Handles database operations for API tests
 */
const { ApiTest } = require('../models');
const { isConnected } = require('../config/database');

/**
 * Save API test result to database
 * @param {Object} testData - Test data to save
 * @returns {Promise<Object>} Saved test document
 */
async function saveApiTest(testData) {
  if (!isConnected()) {
    console.warn('Database not connected. Skipping save.');
    return null;
  }

  try {
    // Check if URL was tested before
    const existingTest = await ApiTest.findOne({ url: testData.url }).sort({ testedAt: -1 });

    if (existingTest) {
      // Update existing test
      existingTest.success = testData.success;
      existingTest.status = testData.status;
      existingTest.responseTime = testData.responseTime;
      existingTest.errorMessage = testData.errorMessage;
      existingTest.samplePath = testData.samplePath;
      existingTest.fields = testData.fields;
      existingTest.pagination = testData.pagination;
      await existingTest.incrementTestCount();
      return existingTest;
    } else {
      // Create new test
      const apiTest = new ApiTest(testData);
      await apiTest.save();
      return apiTest;
    }
  } catch (error) {
    console.error('Error saving API test:', error.message);
    return null;
  }
}

/**
 * Get recent API tests
 * @param {number} limit - Number of tests to retrieve
 * @returns {Promise<Array>} Array of test documents
 */
async function getRecentTests(limit = 10) {
  if (!isConnected()) {
    return [];
  }

  try {
    return await ApiTest.getRecentTests(limit);
  } catch (error) {
    console.error('Error getting recent tests:', error.message);
    return [];
  }
}

/**
 * Get tests by URL
 * @param {string} url - API URL
 * @returns {Promise<Array>} Array of test documents
 */
async function getTestsByUrl(url) {
  if (!isConnected()) {
    return [];
  }

  try {
    return await ApiTest.findByUrl(url);
  } catch (error) {
    console.error('Error getting tests by URL:', error.message);
    return [];
  }
}

/**
 * Get API test statistics
 * @returns {Promise<Object>} Statistics object
 */
async function getTestStats() {
  if (!isConnected()) {
    return {
      totalTests: 0,
      successfulTests: 0,
      failedTests: 0,
      successRate: 0
    };
  }

  try {
    const totalTests = await ApiTest.countDocuments();
    const successfulTests = await ApiTest.countDocuments({ success: true });
    const failedTests = await ApiTest.countDocuments({ success: false });
    const successRate = await ApiTest.getSuccessRate();

    return {
      totalTests,
      successfulTests,
      failedTests,
      successRate: Math.round(successRate * 100) / 100
    };
  } catch (error) {
    console.error('Error getting test stats:', error.message);
    return {
      totalTests: 0,
      successfulTests: 0,
      failedTests: 0,
      successRate: 0
    };
  }
}

/**
 * Delete old tests
 * @param {number} daysOld - Delete tests older than this many days
 * @returns {Promise<number>} Number of deleted documents
 */
async function deleteOldTests(daysOld = 30) {
  if (!isConnected()) {
    return 0;
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await ApiTest.deleteMany({
      testedAt: { $lt: cutoffDate }
    });

    return result.deletedCount;
  } catch (error) {
    console.error('Error deleting old tests:', error.message);
    return 0;
  }
}

module.exports = {
  saveApiTest,
  getRecentTests,
  getTestsByUrl,
  getTestStats,
  deleteOldTests
};
