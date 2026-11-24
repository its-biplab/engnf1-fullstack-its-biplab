const express = require('express');
const { importTickets, getTickets, getTicketById } = require('../controllers/ticketController');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// Require authentication on all ticket operations
router.use(authenticateJWT);

// POST /api/tickets/import
router.post('/import', importTickets);

// GET /api/tickets
router.get('/', getTickets);

// GET /api/tickets/:id
router.get('/:id', getTicketById);

module.exports = router;
