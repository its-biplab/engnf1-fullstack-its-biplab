const assert = require('assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Ticket, User } = require('../src/db');
const { classifyTicket } = require('../src/utils/classifier');
const app = require('../src/index');

async function runImportTests() {
  console.log('--- Starting Ticket Import & Auto-Triage Tests ---');

  // 1. Test deterministic classifier logic (T-B1)
  console.log('1. Testing deterministic classifier rules...');
  // Delivery edge case
  const deliveryTicket = classifyTicket('Delivery Issue', 'My package has not arrived yet.');
  assert.strictEqual(deliveryTicket.category, 'DELIVERY');
  assert.strictEqual(deliveryTicket.priority, 'HIGH');

  // Billing refund edge case
  const refundTicket = classifyTicket('Refund Request', 'Please process a refund for my last invoice.');
  assert.strictEqual(refundTicket.category, 'BILLING');
  assert.strictEqual(refundTicket.priority, 'HIGH');

  // Urgent locked out edge case
  const lockedOutTicket = classifyTicket('Help', 'I am locked out due to 2FA failure.');
  assert.strictEqual(lockedOutTicket.category, 'LOGIN');
  assert.strictEqual(lockedOutTicket.priority, 'URGENT');

  // Production down bug
  const prodDownTicket = classifyTicket('System Crash', 'Production down with 500 error exception.');
  assert.strictEqual(prodDownTicket.category, 'BUG');
  assert.strictEqual(prodDownTicket.priority, 'URGENT');

  // Feature request
  const featureTicket = classifyTicket('Dark Mode', 'Please consider adding a dark mode theme.');
  assert.strictEqual(featureTicket.category, 'FEATURE_REQUEST');
  assert.strictEqual(featureTicket.priority, 'MEDIUM');

  // 2. Set up in-memory mock storage for Ticket and User models
  const mockTickets = [];
  const testUser = { _id: 'user_import_test_id', role: 'USER' };

  const originalTicketFindOne = Ticket.findOne;
  const originalTicketCreate = Ticket.create;
  const originalTicketFind = Ticket.find;
  const originalUserFindById = User.findById;

  Ticket.findOne = async function (filter) {
    if (filter && filter.externalId) {
      const found = mockTickets.find((t) => t.externalId === filter.externalId);
      return found || null;
    }
    return null;
  };

  Ticket.create = async function (data) {
    const doc = new Ticket(data);
    doc.save = async function () {
      return doc;
    };
    mockTickets.push(doc);
    return doc;
  };

  Ticket.find = function () {
    return {
      sort: () => mockTickets,
    };
  };

  User.findById = async function () {
    return testUser;
  };

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5125, resolve));

  const importUrl = 'http://localhost:5125/api/tickets/import';
  const validToken = jwt.sign(
    { id: 'user_import_test_id', role: 'USER' },
    process.env.JWT_SECRET || 'triage_sync_jwt_secret_dev',
    { expiresIn: '24h' }
  );

  async function postImport(body, token = validToken) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(importUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return { status: res.status, body: json };
  }

  try {
    // 3. Test unauthenticated import
    console.log('2. Testing unauthenticated import rejection...');
    let res = await postImport({ tickets: [] }, null);
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'UNAUTHENTICATED');

    // 4. Test validation: missing tickets array
    console.log('3. Testing missing tickets array validation...');
    res = await postImport({});
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');

    // 5. Test validation: invalid item in tickets
    console.log('4. Testing invalid ticket item validation...');
    res = await postImport({
      tickets: [{ externalId: 'T-1', subject: 'Hi', body: 'Too short subject' }],
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');

    // 6. Test initial import of new tickets (T-B1)
    console.log('5. Testing initial batch import (T-B1)...');
    res = await postImport({
      tickets: [
        {
          externalId: 'FEED-001',
          subject: 'Delivery delayed',
          body: 'My package has not arrived yet, please update tracking.',
        },
        {
          externalId: 'FEED-002',
          subject: 'Invoice incorrect',
          body: 'Please issue a refund for the duplicate charge on my card.',
        },
      ],
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.importedCount, 2);
    assert.strictEqual(res.body.updatedCount, 0);
    assert.strictEqual(res.body.skippedOverrideCount, 0);
    assert.strictEqual(res.body.total, 2);

    // Verify created tickets
    const t1 = mockTickets.find((t) => t.externalId === 'FEED-001');
    assert.strictEqual(t1.autoCategory, 'DELIVERY');
    assert.strictEqual(t1.category, 'DELIVERY');
    assert.strictEqual(t1.priority, 'HIGH');
    assert.strictEqual(t1.isHumanOverride, false);

    const t2 = mockTickets.find((t) => t.externalId === 'FEED-002');
    assert.strictEqual(t2.autoCategory, 'BILLING');
    assert.strictEqual(t2.category, 'BILLING');
    assert.strictEqual(t2.priority, 'HIGH');

    // 7. Test normalization of externalld typo
    console.log('6. Testing externalld typo normalization...');
    res = await postImport({
      tickets: [
        {
          externalld: 'FEED-003', // typo with lowercase L
          subject: 'Login blocked',
          body: 'I am locked out and need password reset.',
        },
      ],
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.importedCount, 1);
    const t3 = mockTickets.find((t) => t.externalId === 'FEED-003');
    assert(t3, 'Ticket with externalld typo should be normalized to externalId');
    assert.strictEqual(t3.category, 'LOGIN');
    assert.strictEqual(t3.priority, 'URGENT');

    // 8. Test idempotent re-import without human override (T-B2)
    console.log('7. Testing idempotent re-import without override (T-B2)...');
    res = await postImport({
      tickets: [
        {
          externalId: 'FEED-001',
          subject: 'Payment dispute',
          body: 'Actually this is an invoice charge dispute, not delivery.',
        },
      ],
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.importedCount, 0);
    assert.strictEqual(res.body.updatedCount, 1);
    assert.strictEqual(res.body.skippedOverrideCount, 0);

    // Verify autoCategory was preserved while category updated
    assert.strictEqual(t1.autoCategory, 'DELIVERY', 'autoCategory must remain immutable');
    assert.strictEqual(t1.category, 'BILLING', 'category should update to new classification');

    // 9. Test idempotent re-import WITH human override protection (T-B2)
    console.log('8. Testing human-override protection (T-B2)...');
    // Human triager manually sets FEED-001 category to BUG and sets isHumanOverride = true
    t1.category = 'BUG';
    t1.isHumanOverride = true;

    // Feed re-imports FEED-001 with invoice/billing text
    res = await postImport({
      tickets: [
        {
          externalId: 'FEED-001',
          subject: 'Invoice charge update',
          body: 'Refund requested for another invoice charge.',
        },
      ],
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.importedCount, 0);
    assert.strictEqual(res.body.updatedCount, 0);
    assert.strictEqual(res.body.skippedOverrideCount, 1);
    assert.strictEqual(t1.category, 'BUG', 'Human override must be preserved upon re-import');
    assert.strictEqual(t1.isHumanOverride, true);

    // 10. Test mixed batch
    console.log('9. Testing mixed batch (new + update + override)...');
    res = await postImport({
      tickets: [
        {
          externalId: 'FEED-001', // override active -> skippedOverride
          subject: 'Invoice charge update',
          body: 'Refund requested for another invoice charge.',
        },
        {
          externalId: 'FEED-002', // exists, no override -> updated
          subject: 'Invoice updated',
          body: 'Updated invoice charge details.',
        },
        {
          externalId: 'FEED-004', // new -> imported
          subject: 'Broken layout',
          body: 'Frontend is broken and displays 500 error.',
        },
      ],
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.importedCount, 1);
    assert.strictEqual(res.body.updatedCount, 1);
    assert.strictEqual(res.body.skippedOverrideCount, 1);
    assert.strictEqual(res.body.total, 3);

    console.log('\n>>> ALL TICKET IMPORT & AUTO-TRIAGE TESTS PASSED! <<<');
  } finally {
    Ticket.findOne = originalTicketFindOne;
    Ticket.create = originalTicketCreate;
    Ticket.find = originalTicketFind;
    User.findById = originalUserFindById;
    server.close();
  }
}

runImportTests().catch((err) => {
  console.error('Import tests failed:', err);
  process.exit(1);
});
