const mongoose = require('mongoose');

const BOOKING_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

const bookingSchema = new mongoose.Schema(
  {
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: [true, 'resourceId is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'userId is required'],
      index: true,
    },
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      default: null,
      index: true,
    },
    startTime: {
      type: Date,
      required: [true, 'startTime is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'endTime is required'],
      validate: {
        validator: function (val) {
          if (!this.startTime || !val) return true;
          return val > this.startTime;
        },
        message: 'endTime must be after startTime',
      },
    },
    purpose: {
      type: String,
      required: [true, 'Purpose is required'],
      trim: true,
      minlength: [5, 'Purpose must be at least 5 characters long'],
      maxlength: [200, 'Purpose cannot exceed 200 characters'],
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: BOOKING_STATUSES,
        message: '{VALUE} is not a valid booking status',
      },
      default: 'PENDING',
    },
    decisionNote: {
      type: String,
      maxlength: [200, 'decisionNote cannot exceed 200 characters'],
      default: null,
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

// Compound indexes for resource availability / conflict queries and user schedule lookups
bookingSchema.index({ resourceId: 1, startTime: 1, endTime: 1, status: 1 });
bookingSchema.index({ userId: 1, status: 1, createdAt: -1 });
bookingSchema.index({ status: 1, startTime: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
