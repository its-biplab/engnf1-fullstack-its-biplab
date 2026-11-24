const assert = require('assert');
const http = require('http');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../src/db');
const app = require('../src/index');

async function runLoginTests() {
  console.log('--- Starting User Login & Auth Middleware Tests ---');

  // Pre-seed a test user
  const hashedPassword = await bcrypt.hash('CorrectPassword123', 10);
  const testUserDoc = new User({
    name: 'Login Tester',
    email: 'tester@example.com',
    passwordHash: hashedPassword,
    role: 'USER',
  });

  const originalFindOne = User.findOne;
  const originalFindById = User.findById;

  User.findOne = function (filter) {
    let selectFields = '';
    const queryObj = {
      select: function (fields) {
        selectFields = fields;
        return queryObj;
      },
      then: function (resolve) {
        if (filter && filter.email && filter.email.toLowerCase() === 'tester@example.com') {
          resolve(testUserDoc);
        } else {
          resolve(null);
        }
      },
    };
    return queryObj;
  };

  User.findById = async function (id) {
    if (id === testUserDoc._id.toString()) {
      return testUserDoc;
    }
    return null;
  };

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(5124, resolve));
  const loginUrl = 'http://localhost:5124/api/auth/login';
  const meUrl = 'http://localhost:5124/api/auth/me';

  async function postLogin(body) {
    const res = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    return { status: res.status, body: json };
  }

  async function getMe(token) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(meUrl, { headers });
    const json = await res.json();
    return { status: res.status, body: json };
  }

  try {
    // 1. Missing email
    console.log('1. Testing missing email on login...');
    let res = await postLogin({ password: 'CorrectPassword123' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');

    // 2. Invalid email format
    console.log('2. Testing invalid email format on login...');
    res = await postLogin({ email: 'not-an-email', password: 'CorrectPassword123' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');

    // 3. Missing password
    console.log('3. Testing missing password on login...');
    res = await postLogin({ email: 'tester@example.com', password: '' });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');

    // 4. Non-existent user
    console.log('4. Testing non-existent user on login...');
    res = await postLogin({ email: 'nonexistent@example.com', password: 'CorrectPassword123' });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'UNAUTHENTICATED');
    assert.strictEqual(res.body.error.message, 'Invalid email or password');

    // 5. Incorrect password
    console.log('5. Testing wrong password on login...');
    res = await postLogin({ email: 'tester@example.com', password: 'WrongPassword456' });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'UNAUTHENTICATED');
    assert.strictEqual(res.body.error.message, 'Invalid email or password');

    // 6. Successful login
    console.log('6. Testing successful login...');
    res = await postLogin({ email: 'TESTER@example.com', password: 'CorrectPassword123' });
    assert.strictEqual(res.status, 200);
    assert(res.body.token, 'Token must be present in response');
    assert(res.body.user, 'User must be present in response');
    assert.strictEqual(res.body.user.email, 'tester@example.com');
    assert.strictEqual(res.body.user.role, 'USER');
    assert.strictEqual(res.body.user.passwordHash, undefined, 'passwordHash must never be exposed');

    // Verify token validity
    const decoded = jwt.decode(res.body.token);
    assert.strictEqual(decoded.id, testUserDoc._id.toString());
    assert.strictEqual(decoded.role, 'USER');

    const authToken = res.body.token;

    // 7. GET /api/auth/me without token
    console.log('7. Testing /api/auth/me without token...');
    let meRes = await getMe(null);
    assert.strictEqual(meRes.status, 401);
    assert.strictEqual(meRes.body.error.code, 'UNAUTHENTICATED');

    // 8. GET /api/auth/me with invalid token
    console.log('8. Testing /api/auth/me with invalid token...');
    meRes = await getMe('invalid-garbage-token');
    assert.strictEqual(meRes.status, 401);
    assert.strictEqual(meRes.body.error.code, 'UNAUTHENTICATED');

    // 9. GET /api/auth/me with valid token
    console.log('9. Testing /api/auth/me with valid token...');
    meRes = await getMe(authToken);
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.user.email, 'tester@example.com');
    assert.strictEqual(meRes.body.user.name, 'Login Tester');

    // 10. GET /api/auth/me when user is no longer in database
    console.log('10. Testing /api/auth/me when user no longer exists in database...');
    const deletedUserToken = jwt.sign(
      { id: 'nonexistent_user_id', role: 'USER' },
      process.env.JWT_SECRET || 'triage_sync_jwt_secret_dev',
      { expiresIn: '24h' }
    );
    const deletedRes = await getMe(deletedUserToken);
    assert.strictEqual(deletedRes.status, 401);
    assert.strictEqual(deletedRes.body.error.code, 'UNAUTHENTICATED');

    console.log('\n>>> ALL LOGIN & AUTH TESTS PASSED SUCCESSFULLY! <<<');
  } finally {
    User.findOne = originalFindOne;
    User.findById = originalFindById;
    server.close();
  }
}

runLoginTests().catch((err) => {
  console.error('Login tests failed:', err);
  process.exit(1);
});
