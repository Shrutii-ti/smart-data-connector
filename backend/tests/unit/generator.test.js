const { generateDatasourceJSON, generateImportWrapper, maskSensitiveHeaders } = require('../../src/lib/generator');

describe('Generator', () => {
  describe('maskSensitiveHeaders', () => {
    test('masks Authorization header', () => {
      const headers = { Authorization: 'Bearer secret-token-123' };
      const masked = maskSensitiveHeaders(headers);
      expect(masked.Authorization).toBe('<masked>');
    });

    test('masks API-Key header', () => {
      const headers = { 'API-Key': 'abc123xyz' };
      const masked = maskSensitiveHeaders(headers);
      expect(masked['API-Key']).toBe('<masked>');
    });

    test('preserves non-sensitive headers', () => {
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer token'
      };
      const masked = maskSensitiveHeaders(headers);
      expect(masked['Content-Type']).toBe('application/json');
      expect(masked['Accept']).toBe('application/json');
      expect(masked['Authorization']).toBe('<masked>');
    });

    test('handles empty headers', () => {
      const masked = maskSensitiveHeaders({});
      expect(masked).toEqual({});
    });

    test('is deterministic', () => {
      const headers = { Authorization: 'Bearer token1' };
      const masked1 = maskSensitiveHeaders(headers);
      const masked2 = maskSensitiveHeaders(headers);
      expect(masked1).toEqual(masked2);
      expect(masked1.Authorization).toBe('<masked>');
    });
  });

  describe('generateDatasourceJSON', () => {
    test('generates datasource json with basic schema', () => {
      const input = {
        url: 'http://api.example.com/orders',
        fields: [
          { name: 'id', type: 'integer', sample: 1 },
          { name: 'name', type: 'string', sample: 'Alice' }
        ],
        samplePath: '$.orders',
        pagination: { type: 'page', pageParam: 'page', limitParam: 'limit' },
        headers: { Authorization: 'Bearer secret' }
      };

      const out = generateDatasourceJSON(input);

      expect(out).toHaveProperty('datasource');
      expect(out.datasource).toHaveProperty('name');
      expect(out.datasource).toHaveProperty('type', 'restapi');
      expect(out.datasource).toHaveProperty('url', input.url);
      expect(out).toHaveProperty('fields');
      expect(Array.isArray(out.fields)).toBe(true);
      expect(out.fields).toHaveLength(2);
      expect(out.fields[0]).toMatchObject({ name: 'id', type: 'integer' });
    });

    test('masks sensitive headers in output', () => {
      const input = {
        url: 'http://api.example.com/data',
        fields: [],
        headers: { Authorization: 'Bearer secret-token' }
      };

      const out = generateDatasourceJSON(input);

      expect(out.datasource.headers.Authorization).toBe('<masked>');
    });

    test('includes pagination configuration', () => {
      const input = {
        url: 'http://api.example.com/items',
        fields: [],
        pagination: {
          type: 'page',
          pageParam: 'page',
          limitParam: 'limit',
          metaPaths: { currentPage: 'meta.page', total: 'meta.total' }
        }
      };

      const out = generateDatasourceJSON(input);

      expect(out.pagination).toBeDefined();
      expect(out.pagination.type).toBe('page');
      expect(out.pagination.pageParam).toBe('page');
    });

    test('includes samplePath in output', () => {
      const input = {
        url: 'http://api.example.com/users',
        fields: [],
        samplePath: '$.data.users'
      };

      const out = generateDatasourceJSON(input);

      expect(out.samplePath).toBe('$.data.users');
    });

    test('handles datasource without pagination', () => {
      const input = {
        url: 'http://api.example.com/single',
        fields: [{ name: 'value', type: 'string' }],
        pagination: null
      };

      const out = generateDatasourceJSON(input);

      expect(out.pagination).toBeNull();
    });

    test('includes query parameters in datasource', () => {
      const input = {
        url: 'http://api.example.com/data',
        fields: [],
        queryParams: { status: 'active', type: 'user' }
      };

      const out = generateDatasourceJSON(input);

      expect(out.datasource.queryParams).toEqual({ status: 'active', type: 'user' });
    });
  });

  describe('generateImportWrapper', () => {
    test('generates import wrapper with table bindings', () => {
      const input = {
        url: 'http://api.example.com/orders',
        fields: [
          { name: 'id', type: 'integer' },
          { name: 'customer', type: 'string' },
          { name: 'amount', type: 'number' }
        ],
        samplePath: '$.orders',
        pagination: { type: 'page' }
      };

      const wrapper = generateImportWrapper(input);

      expect(wrapper).toHaveProperty('version');
      expect(wrapper).toHaveProperty('datasource');
      expect(wrapper).toHaveProperty('components');
      expect(wrapper.components).toHaveProperty('table');
      expect(wrapper.components.table).toHaveProperty('columns');
      expect(wrapper.components.table.columns).toHaveLength(3);
    });

    test('includes pagination controls when pagination present', () => {
      const input = {
        url: 'http://api.example.com/data',
        fields: [{ name: 'id', type: 'integer' }],
        pagination: {
          type: 'page',
          pageParam: 'page',
          limitParam: 'limit'
        }
      };

      const wrapper = generateImportWrapper(input);

      expect(wrapper.components).toHaveProperty('pagination');
      expect(wrapper.components.pagination).toHaveProperty('pageParam', 'page');
      expect(wrapper.components.pagination).toHaveProperty('limitParam', 'limit');
    });

    test('generates table columns from fields', () => {
      const input = {
        url: 'http://api.example.com/users',
        fields: [
          { name: 'id', type: 'integer', sample: 1 },
          { name: 'email', type: 'string', sample: 'user@example.com' },
          { name: 'active', type: 'boolean', sample: true }
        ]
      };

      const wrapper = generateImportWrapper(input);

      expect(wrapper.components.table.columns).toEqual([
        expect.objectContaining({ name: 'id', key: 'id' }),
        expect.objectContaining({ name: 'email', key: 'email' }),
        expect.objectContaining({ name: 'active', key: 'active' })
      ]);
    });

    test('includes datasource binding', () => {
      const input = {
        url: 'http://api.example.com/products',
        fields: [{ name: 'name', type: 'string' }],
        samplePath: '$.products'
      };

      const wrapper = generateImportWrapper(input);

      expect(wrapper.components.table).toHaveProperty('dataBinding');
      expect(wrapper.components.table.dataBinding).toContain('datasource');
    });
  });
});
