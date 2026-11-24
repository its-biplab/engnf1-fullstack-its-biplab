const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { Ticket, TicketEvent, User } = require('../src/db');
const app = require('../src/index');

async function runTicketDetailTests() {
  console.log('--- Starting GET /api/tickets/:id Tests ---');

  const sampleTicketId = new mongoose.Types.ObjectId();
  const sampleTicket = new Ticket({
    _id: sampleTicketId,
    externalId: 'TCK-DETAIL-1',
    subject: 'Server memory leak in worker process',
    body: 'Memory consumption exceeds 95% after 2 hours of runtime.',
    autoCategory: 'BUG',
    category: 'BUG',
    priority: 'URGENT',
    status: 'IN_PROGRESS',
    isHumanOverride: false,
    isReviewed: true,
    createdAt: new Date('2026-02-01T10:00:00Z'),
    updatedAt: new Date('2026-02-01T12:00:00Z'),
  });

  const sampleEvents = [
    new TicketEvent({
      _id: new mongoose.Types.ObjectId(),
      ticketId: sampleTicketId,
      field: 'status',
      oldValue: 'OPEN',
      newValue: 'IN_PROGRESS',
      actor: 'agent@support.com',
      createdAt: new Date('2026-02-01T11:00:00Z'),
    }),
    new TicketEvent({
      _id: new mongoose.Types.ObjectId(),
      ticketId: sampleTicketId,
      field: 'priority',
      oldValue: 'HIGH',
      newValue: 'URGENT',
      actor: 'ops-lead@company.com',
      createdAt: new Date('2026-02-01T12:00:00Z'),
    }),
  ];

  const testUser = { _id: 'test_user_detail_id', role: 'USER' };

  const originalTicketFindById = Ticket.findById;
  const originalTicketEventFind = TicketEvent.find;
  const originalUserFindById = User.findById;

  Ticket.findById = async function (id) {
    if (id && id.toString() === sampleTicketId.toString()) {
      return sampleTicket;
    }
    return null;
  };

  TicketEvent.find = function (filter) {
    let list = sampleEvents.filter(
      (e) => e.ticketId.toString() === (filter.ticketId ? filter.ticketId.toString() : '')
    );
    const queryObj = {
      sort: function () {
        // Sort descending by createdAt
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return queryObj;
      },
      then: function (resolve) {
        resolve(list);
      },
    };
    return queryObj;
  };

  User.findById = async function () {
    return testUser;
  };

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5127, resolve));

  const validToken = jwt.sign(
    { id: 'test_user_detail_id', role: 'USER' },
    process.env.JWT_SECRET || 'triage_sync_jwt_secret_dev',
    { expiresIn: '24h' }
  );

  async function getTicketDetail(id, token = validToken) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const url = `http://localhost:5127/api/tickets/${id}`;
    const res = await fetch(url, { headers });
    const json = await res.json();
    return { status: res.status, body: json };
  }

  try {
    // 1. Unauthenticated request
    console.log('1. Testing unauthenticated GET /api/tickets/:id...');
    let res = await getTicketDetail(sampleTicketId.toString(), null);
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'UNAUTHENTICATED');

    // 2. Malformed / invalid ObjectId format
    console.log('2. Testing invalid / malformed :id handling (cast error prevention)...');
    res = await getTicketDetail('invalid-mongo-id-123');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error.code, 'NOT_FOUND');
    assert.strictEqual(res.body.error.message, 'Ticket not found');

    // 3. Nonexistent valid ObjectId
    console.log('3. Testing nonexistent valid ObjectId...');
    const fakeId = new mongoose.Types.ObjectId().toString();
    res = await getTicketDetail(fakeId);
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error.code, 'NOT_FOUND');
    assert.strictEqual(res.body.error.message, 'Ticket not found');

    // 4. Successful retrieval with audit trail
    console.log('4. Testing successful ticket retrieval with audit events...');
    res = await getTicketDetail(sampleTicketId.toString());
    assert.strictEqual(res.status, 200);

    // Verify ticket fields
    assert(res.body.ticket, 'res.body.ticket must exist');
    assert.strictEqual(res.body.ticket.id, sampleTicketId.toString());
    assert.strictEqual(res.body.ticket.externalId, 'TCK-DETAIL-1');
    assert.strictEqual(res.body.ticket.subject, 'Server memory leak in worker process');
    assert.strictEqual(res.body.ticket.category, 'BUG');
    assert.strictEqual(res.body.ticket.priority, 'URGENT');
    assert.strictEqual(res.body.ticket.status, 'IN_PROGRESS');
    assert.strictEqual(res.body.ticket._id, undefined, '_id should not be leaked');
    assert.strictEqual(res.body.ticket.__v, undefined, '__v should not be leaked');

    // Verify events list
    assert(Array.isArray(res.body.events), 'res.body.events must be an array');
    assert.strictEqual(res.body.events.length, 2);

    // Verify events ordering: newest first (12:00:00Z should precede 11:00:00Z)
    const firstEvent = res.body.events[0];
    const secondEvent = res.body.events[1];
    assert.strictEqual(firstEvent.field, 'priority');
    assert.strictEqual(firstEvent.oldValue, 'HIGH');
    assert.strictEqual(firstEvent.newValue, 'URGENT');
    assert.strictEqual(firstEvent.actor, 'ops-lead@company.com');
    assert.strictEqual(firstEvent._id, undefined);

    assert.strictEqual(secondEvent.field, 'status');
    assert.strictEqual(secondEvent.oldValue, 'OPEN');
    assert.strictEqual(secondEvent.newValue, 'IN_PROGRESS');
    assert.strictEqual(secondEvent.actor, 'agent@support.com');
    assert.strictEqual(secondEvent._id, undefined);

    console.log('\n>>> ALL GET /api/tickets/:id TESTS PASSED! <<<');
  } finally {
    Ticket.findById = originalTicketFindById;
    TicketEvent.find = originalTicketEventFind;
    User.findById = originalUserFindById;
    server.close();
  }
}

runTicketDetailTests().catch((err) => {
  console.error('Ticket detail tests failed:', err);
  process.exit(1);
});
