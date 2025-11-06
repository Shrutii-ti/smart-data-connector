const request = require('supertest');
const app = require('../../src/index'); // your express app

describe('POST /api/test', () => {
  test('returns schema when API call succeeds with valid auth', async () => {
    const res = await request(app)
      .post('/api/test')
      .send({
        url: 'http://localhost:3001/orders?page=1&limit=10',
        headers: { Authorization: 'Bearer demo' }
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.fields).toBeDefined();
    expect(Array.isArray(res.body.fields)).toBe(true);
    expect(res.body.samplePath).toBe('$.orders');
    expect(res.body.pagination).toBeDefined();
  });

  test('returns error when auth fails (401)', async () => {
    const res = await request(app)
      .post('/api/test')
      .send({
        url: 'http://localhost:3001/orders',
        headers: {} // No auth header
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(false);
    expect(res.body.status).toBe(401);
    expect(res.body.message).toContain('401');
    expect(res.body.hints).toBeDefined();
    expect(res.body.hints.toLowerCase()).toContain('auth');
  });

  test('returns error for non-JSON response with paste sample suggestion', async () => {
    // Mock server will be modified to return HTML on a specific endpoint
    const res = await request(app)
      .post('/api/test')
      .send({
        url: 'http://localhost:3001/html',
        headers: { Authorization: 'Bearer demo' }
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/non-json|json/i);
    expect(res.body.hints).toBeDefined();
    expect(res.body.hints.toLowerCase()).toMatch(/paste.*sample|sample.*json/i);
  });

  test('returns error when URL is unreachable', async () => {
    const res = await request(app)
      .post('/api/test')
      .send({
        url: 'http://localhost:9999/nonexistent',
        headers: {}
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/connect|reach|network/i);
  });

  test('validates required url field', async () => {
    const res = await request(app)
      .post('/api/test')
      .send({
        headers: {}
      });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/url.*required/i);
  });

  test('includes raw response snippet on error', async () => {
    const res = await request(app)
      .post('/api/test')
      .send({
        url: 'http://localhost:3001/orders',
        headers: {} // Will get 401
      });

    expect(res.body.ok).toBe(false);
    expect(res.body.rawSnippet).toBeDefined();
    expect(typeof res.body.rawSnippet).toBe('string');
  });

  test('handles query parameters correctly', async () => {
    const res = await request(app)
      .post('/api/test')
      .send({
        url: 'http://localhost:3001/orders',
        queryParams: { page: 2, limit: 5 },
        headers: { Authorization: 'Bearer demo' }
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.fields).toBeDefined();
  });
});

describe('POST /api/test-sample', () => {
  test('infers schema from pasted sample JSON (array)', async () => {
    const sampleData = [
      { id: 1, name: 'John', age: 30 },
      { id: 2, name: 'Jane', age: 25 }
    ];

    const res = await request(app)
      .post('/api/test-sample')
      .send({
        sample: JSON.stringify(sampleData)
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.fields).toBeDefined();
    expect(Array.isArray(res.body.fields)).toBe(true);
    expect(res.body.fields.length).toBe(3); // id, name, age
    expect(res.body.samplePath).toBe('$');
  });

  test('infers schema from pasted sample JSON (nested object with array)', async () => {
    const sampleData = {
      data: [
        { productId: 'P1', price: 99.99, inStock: true },
        { productId: 'P2', price: 149.99, inStock: false }
      ]
    };

    const res = await request(app)
      .post('/api/test-sample')
      .send({
        sample: JSON.stringify(sampleData)
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.fields).toBeDefined();
    expect(res.body.samplePath).toBe('$.data');
    expect(res.body.fields.some(f => f.name === 'productId')).toBe(true);
    expect(res.body.fields.some(f => f.name === 'price')).toBe(true);
  });

  test('returns error when sample is not valid JSON', async () => {
    const res = await request(app)
      .post('/api/test-sample')
      .send({
        sample: 'not valid json {'
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/invalid.*json|parse/i);
  });

  test('returns error when sample is empty', async () => {
    const res = await request(app)
      .post('/api/test-sample')
      .send({
        sample: ''
      });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/sample.*required/i);
  });

  test('returns error when sample does not contain array data', async () => {
    const sampleData = { message: 'Hello world' };

    const res = await request(app)
      .post('/api/test-sample')
      .send({
        sample: JSON.stringify(sampleData)
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/array|infer/i);
  });

  test('validates sample field is provided', async () => {
    const res = await request(app)
      .post('/api/test-sample')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/sample.*required/i);
  });
});
