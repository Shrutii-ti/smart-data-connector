/**
 * HTTP fetcher with retry and exponential backoff
 */
const axios = require('axios');

/**
 * Sleep utility for retry delays
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetches data from a URL with retry logic and exponential backoff
 * @param {Object} options - Fetch options
 * @param {string} options.url - The URL to fetch
 * @param {Object} options.headers - HTTP headers
 * @param {Object} options.queryParams - Query parameters
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.timeout - Request timeout in ms (default: 10000)
 * @returns {Promise<Object>} - Response object with data, status, headers
 */
async function fetchWithRetry(options) {
  const {
    url,
    headers = {},
    queryParams = {},
    maxRetries = 3,
    initialDelay = 1000,
    timeout = 10000
  } = options;

  let lastError = null;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const response = await axios({
        url,
        method: 'GET',
        headers,
        params: queryParams,
        timeout,
        validateStatus: () => true // Don't throw on any status code
      });

      return {
        success: true,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data
      };
    } catch (error) {
      lastError = error;
      attempt++;

      // Don't retry if it's not a network error
      if (error.response) {
        // Server responded with error status
        return {
          success: false,
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data,
          error: error.message
        };
      }

      // Network error or timeout - retry with exponential backoff
      if (attempt <= maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  return {
    success: false,
    status: 0,
    error: lastError.message,
    errorType: lastError.code || 'NETWORK_ERROR'
  };
}

/**
 * Checks if a response is JSON
 * @param {*} data - Response data
 * @param {Object} headers - Response headers
 * @returns {boolean} - True if JSON
 */
function isJsonResponse(data, headers) {
  // Check Content-Type header
  const contentType = headers['content-type'] || '';
  if (contentType.includes('application/json')) {
    return true;
  }

  // Try to detect if data is already parsed JSON
  if (typeof data === 'object' && data !== null) {
    return true;
  }

  // If data is string, try to parse it
  if (typeof data === 'string') {
    try {
      JSON.parse(data);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Generates hints for common error scenarios
 * @param {number} status - HTTP status code
 * @param {string} errorType - Error type
 * @returns {string} - Helpful hint message
 */
function generateHints(status, errorType) {
  if (status === 401) {
    return 'Authentication failed. Check if your API key or token is correct and properly formatted in the Authorization header.';
  }

  if (status === 403) {
    return 'Access forbidden. Your credentials may be valid but lack permission to access this resource.';
  }

  if (status === 404) {
    return 'Resource not found. Verify the URL path is correct and the endpoint exists.';
  }

  if (status === 429) {
    return 'Rate limit exceeded. Wait before retrying or check your rate limit settings.';
  }

  if (status >= 500) {
    return 'Server error. The API is experiencing issues. Try again later or contact the API provider.';
  }

  if (errorType === 'ECONNREFUSED' || errorType === 'NETWORK_ERROR') {
    return 'Cannot connect to server. Check if the URL is correct and the server is running.';
  }

  if (errorType === 'ETIMEDOUT' || errorType === 'ECONNABORTED') {
    return 'Request timed out. The server may be slow or unreachable.';
  }

  return 'Request failed. Check your URL, headers, and network connection.';
}

/**
 * Truncates text to a maximum length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
function truncate(text, maxLength = 500) {
  if (typeof text !== 'string') {
    text = JSON.stringify(text, null, 2);
  }

  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength) + '...';
}

module.exports = {
  fetchWithRetry,
  isJsonResponse,
  generateHints,
  truncate,
  sleep
};
