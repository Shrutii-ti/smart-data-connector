const request = require('supertest');
const app = require('../../src/index');

describe('POST /api/generate', () => {
  const sampleSchema = {
    url: 'http://api.example.com/orders',
    fields: [
      { name: 'id', type: 'integer', sample: 1 },
      { name: 'customer', type: 'string', sample: 'John Doe' },
      { name: 'amount', type: 'number', sample: 150.00 }
    ],
    samplePath: '$.orders',
    pagination: {
      type: 'page',
      pageParam: 'page',
      limitParam: 'limit'
    },
    headers: {
      Authorization: 'Bearer secret-token-123'
    }
  };

  test('generates full import wrapper by default', async () => {
    const res = await request(app)
      .post('/api/generate')
      .send({ schema: sampleSchema });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('version');
    expect(res.body).toHaveProperty('datasource');
    expect(res.body).toHaveProperty('components');
    expect(res.body.components).toHaveProperty('table');
    expect(res.body.components.table.columns).toHaveLength(3);
  });

  test('sets Content-Disposition header for download', async () => {
    const res = await request(app)
      .post('/api/generate')
      .send({ schema: sampleSchema });

    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.headers['content-disposition']).toContain('filename=');
  });

  test('generates datasource-only format', async () => {
    const res = await request(app)
      .post('/api/generate')
      .send({
        schema: sampleSchema,
        format: 'datasource'
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('datasource');
    expect(res.body).toHaveProperty('fields');
    expect(res.body).toHaveProperty('samplePath');
    expect(res.body).not.toHaveProperty('components');
  });

  test('masks sensitive headers in output', async () => {
    const res = await request(app)
      .post('/api/generate')
      .send({ schema: sampleSchema });

    expect(res.status).toBe(200);
    expect(res.body.datasource.headers.Authorization).toBe('<masked>');
  });

  test('includes pagination in output when present', async () => {
    const res = await request(app)
      .post('/api/generate')
      .send({ schema: sampleSchema });

    expect(res.status).toBe(200);
    expect(res.body.components.pagination).toBeDefined();
    expect(res.body.components.pagination.type).toBe('page');
  });

  test('validates required schema field', async () => {
    const res = await request(app)
      .post('/api/generate')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/schema.*required/i);
  });

  test('validates schema has fields array', async () => {
    const res = await request(app)
      .post('/api/generate')
      .send({
        schema: {
          url: 'http://api.example.com/data'
          // Missing fields array
        }
      });

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.message).toMatch(/fields.*array/i);
  });

  test('accepts custom filename', async () => {
    const customFilename = 'my-datasource.json';
    const res = await request(app)
      .post('/api/generate')
      .send({
        schema: sampleSchema,
        filename: customFilename
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain(customFilename);
  });

  test('handles schema without pagination', async () => {
    const schemaWithoutPagination = {
      ...sampleSchema,
      pagination: null
    };

    const res = await request(app)
      .post('/api/generate')
      .send({ schema: schemaWithoutPagination });

    expect(res.status).toBe(200);
    expect(res.body.components.pagination).toBeUndefined();
  });

  test('generates table columns from all fields', async () => {
    const res = await request(app)
      .post('/api/generate')
      .send({ schema: sampleSchema });

    expect(res.status).toBe(200);
    expect(res.body.components.table.columns).toEqual([
      expect.objectContaining({ name: 'id', key: 'id' }),
      expect.objectContaining({ name: 'customer', key: 'customer' }),
      expect.objectContaining({ name: 'amount', key: 'amount' })
    ]);
  });
});
