const mongoose = require('mongoose');

const RESOURCE_TYPES = ['ROOM', 'LAB', 'EQUIPMENT'];

const resourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Resource name is required'],
      trim: true,
      minlength: [3, 'Resource name must be at least 3 characters long'],
      maxlength: [60, 'Resource name cannot exceed 60 characters'],
    },
    type: {
      type: String,
      required: [true, 'Resource type is required'],
      enum: {
        values: RESOURCE_TYPES,
        message: '{VALUE} is not a valid resource type',
      },
      index: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      validate: {
        validator: Number.isInteger,
        message: 'Capacity must be an integer',
      },
      min: [1, 'Capacity must be at least 1'],
      max: [500, 'Capacity cannot exceed 500'],
    },
    description: {
      type: String,
      maxlength: [300, 'Description cannot exceed 300 characters'],
      default: null,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
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

// Case-insensitive uniqueness index on resource name
resourceSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } }
);

// Compound index for filtering active resources by type
resourceSchema.index({ type: 1, isActive: 1 });

const Resource = mongoose.model('Resource', resourceSchema);

module.exports = Resource;
