1/**
 * Test route for API connection testing
 */
const express = require('express');
const { fetchWithRetry, isJsonResponse, generateHints, truncate } = require('../lib/fetcher');
const { inferSchema } = require('../lib/schema');
const { generateImportWrapper, generateFilename } = require('../lib/generator');
const { saveApiTest } = require('../controllers/apiTestController');
const { saveDatasource } = require('../controllers/datasourceController');

const router = express.Router();

/**
 * POST /api/test
 * Tests an API endpoint and returns schema information or error details
 */
router.post('/test', async (req, res) => {
  const { url, headers = {}, queryParams = {} } = req.body;

  // Validate required fields
  if (!url) {
    return res.status(400).json({
      ok: false,
      message: 'URL is required'
    });
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (error) {
    return res.status(400).json({
      ok: false,
      message: 'Invalid URL format'
    });
  }

  try {
    const startTime = Date.now();

    // Fetch data with retry
    const response = await fetchWithRetry({
      url,
      headers,
      queryParams,
      maxRetries: 2,
      initialDelay: 500,
      timeout: 10000
    });

    const responseTime = Date.now() - startTime;

    // Handle network errors
    if (!response.success && response.status === 0) {
      // Save failed test to database
      await saveApiTest({
        url,
        headers,
        queryParams,
        success: false,
        status: 0,
        responseTime,
        errorMessage: response.error
      });

      return res.status(200).json({
        ok: false,
        message: `Network error: ${response.error}`,
        hints: generateHints(0, response.errorType),
        errorType: response.errorType
      });
    }

    // Check if response is successful (2xx)
    if (response.status >= 200 && response.status < 300) {
      // Check if response is JSON
      if (!isJsonResponse(response.data, response.headers)) {
        return res.status(200).json({
          ok: false,
          message: 'Non-JSON response received',
          status: response.status,
          contentType: response.headers['content-type'],
          rawSnippet: truncate(response.data, 500),
          hints: 'The API returned non-JSON data. Try pasting a sample JSON response manually to continue.'
        });
      }

      // Infer schema
      const schema = inferSchema(response.data, response.headers);

      if (!schema) {
        return res.status(200).json({
          ok: false,
          message: 'Could not infer schema from response',
          status: response.status,
          rawSnippet: truncate(response.data, 500),
          hints: 'The response may be empty or not contain array data.'
        });
      }

      // Save successful test to database
      await saveApiTest({
        url,
        headers,
        queryParams,
        success: true,
        status: response.status,
        responseTime,
        samplePath: schema.samplePath,
        fields: schema.fields,
        pagination: schema.pagination
      });

      // Success - return schema
      return res.status(200).json({
        ok: true,
        status: response.status,
        samplePath: schema.samplePath,
        fields: schema.fields,
        pagination: schema.pagination,
        sample: truncate(JSON.stringify(response.data), 1000)
      });
    } else {
      // Save failed test to database
      await saveApiTest({
        url,
        headers,
        queryParams,
        success: false,
        status: response.status,
        responseTime,
        errorMessage: `HTTP ${response.status}: ${response.statusText || 'Request failed'}`
      });

      // Non-2xx status code
      return res.status(200).json({
        ok: false,
        status: response.status,
        message: `HTTP ${response.status}: ${response.statusText || 'Request failed'}`,
        hints: generateHints(response.status),
        rawSnippet: truncate(response.data, 500)
      });
    }
  } catch (error) {
    // Unexpected error
    return res.status(500).json({
      ok: false,
      message: `Unexpected error: ${error.message}`,
      hints: 'An unexpected error occurred while testing the API.'
    });
  }
});

/**
 * POST /api/test-sample
 * Tests schema inference from pasted sample JSON
 */
router.post('/test-sample', async (req, res) => {
  const { sample } = req.body;

  // Validate required fields
  if (!sample || sample.trim() === '') {
    return res.status(400).json({
      ok: false,
      message: 'Sample JSON is required'
    });
  }

  try {
    // Parse the sample JSON
    let parsedSample;
    try {
      parsedSample = JSON.parse(sample);
    } catch (parseError) {
      return res.status(200).json({
        ok: false,
        message: 'Invalid JSON: Could not parse the sample data',
        hints: 'Please ensure the pasted data is valid JSON format.'
      });
    }

    // Infer schema from the sample
    const schema = inferSchema(parsedSample, {});

    if (!schema) {
      return res.status(200).json({
        ok: false,
        message: 'Could not infer schema from sample',
        hints: 'The sample data may be empty or not contain array data. Please provide a sample with an array of objects.'
      });
    }

    // Success - return schema
    return res.status(200).json({
      ok: true,
      samplePath: schema.samplePath,
      fields: schema.fields,
      pagination: schema.pagination,
      sample: truncate(JSON.stringify(parsedSample), 1000),
      source: 'pasted-sample'
    });
  } catch (error) {
    // Unexpected error
    return res.status(500).json({
      ok: false,
      message: `Unexpected error: ${error.message}`,
      hints: 'An unexpected error occurred while processing the sample.'
    });
  }
});

/**
 * POST /api/generate
 * Generates a downloadable ToolJet datasource JSON from schema
 */
router.post('/generate', async (req, res) => {
  const { schema, format = 'full', filename } = req.body;

  // Validate schema input
  if (!schema) {
    return res.status(400).json({
      ok: false,
      message: 'Schema is required'
    });
  }

  // Validate schema has required fields
  if (!schema.fields || !Array.isArray(schema.fields)) {
    return res.status(400).json({
      ok: false,
      message: 'Schema must include fields array'
    });
  }

  try {
    let output;

    if (format === 'datasource') {
      // Generate datasource JSON only
      const { generateDatasourceJSON } = require('../lib/generator');
      output = generateDatasourceJSON(schema);
    } else {
      // Generate full import wrapper (default)
      output = generateImportWrapper(schema);
    }

    // Save datasource to database
    await saveDatasource({
      name: schema.url ? `Datasource for ${schema.url}` : 'API Datasource',
      url: schema.url || 'unknown',
      description: `Generated from ${schema.fields?.length || 0} fields`,
      config: output,
      samplePath: schema.samplePath || '$',
      fieldCount: schema.fields?.length || 0,
      hasPagination: !!schema.pagination
    });

    // Generate filename
    const downloadFilename = filename || generateFilename(schema);

    // Set headers for download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);

    // Return JSON
    return res.status(200).json(output);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: `Failed to generate datasource: ${error.message}`
    });
  }
});

module.exports = router;
