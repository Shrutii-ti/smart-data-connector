const request = require('supertest');
const app = require('../../mock-server/app'); // export express app for tests

describe('mock server', () => {
  test('returns paginated orders', async () => {
    const res = await request(app).get('/orders?page=1&limit=10').set('Authorization', 'Bearer demo');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.orders)).toBe(true);
    expect(res.body.meta).toHaveProperty('page', 1);
    expect(res.body.meta).toHaveProperty('per_page', 10);
  });

  test('returns 401 without auth when required', async () => {
    const res = await request(app).get('/orders');
    expect(res.status).toBe(401);
  });
});
