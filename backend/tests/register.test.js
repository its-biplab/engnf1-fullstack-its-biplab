const assert = require('assert');
const http = require('http');
const bcrypt = require('bcryptjs');
const { User } = require('../src/db');
const app = require('../src/index');

async function runTests() {
  console.log('--- Starting User Registration Tests ---');

  // Set up in-memory mock storage for User model methods
  const mockUsers = [];

  const originalFindOne = User.findOne;
  const originalCreate = User.create;

  User.findOne = async function (filter) {
    if (filter && filter.email) {
      const emailLower = filter.email.toLowerCase();
      const found = mockUsers.find((u) => u.email.toLowerCase() === emailLower);
      return found || null;
    }
    return null;
  };

  User.create = async function (data) {
    const userDoc = new User(data);
    mockUsers.push(userDoc);
    return userDoc;
  };

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5123, resolve));
  const baseUrl = 'http://localhost:5123/api/auth/register';

  async function postRegister(body) {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return { status: res.status, body: json };
  }

  try {
    // 1. Missing name
    console.log('1. Testing missing name...');
    let res = await postRegister({ email: 'test@example.com', password: 'Password123' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');

    // 2. Name too short (< 2 chars)
    console.log('2. Testing name too short...');
    res = await postRegister({ name: 'A', email: 'test@example.com', password: 'Password123' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');

    // 3. Name too long (> 50 chars)
    console.log('3. Testing name too long...');
    res = await postRegister({
      name: 'A'.repeat(51),
      email: 'test@example.com',
      password: 'Password123',
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');

    // 4. Invalid email format
    console.log('4. Testing invalid email format...');
    res = await postRegister({ name: 'Alice', email: 'not-an-email', password: 'Password123' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');

    // 5. Password too short (< 8 chars)
    console.log('5. Testing password too short...');
    res = await postRegister({ name: 'Alice', email: 'alice@example.com', password: 'Pass1' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');

    // 6. Password without digit
    console.log('6. Testing password without numbers...');
    res = await postRegister({
      name: 'Alice',
      email: 'alice@example.com',
      password: 'PasswordOnly',
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');

    // 7. Password without letters
    console.log('7. Testing password without letters...');
    res = await postRegister({ name: 'Alice', email: 'alice@example.com', password: '123456789' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');

    // 8. Successful registration with role spoofing attempt
    console.log('8. Testing successful registration and role enforcement...');
    res = await postRegister({
      name: '  Alice Wonderland  ',
      email: '  Alice@EXAMPLE.com  ',
      password: 'SecurePassword123',
      role: 'ADMIN', // Should be ignored!
    });
    assert.strictEqual(res.status, 201);
    assert(res.body.user);
    assert.strictEqual(res.body.user.name, 'Alice Wonderland');
    assert.strictEqual(res.body.user.email, 'alice@example.com');
    assert.strictEqual(res.body.user.role, 'USER'); // Must be 'USER'
    assert.strictEqual(res.body.user.passwordHash, undefined); // Never exposed!
    assert.strictEqual(res.body.user.password, undefined);

    // Verify stored password hash
    const storedUser = mockUsers[0];
    assert(storedUser.passwordHash);
    const passwordMatches = await bcrypt.compare('SecurePassword123', storedUser.passwordHash);
    assert.strictEqual(passwordMatches, true, 'Stored bcrypt hash must match input password');

    // 9. Conflict on existing email (case-insensitive)
    console.log('9. Testing conflict on duplicate email...');
    res = await postRegister({
      name: 'Another Alice',
      email: 'ALICE@example.com',
      password: 'AnotherPassword456',
    });
    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.error.code, 'CONFLICT');

    // 10. Check 404 handler conforms to error envelope
    console.log('10. Testing 404 error envelope...');
    const notFoundRes = await fetch('http://localhost:5123/api/nonexistent');
    const notFoundJson = await notFoundRes.json();
    assert.strictEqual(notFoundRes.status, 404);
    assert.strictEqual(notFoundJson.error.code, 'NOT_FOUND');

    console.log('\n>>> ALL 10 REGISTRATION API TESTS PASSED SUCCESSFULLY! <<<');
  } finally {
    User.findOne = originalFindOne;
    User.create = originalCreate;
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
