/**
 * Generator for ToolJet datasource JSON from schema inference
 */

/**
 * List of sensitive header names (case-insensitive)
 */
const SENSITIVE_HEADERS = [
  'authorization',
  'api-key',
  'api_key',
  'apikey',
  'x-api-key',
  'x-auth-token',
  'token',
  'secret',
  'password',
  'bearer'
];

/**
 * Masks sensitive headers with a deterministic placeholder
 * @param {Object} headers - Headers object
 * @returns {Object} - Headers with sensitive values masked
 */
function maskSensitiveHeaders(headers) {
  if (!headers || typeof headers !== 'object') {
    return {};
  }

  const masked = {};

  for (const key in headers) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_HEADERS.some(sensitive =>
      lowerKey.includes(sensitive)
    );

    masked[key] = isSensitive ? '<masked>' : headers[key];
  }

  return masked;
}

/**
 * Generates ToolJet datasource JSON from schema inference
 * @param {Object} schema - Schema from inferSchema
 * @param {Object} opts - Options
 * @returns {Object} - ToolJet datasource JSON
 */
function generateDatasourceJSON(schema, opts = {}) {
  const {
    url,
    fields = [],
    samplePath,
    pagination,
    headers = {},
    queryParams = {}
  } = schema;

  const maskedHeaders = maskSensitiveHeaders(headers);

  const datasource = {
    name: opts.name || 'API Datasource',
    type: 'restapi',
    url: url,
    method: 'GET',
    headers: maskedHeaders,
    queryParams: queryParams
  };

  const output = {
    datasource,
    fields,
    samplePath: samplePath || '$',
    pagination: pagination || null
  };

  return output;
}

/**
 * Maps field type to ToolJet column type
 * @param {string} type - Field type from schema
 * @returns {string} - ToolJet column type
 */
function mapFieldType(type) {
  const typeMap = {
    'integer': 'number',
    'number': 'number',
    'string': 'text',
    'boolean': 'boolean',
    'object': 'text',
    'array': 'text',
    'null': 'text'
  };

  // Handle union types (e.g., "boolean|number|string")
  if (type && type.includes('|')) {
    return 'text'; // Default to text for union types
  }

  return typeMap[type] || 'text';
}

/**
 * Generates a complete ToolJet import wrapper
 * @param {Object} schema - Schema from inferSchema
 * @param {Object} opts - Options
 * @returns {Object} - Complete ToolJet import JSON
 */
function generateImportWrapper(schema, opts = {}) {
  const { fields = [], samplePath = '$', pagination } = schema;

  // Generate datasource configuration
  const datasourceConfig = generateDatasourceJSON(schema, opts);

  // Generate table columns from fields
  const columns = fields.map(field => ({
    name: field.name,
    key: field.name,
    type: mapFieldType(field.type),
    selector: `${samplePath}[].${field.name}`
  }));

  // Build components
  const components = {
    table: {
      component: 'Table',
      dataBinding: `{{datasource.data${samplePath.replace('$', '')}}}`,
      columns: columns
    }
  };

  // Add pagination if present
  if (pagination) {
    components.pagination = {
      component: 'Pagination',
      type: pagination.type,
      pageParam: pagination.pageParam || 'page',
      limitParam: pagination.limitParam || 'limit',
      metaPaths: pagination.metaPaths || {}
    };
  }

  // Build complete wrapper
  const wrapper = {
    version: '1.0.0',
    datasource: datasourceConfig.datasource,
    components: components,
    metadata: {
      samplePath: samplePath,
      fieldCount: fields.length,
      hasPagination: !!pagination
    }
  };

  return wrapper;
}

/**
 * Generates a downloadable filename
 * @param {Object} schema - Schema object
 * @returns {string} - Filename
 */
function generateFilename(schema) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const sanitizedUrl = (schema.url || 'datasource')
    .replace(/https?:\/\//, '')
    .replace(/[^a-z0-9]/gi, '-')
    .substring(0, 50);

  return `tooljet-${sanitizedUrl}-${timestamp}.json`;
}

module.exports = {
  maskSensitiveHeaders,
  generateDatasourceJSON,
  generateImportWrapper,
  mapFieldType,
  generateFilename
};
