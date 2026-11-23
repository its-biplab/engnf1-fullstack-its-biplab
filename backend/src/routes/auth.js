const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me (Protected)
router.get('/me', authenticateJWT, getMe);

module.exports = router;
