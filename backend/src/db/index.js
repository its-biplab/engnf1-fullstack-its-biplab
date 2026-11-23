const mongoose = require('mongoose');
const User = require('./User');
const Ticket = require('./Ticket');
const TicketEvent = require('./TicketEvent');
const Resource = require('./Resource');
const Booking = require('./Booking');

/**
 * Connect to MongoDB instance using provided URI or environment variable.
 * @param {string} [uri]
 * @returns {Promise<typeof mongoose>}
 */
const connectDB = async (uri) => {
  const dbUri = uri || process.env.DATABASE_URL || process.env.MONGODB_URI;
  if (!dbUri) {
    throw new Error('Database URI is not defined. Please set DATABASE_URL or MONGODB_URI in your environment.');
  }
  return await mongoose.connect(dbUri);
};

module.exports = {
  mongoose,
  connectDB,
  User,
  Ticket,
  TicketEvent,
  Resource,
  Booking,
};
