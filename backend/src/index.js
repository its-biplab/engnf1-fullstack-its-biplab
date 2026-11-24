const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./db');
const authRouter = require('./routes/auth');
const ticketsRouter = require('./routes/tickets');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Backend server is healthy',
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes
app.use('/api/auth', authRouter);

// Ticket routes
app.use('/api/tickets', ticketsRouter);

// 404 handler for undefined routes matching error envelope
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
  });
});

// Centralized error handler
app.use(errorHandler);

// Connect to DB and listen when executed directly
if (require.main === module) {
  const dbUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (dbUri) {
    connectDB(dbUri)
      .then(() => {
        console.log('Connected to MongoDB database');
      })
      .catch((err) => {
        console.error('Database connection error:', err.message);
      });
  }

  app.listen(PORT, () => {
    console.log(`Backend server listening on port ${PORT}`);
  });
}

module.exports = app;
