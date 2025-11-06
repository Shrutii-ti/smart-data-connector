/**
 * Datasource Model
 * Stores generated ToolJet datasource configurations
 */
const mongoose = require('mongoose');

const datasourceSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },

  // Configuration
  config: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // Schema Details
  samplePath: {
    type: String,
    required: true
  },
  fieldCount: {
    type: Number,
    default: 0
  },
  hasPagination: {
    type: Boolean,
    default: false
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'active', 'archived'],
    default: 'active'
  },

  // Usage Statistics
  downloadCount: {
    type: Number,
    default: 0
  },
  lastDownloaded: {
    type: Date
  },

  // Tags for organization
  tags: [{
    type: String,
    trim: true
  }],

  // User/Creator (if you add authentication later)
  createdBy: {
    type: String,
    default: 'anonymous'
  }
}, {
  timestamps: true
});

// Indexes
datasourceSchema.index({ url: 1 });
datasourceSchema.index({ name: 1 });
datasourceSchema.index({ status: 1 });
datasourceSchema.index({ tags: 1 });
datasourceSchema.index({ createdAt: -1 });

// Virtual for formatted filename
datasourceSchema.virtual('filename').get(function() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const sanitizedUrl = this.url
    .replace(/https?:\/\//, '')
    .replace(/[^a-z0-9]/gi, '-')
    .substring(0, 50);
  return `tooljet-${sanitizedUrl}-${timestamp}.json`;
});

// Method to increment download count
datasourceSchema.methods.incrementDownloadCount = function() {
  this.downloadCount += 1;
  this.lastDownloaded = new Date();
  return this.save();
};

// Method to archive
datasourceSchema.methods.archive = function() {
  this.status = 'archived';
  return this.save();
};

// Static method to find by URL
datasourceSchema.statics.findByUrl = function(url) {
  return this.find({ url, status: { $ne: 'archived' } }).sort({ createdAt: -1 });
};

// Static method to get popular datasources
datasourceSchema.statics.getPopular = function(limit = 10) {
  return this.find({ status: 'active' })
    .sort({ downloadCount: -1 })
    .limit(limit);
};

// Static method to get recent datasources
datasourceSchema.statics.getRecent = function(limit = 10) {
  return this.find({ status: 'active' })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to search by tags
datasourceSchema.statics.findByTags = function(tags) {
  return this.find({ tags: { $in: tags }, status: 'active' });
};

const Datasource = mongoose.model('Datasource', datasourceSchema);

module.exports = Datasource;
