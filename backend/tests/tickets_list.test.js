const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Ticket, User } = require('../src/db');
const app = require('../src/index');

async function runTicketsListTests() {
  console.log('--- Starting GET /api/tickets Tests ---');

  // Seed sample tickets in mock array
  const mockTickets = [
    new Ticket({
      externalId: 'TCK-1',
      subject: 'Billing question about invoice #100',
      body: 'Can I get a refund on charge #100?',
      autoCategory: 'BILLING',
      category: 'BILLING',
      priority: 'HIGH',
      status: 'OPEN',
      createdAt: new Date('2026-01-01T10:00:00Z'),
    }),
    new Ticket({
      externalId: 'TCK-2',
      subject: 'Login password issue',
      body: 'Locked out of account, 2fa failed.',
      autoCategory: 'LOGIN',
      category: 'LOGIN',
      priority: 'URGENT',
      status: 'OPEN',
      createdAt: new Date('2026-01-02T10:00:00Z'),
    }),
    new Ticket({
      externalId: 'TCK-3',
      subject: 'Package delivery tracking [v1.0]',
      body: 'My package has not arrived. Details: 100% delayed (urgent).',
      autoCategory: 'DELIVERY',
      category: 'DELIVERY',
      priority: 'HIGH',
      status: 'RESOLVED',
      createdAt: new Date('2026-01-03T10:00:00Z'),
    }),
    new Ticket({
      externalId: 'TCK-4',
      subject: 'App crash with 500 error <script>alert(1)</script>',
      body: 'Unhandled exception on endpoint /api/users. Crash report attached.',
      autoCategory: 'BUG',
      category: 'BUG',
      priority: 'URGENT',
      status: 'IN_PROGRESS',
      createdAt: new Date('2026-01-04T10:00:00Z'),
    }),
  ];

  const testUser = { _id: 'test_user_list_id', role: 'USER' };

  const originalFind = Ticket.find;
  const originalCountDocuments = Ticket.countDocuments;
  const originalUserFindById = User.findById;

  Ticket.find = function (filter) {
    let list = mockTickets.filter((item) => {
      if (filter.status && item.status !== filter.status) return false;
      if (filter.category && item.category !== filter.category) return false;
      if (filter.priority && item.priority !== filter.priority) return false;
      if (filter.$or) {
        const matchesOr = filter.$or.some((condition) => {
          if (condition.subject && condition.subject.$regex) {
            const re = new RegExp(condition.subject.$regex, condition.subject.$options || 'i');
            if (re.test(item.subject)) return true;
          }
          if (condition.body && condition.body.$regex) {
            const re = new RegExp(condition.body.$regex, condition.body.$options || 'i');
            if (re.test(item.body)) return true;
          }
          return false;
        });
        if (!matchesOr) return false;
      }
      return true;
    });

    let skipCount = 0;
    let limitCount = list.length;

    const queryObj = {
      sort: function () {
        return queryObj;
      },
      skip: function (n) {
        skipCount = n;
        return queryObj;
      },
      limit: function (n) {
        limitCount = n;
        return queryObj;
      },
      then: function (resolve) {
        const sliced = list.slice(skipCount, skipCount + limitCount);
        resolve(sliced);
      },
    };
    return queryObj;
  };

  Ticket.countDocuments = async function (filter) {
    const list = mockTickets.filter((item) => {
      if (filter.status && item.status !== filter.status) return false;
      if (filter.category && item.category !== filter.category) return false;
      if (filter.priority && item.priority !== filter.priority) return false;
      if (filter.$or) {
        const matchesOr = filter.$or.some((condition) => {
          if (condition.subject && condition.subject.$regex) {
            const re = new RegExp(condition.subject.$regex, condition.subject.$options || 'i');
            if (re.test(item.subject)) return true;
          }
          if (condition.body && condition.body.$regex) {
            const re = new RegExp(condition.body.$regex, condition.body.$options || 'i');
            if (re.test(item.body)) return true;
          }
          return false;
        });
        if (!matchesOr) return false;
      }
      return true;
    });
    return list.length;
  };

  User.findById = async function () {
    return testUser;
  };

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5126, resolve));

  const validToken = jwt.sign(
    { id: 'test_user_list_id', role: 'USER' },
    process.env.JWT_SECRET || 'triage_sync_jwt_secret_dev',
    { expiresIn: '24h' }
  );

  async function getTicketsApi(queryString = '', token = validToken) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const url = `http://localhost:5126/api/tickets${queryString ? '?' + queryString : ''}`;
    const res = await fetch(url, { headers });
    const json = await res.json();
    return { status: res.status, body: json };
  }

  try {
    // 1. Unauthenticated request
    console.log('1. Testing unauthenticated GET /api/tickets...');
    let res = await getTicketsApi('', null);
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'UNAUTHENTICATED');

    // 2. Default pagination and listing
    console.log('2. Testing default listing and pagination structure...');
    res = await getTicketsApi('');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.body.data), 'res.body.data must be an array');
    assert.strictEqual(res.body.page, 1);
    assert.strictEqual(res.body.pageSize, 10);
    assert.strictEqual(res.body.total, 4);
    assert.strictEqual(res.body.totalPages, 1);
    assert.strictEqual(res.body.data.length, 4);

    // 3. Validation error on invalid status
    console.log('3. Testing invalid status validation...');
    res = await getTicketsApi('status=INVALID_STATUS');
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');

    // 4. Validation error on invalid category
    console.log('4. Testing invalid category validation...');
    res = await getTicketsApi('category=UNKNOWN');
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');

    // 5. Validation error on invalid priority
    console.log('5. Testing invalid priority validation...');
    res = await getTicketsApi('priority=CRITICAL');
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');

    // 6. Validation error on invalid pagination
    console.log('6. Testing invalid pagination parameters...');
    res = await getTicketsApi('page=0');
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');

    res = await getTicketsApi('limit=500'); // exceeded max 100
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');

    // 7. Filtering by status
    console.log('7. Testing filtering by status=OPEN...');
    res = await getTicketsApi('status=OPEN');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.total, 2);
    assert(res.body.data.every((t) => t.status === 'OPEN'));

    // 8. Injection-safe search T-B4 with special regex characters
    console.log('8. Testing injection-safe q search with special regex characters (T-B4)...');
    // Searching for [v1.0] which contains [, ], ., and would fail or throw syntax error if unescaped
    res = await getTicketsApi('q=' + encodeURIComponent('[v1.0]'));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.total, 1);
    assert.strictEqual(res.body.data[0].externalId, 'TCK-3');

    // Searching with quotes, slashes, percent, script tag
    res = await getTicketsApi('q=' + encodeURIComponent('<script>'));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.total, 1);
    assert.strictEqual(res.body.data[0].externalId, 'TCK-4');

    // Searching for "100% delayed"
    res = await getTicketsApi('q=' + encodeURIComponent('100% delayed'));
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.total, 1);
    assert.strictEqual(res.body.data[0].externalId, 'TCK-3');

    // 9. Combined filtering: category=BILLING and status=OPEN
    console.log('9. Testing combined filtering (status + category)...');
    res = await getTicketsApi('category=BILLING&status=OPEN');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.total, 1);
    assert.strictEqual(res.body.data[0].externalId, 'TCK-1');

    // 10. Pagination with limit=2
    console.log('10. Testing pagination limit=2...');
    res = await getTicketsApi('page=1&limit=2');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.length, 2);
    assert.strictEqual(res.body.pageSize, 2);
    assert.strictEqual(res.body.total, 4);
    assert.strictEqual(res.body.totalPages, 2);

    console.log('\n>>> ALL GET /api/tickets TESTS PASSED! <<<');
  } finally {
    Ticket.find = originalFind;
    Ticket.countDocuments = originalCountDocuments;
    User.findById = originalUserFindById;
    server.close();
  }
}

runTicketsListTests().catch((err) => {
  console.error('Tickets list tests failed:', err);
  process.exit(1);
});
