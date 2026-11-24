const express = require('express');
const { importTickets, getTickets } = require('../controllers/ticketController');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// Require authentication on all ticket operations
router.use(authenticateJWT);

// POST /api/tickets/import
router.post('/import', importTickets);

// GET /api/tickets
router.get('/', getTickets);

module.exports = router;
