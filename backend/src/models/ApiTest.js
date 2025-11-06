/**
 * API Test Model
 * Stores information about tested APIs
 */
const mongoose = require('mongoose');

const apiTestSchema = new mongoose.Schema({
  // API Information
  url: {
    type: String,
    required: true,
    trim: true
  },
  method: {
    type: String,
    default: 'GET',
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  },
  headers: {
    type: Map,
    of: String,
    default: {}
  },
  queryParams: {
    type: Map,
    of: String,
    default: {}
  },

  // Test Results
  success: {
    type: Boolean,
    required: true
  },
  status: {
    type: Number
  },
  responseTime: {
    type: Number, // in milliseconds
    default: 0
  },
  errorMessage: {
    type: String
  },

  // Schema Information
  samplePath: {
    type: String
  },
  fields: {
    type: mongoose.Schema.Types.Mixed,
    default: []
  },
  pagination: {
    type: mongoose.Schema.Types.Mixed
  },

  // Metadata
  testedAt: {
    type: Date,
    default: Date.now
  },
  testCount: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Index for faster queries
apiTestSchema.index({ url: 1, testedAt: -1 });
apiTestSchema.index({ success: 1 });

// Virtual for formatted date
apiTestSchema.virtual('formattedDate').get(function() {
  return this.testedAt.toISOString().split('T')[0];
});

// Method to increment test count
apiTestSchema.methods.incrementTestCount = function() {
  this.testCount += 1;
  this.testedAt = new Date();
  return this.save();
};

// Static method to find by URL
apiTestSchema.statics.findByUrl = function(url) {
  return this.find({ url }).sort({ testedAt: -1 });
};

// Static method to get recent tests
apiTestSchema.statics.getRecentTests = function(limit = 10) {
  return this.find().sort({ testedAt: -1 }).limit(limit);
};

// Static method to get success rate
apiTestSchema.statics.getSuccessRate = async function() {
  const total = await this.countDocuments();
  const successful = await this.countDocuments({ success: true });
  return total > 0 ? (successful / total) * 100 : 0;
};

const ApiTest = mongoose.model('ApiTest', apiTestSchema);

module.exports = ApiTest;
