const mongoose = require('mongoose');

const TRACKED_FIELDS = ['category', 'priority', 'status', 'assigneeId'];

const ticketEventSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: [true, 'ticketId is required'],
      index: true,
    },
    field: {
      type: String,
      required: [true, 'Field name is required'],
      enum: {
        values: TRACKED_FIELDS,
        message: '{VALUE} is not a valid tracked field',
      },
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    actor: {
      type: String,
      required: [true, 'Actor is required'],
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for chronologically fetching events for a ticket
ticketEventSchema.index({ ticketId: 1, createdAt: -1 });

const TicketEvent = mongoose.model('TicketEvent', ticketEventSchema);

module.exports = TicketEvent;
