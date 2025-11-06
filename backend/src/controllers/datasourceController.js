/**
 * Datasource Controller
 * Handles database operations for datasources
 */
const { Datasource } = require('../models');
const { isConnected } = require('../config/database');

/**
 * Save generated datasource to database
 * @param {Object} datasourceData - Datasource data to save
 * @returns {Promise<Object>} Saved datasource document
 */
async function saveDatasource(datasourceData) {
  if (!isConnected()) {
    console.warn('Database not connected. Skipping save.');
    return null;
  }

  try {
    const datasource = new Datasource(datasourceData);
    await datasource.save();
    return datasource;
  } catch (error) {
    console.error('Error saving datasource:', error.message);
    return null;
  }
}

/**
 * Get datasource by ID
 * @param {string} id - Datasource ID
 * @returns {Promise<Object>} Datasource document
 */
async function getDatasourceById(id) {
  if (!isConnected()) {
    return null;
  }

  try {
    return await Datasource.findById(id);
  } catch (error) {
    console.error('Error getting datasource:', error.message);
    return null;
  }
}

/**
 * Get datasources by URL
 * @param {string} url - API URL
 * @returns {Promise<Array>} Array of datasource documents
 */
async function getDatasourcesByUrl(url) {
  if (!isConnected()) {
    return [];
  }

  try {
    return await Datasource.findByUrl(url);
  } catch (error) {
    console.error('Error getting datasources by URL:', error.message);
    return [];
  }
}

/**
 * Get popular datasources
 * @param {number} limit - Number of datasources to retrieve
 * @returns {Promise<Array>} Array of datasource documents
 */
async function getPopularDatasources(limit = 10) {
  if (!isConnected()) {
    return [];
  }

  try {
    return await Datasource.getPopular(limit);
  } catch (error) {
    console.error('Error getting popular datasources:', error.message);
    return [];
  }
}

/**
 * Get recent datasources
 * @param {number} limit - Number of datasources to retrieve
 * @returns {Promise<Array>} Array of datasource documents
 */
async function getRecentDatasources(limit = 10) {
  if (!isConnected()) {
    return [];
  }

  try {
    return await Datasource.getRecent(limit);
  } catch (error) {
    console.error('Error getting recent datasources:', error.message);
    return [];
  }
}

/**
 * Increment download count for a datasource
 * @param {string} id - Datasource ID
 * @returns {Promise<Object>} Updated datasource document
 */
async function incrementDownload(id) {
  if (!isConnected()) {
    return null;
  }

  try {
    const datasource = await Datasource.findById(id);
    if (datasource) {
      await datasource.incrementDownloadCount();
      return datasource;
    }
    return null;
  } catch (error) {
    console.error('Error incrementing download:', error.message);
    return null;
  }
}

/**
 * Archive a datasource
 * @param {string} id - Datasource ID
 * @returns {Promise<Object>} Updated datasource document
 */
async function archiveDatasource(id) {
  if (!isConnected()) {
    return null;
  }

  try {
    const datasource = await Datasource.findById(id);
    if (datasource) {
      await datasource.archive();
      return datasource;
    }
    return null;
  } catch (error) {
    console.error('Error archiving datasource:', error.message);
    return null;
  }
}

/**
 * Get datasource statistics
 * @returns {Promise<Object>} Statistics object
 */
async function getDatasourceStats() {
  if (!isConnected()) {
    return {
      totalDatasources: 0,
      activeDatasources: 0,
      archivedDatasources: 0,
      totalDownloads: 0
    };
  }

  try {
    const totalDatasources = await Datasource.countDocuments();
    const activeDatasources = await Datasource.countDocuments({ status: 'active' });
    const archivedDatasources = await Datasource.countDocuments({ status: 'archived' });

    const downloadStats = await Datasource.aggregate([
      {
        $group: {
          _id: null,
          totalDownloads: { $sum: '$downloadCount' }
        }
      }
    ]);

    const totalDownloads = downloadStats.length > 0 ? downloadStats[0].totalDownloads : 0;

    return {
      totalDatasources,
      activeDatasources,
      archivedDatasources,
      totalDownloads
    };
  } catch (error) {
    console.error('Error getting datasource stats:', error.message);
    return {
      totalDatasources: 0,
      activeDatasources: 0,
      archivedDatasources: 0,
      totalDownloads: 0
    };
  }
}

module.exports = {
  saveDatasource,
  getDatasourceById,
  getDatasourcesByUrl,
  getPopularDatasources,
  getRecentDatasources,
  incrementDownload,
  archiveDatasource,
  getDatasourceStats
};
