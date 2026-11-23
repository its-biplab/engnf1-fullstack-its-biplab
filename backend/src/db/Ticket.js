const mongoose = require('mongoose');

const CATEGORIES = ['BILLING', 'BUG', 'FEATURE_REQUEST', 'LOGIN', 'DELIVERY'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

const ticketSchema = new mongoose.Schema(
  {
    externalId: {
      type: String,
      required: [true, 'externalId is required'],
      unique: true,
      trim: true,
      index: true,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      minlength: [3, 'Subject must be at least 3 characters long'],
      maxlength: [150, 'Subject cannot exceed 150 characters'],
    },
    body: {
      type: String,
      required: [true, 'Body is required'],
      trim: true,
      minlength: [5, 'Body must be at least 5 characters long'],
      maxlength: [2000, 'Body cannot exceed 2000 characters'],
    },
    autoCategory: {
      type: String,
      required: [true, 'autoCategory is required'],
      enum: {
        values: CATEGORIES,
        message: '{VALUE} is not a valid autoCategory',
      },
      immutable: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: CATEGORIES,
        message: '{VALUE} is not a valid category',
      },
    },
    isHumanOverride: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      required: [true, 'Priority is required'],
      enum: {
        values: PRIORITIES,
        message: '{VALUE} is not a valid priority',
      },
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: STATUSES,
        message: '{VALUE} is not a valid status',
      },
      default: 'OPEN',
    },
    assigneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    isReviewed: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
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

// Compound query indexes for efficient filtering and sorting
ticketSchema.index({ status: 1, priority: 1, createdAt: -1 });
ticketSchema.index({ category: 1, status: 1 });
ticketSchema.index({ assigneeId: 1, status: 1 });
ticketSchema.index({ isReviewed: 1, createdAt: -1 });

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
