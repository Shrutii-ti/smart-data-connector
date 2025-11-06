/**
 * Schema inference utilities for API responses
 */

/**
 * Finds the path to the first array in the response object
 * @param {*} obj - The response object
 * @returns {string|null} - The property name containing an array, or null if top-level array or not found
 */
function findArrayPath(obj) {
  // If the input itself is an array, return null (top-level array)
  if (Array.isArray(obj)) {
    return null;
  }

  // If not an object, return null
  if (typeof obj !== 'object' || obj === null) {
    return null;
  }

  // Find the first property that contains an array
  for (const key in obj) {
    if (Array.isArray(obj[key]) && obj[key].length > 0) {
      return key;
    }
  }

  return null;
}

/**
 * Infers the type of a value
 * @param {*} value - The value to check
 * @returns {string} - The inferred type
 */
function inferType(value) {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  const type = typeof value;

  if (type === 'number') {
    return Number.isInteger(value) ? 'integer' : 'number';
  }

  return type;
}

/**
 * Infers fields and their types from a sample object
 * @param {Object} sampleObj - A sample object to analyze
 * @returns {Array<{name: string, type: string, sample: *}>} - Array of field definitions
 */
function inferFields(sampleObj) {
  if (typeof sampleObj !== 'object' || sampleObj === null) {
    return [];
  }

  const fields = [];

  for (const key in sampleObj) {
    const value = sampleObj[key];
    const type = inferType(value);

    fields.push({
      name: key,
      type: type,
      sample: value
    });
  }

  return fields;
}

/**
 * Merges multiple field type inferences, handling inconsistent types
 * @param {Array<Object>} samples - Array of sample objects
 * @returns {Array<{name: string, type: string, sample: *}>} - Merged field definitions
 */
function mergeFieldTypes(samples) {
  if (!samples || samples.length === 0) {
    return [];
  }

  // Collect all unique field names
  const fieldMap = new Map();

  samples.forEach(sample => {
    const fields = inferFields(sample);
    fields.forEach(field => {
      if (!fieldMap.has(field.name)) {
        fieldMap.set(field.name, {
          name: field.name,
          types: new Set([field.type]),
          sample: field.sample
        });
      } else {
        fieldMap.get(field.name).types.add(field.type);
      }
    });
  });

  // Convert to final format
  return Array.from(fieldMap.values()).map(fieldInfo => {
    const types = Array.from(fieldInfo.types);

    // If multiple types, create union type
    const type = types.length === 1 ? types[0] : types.sort().join('|');

    return {
      name: fieldInfo.name,
      type: type,
      sample: fieldInfo.sample
    };
  });
}

/**
 * Detects pagination metadata in the response
 * @param {Object} obj - The response object
 * @param {Object} headers - Optional HTTP headers
 * @returns {Object|null} - Pagination information or null if not detected
 */
function detectPagination(obj, headers = {}) {
  if (typeof obj !== 'object' || obj === null) {
    return null;
  }

  // Common pagination field names
  const paginationKeys = ['meta', 'pagination', 'paging', 'page_info'];

  // Look for pagination metadata
  for (const key in obj) {
    const value = obj[key];

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Check for page-based pagination
      const hasPage = 'page' in value || 'current_page' in value || 'currentPage' in value;
      const hasPerPage = 'per_page' in value || 'page_size' in value || 'perPage' in value || 'pageSize' in value;
      const hasTotal = 'total' in value || 'total_count' in value || 'totalCount' in value;

      if (hasPage && (hasPerPage || hasTotal)) {
        const pageKey = 'page' in value ? 'page' : ('current_page' in value ? 'current_page' : 'currentPage');
        const perPageKey = 'per_page' in value ? 'per_page' : ('page_size' in value ? 'page_size' : ('perPage' in value ? 'perPage' : 'pageSize'));
        const totalKey = 'total' in value ? 'total' : ('total_count' in value ? 'total_count' : 'totalCount');

        return {
          type: 'page',
          pageParam: 'page',
          limitParam: 'limit',
          metaPaths: {
            currentPage: `${key}.${pageKey}`,
            perPage: `${key}.${perPageKey}`,
            total: `${key}.${totalKey}`
          }
        };
      }

      // Check for offset-based pagination
      const hasOffset = 'offset' in value;
      const hasLimit = 'limit' in value;

      if (hasOffset && hasLimit) {
        return {
          type: 'offset',
          offsetParam: 'offset',
          limitParam: 'limit',
          metaPaths: {
            offset: `${key}.offset`,
            limit: `${key}.limit`,
            total: `${key}.total`
          }
        };
      }
    }
  }

  return null;
}

/**
 * Main schema inference function
 * @param {*} data - The API response data
 * @param {Object} headers - Optional HTTP headers
 * @returns {Object|null} - Inferred schema information
 */
function inferSchema(data, headers = {}) {
  // Handle null or undefined
  if (data == null) {
    return null;
  }

  // Handle empty arrays
  if (Array.isArray(data) && data.length === 0) {
    return null;
  }

  let samplePath = '$';
  let samples = [];

  // Determine if data is top-level array or wrapped
  if (Array.isArray(data)) {
    // Top-level array
    samplePath = '$';
    samples = data.slice(0, Math.min(5, data.length)); // Sample first 5 items
  } else if (typeof data === 'object') {
    // Find array in wrapped response
    const arrayKey = findArrayPath(data);

    if (arrayKey) {
      samplePath = `$.${arrayKey}`;
      const array = data[arrayKey];
      samples = array.slice(0, Math.min(5, array.length));
    } else {
      // No array found, treat the object itself as the sample
      return null;
    }
  } else {
    return null;
  }

  // Infer fields from samples
  const fields = mergeFieldTypes(samples);

  // Detect pagination
  const pagination = Array.isArray(data) ? null : detectPagination(data, headers);

  return {
    samplePath,
    fields,
    pagination
  };
}

module.exports = {
  findArrayPath,
  inferFields,
  inferType,
  mergeFieldTypes,
  detectPagination,
  inferSchema
};
