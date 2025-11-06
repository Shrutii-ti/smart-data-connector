const { inferSchema, findArrayPath, inferFields, detectPagination } = require('../../src/lib/schema');

describe('Schema Inference', () => {
  describe('findArrayPath', () => {
    test('returns null for top-level array', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const result = findArrayPath(data);
      expect(result).toBeNull();
    });

    test('finds array at top level property', () => {
      const data = { orders: [{ id: 1 }, { id: 2 }] };
      const result = findArrayPath(data);
      expect(result).toBe('orders');
    });

    test('finds first array in object with multiple arrays', () => {
      const data = {
        meta: { total: 100 },
        orders: [{ id: 1 }],
        users: [{ id: 2 }]
      };
      const result = findArrayPath(data);
      expect(result).toBe('orders');
    });

    test('returns null when no array found', () => {
      const data = { meta: { total: 100 }, status: 'ok' };
      const result = findArrayPath(data);
      expect(result).toBeNull();
    });
  });

  describe('inferFields', () => {
    test('infers basic types correctly', () => {
      const sample = {
        id: 1,
        name: 'Test',
        amount: 10.5,
        active: true,
        data: null
      };
      const fields = inferFields(sample);

      expect(fields).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'id', type: 'integer' }),
        expect.objectContaining({ name: 'name', type: 'string' }),
        expect.objectContaining({ name: 'amount', type: 'number' }),
        expect.objectContaining({ name: 'active', type: 'boolean' }),
        expect.objectContaining({ name: 'data', type: 'null' })
      ]));
    });

    test('includes sample values', () => {
      const sample = { id: 42, name: 'Alice' };
      const fields = inferFields(sample);

      const idField = fields.find(f => f.name === 'id');
      const nameField = fields.find(f => f.name === 'name');

      expect(idField.sample).toBe(42);
      expect(nameField.sample).toBe('Alice');
    });

    test('detects nested objects', () => {
      const sample = {
        id: 1,
        address: { city: 'NYC', zip: '10001' }
      };
      const fields = inferFields(sample);

      expect(fields).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'address', type: 'object' })
      ]));
    });

    test('detects arrays', () => {
      const sample = {
        id: 1,
        tags: ['a', 'b', 'c']
      };
      const fields = inferFields(sample);

      expect(fields).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'tags', type: 'array' })
      ]));
    });
  });

  describe('detectPagination', () => {
    test('detects page-based pagination from meta', () => {
      const data = {
        orders: [{ id: 1 }],
        meta: { page: 1, per_page: 10, total: 100 }
      };
      const pagination = detectPagination(data);

      expect(pagination.type).toBe('page');
      expect(pagination.pageParam).toBe('page');
      expect(pagination.limitParam).toBe('limit');
      expect(pagination.metaPaths).toMatchObject({
        currentPage: 'meta.page',
        perPage: 'meta.per_page',
        total: 'meta.total'
      });
    });

    test('detects pagination with different naming conventions', () => {
      const data = {
        data: [{ id: 1 }],
        pagination: { current_page: 1, page_size: 20, total_count: 200 }
      };
      const pagination = detectPagination(data);

      expect(pagination.type).toBe('page');
      expect(pagination.metaPaths).toMatchObject({
        currentPage: 'pagination.current_page',
        perPage: 'pagination.page_size',
        total: 'pagination.total_count'
      });
    });

    test('returns null when no pagination detected', () => {
      const data = { orders: [{ id: 1 }] };
      const pagination = detectPagination(data);

      expect(pagination).toBeNull();
    });

    test('detects offset-based pagination', () => {
      const data = {
        items: [{ id: 1 }],
        meta: { offset: 0, limit: 10, total: 100 }
      };
      const pagination = detectPagination(data);

      expect(pagination.type).toBe('offset');
      expect(pagination.offsetParam).toBe('offset');
      expect(pagination.limitParam).toBe('limit');
    });
  });

  describe('inferSchema', () => {
    test('infers schema from wrapped orders', () => {
      const data = {
        orders: [{ id: 1, amount: 10.5, name: 'A' }],
        meta: { page: 1, per_page: 10, total: 100 }
      };
      const res = inferSchema(data);

      expect(res.samplePath).toBe('$.orders');
      expect(res.fields).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'id', type: 'integer' }),
        expect.objectContaining({ name: 'amount', type: 'number' }),
        expect.objectContaining({ name: 'name', type: 'string' })
      ]));
      expect(res.pagination.type).toBe('page');
    });

    test('infers schema from top-level array', () => {
      const data = [
        { id: 1, name: 'Alice', score: 95.5 },
        { id: 2, name: 'Bob', score: 87.3 }
      ];
      const res = inferSchema(data);

      expect(res.samplePath).toBe('$');
      expect(res.fields).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'id', type: 'integer' }),
        expect.objectContaining({ name: 'name', type: 'string' }),
        expect.objectContaining({ name: 'score', type: 'number' })
      ]));
    });

    test('handles inconsistent types with union', () => {
      const data = [
        { id: 1, value: 'string' },
        { id: 2, value: 42 },
        { id: 3, value: true }
      ];
      const res = inferSchema(data);

      const valueField = res.fields.find(f => f.name === 'value');
      expect(valueField.type).toMatch(/string|number|boolean/);
    });

    test('returns null for empty data', () => {
      const res = inferSchema([]);
      expect(res).toBeNull();
    });

    test('returns null for invalid data', () => {
      const res = inferSchema(null);
      expect(res).toBeNull();
    });
  });
});
