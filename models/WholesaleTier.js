import mongoose from 'mongoose';

const wholesaleTierSchema = new mongoose.Schema({
  minQuantity: {
    type: Number,
    required: [true, 'Please provide minimum quantity'],
    min: [1, 'Minimum quantity must be at least 1']
  },
  maxQuantity: {
    type: Number,
    required: [true, 'Please provide maximum quantity'],
    validate: {
      validator: function(value) {
        return value >= this.minQuantity;
      },
      message: 'Maximum quantity must be greater than or equal to minimum quantity'
    }
  },
  discountPercentage: {
    type: Number,
    required: [true, 'Please provide discount percentage'],
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%']
  },
  borderColor: {
    type: String,
    default: '#3B82F6',
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please provide a valid hex color']
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient queries
wholesaleTierSchema.index({ minQuantity: 1, maxQuantity: 1 });
wholesaleTierSchema.index({ status: 1, displayOrder: 1 });

// Pre-save middleware to validate no overlapping tiers
wholesaleTierSchema.pre('save', async function(next) {
  // If updating, exclude current tier from overlap check
  const query = this.isNew ? {} : { _id: { $ne: this._id } };

  const overlappingTiers = await this.constructor.find({
    ...query,
    status: 'active'
  }).where('minQuantity').lte(this.maxQuantity)
    .where('maxQuantity').gte(this.minQuantity);

  if (overlappingTiers.length > 0) {
    const error = new Error('This quantity range overlaps with an existing tier');
    error.name = 'ValidationError';
    return next(error);
  }

  // Auto-set display order if not provided
  if (!this.displayOrder || this.displayOrder === 0) {
    const lastTier = await this.constructor.findOne().sort({ displayOrder: -1 });
    this.displayOrder = lastTier ? lastTier.displayOrder + 1 : 1;
  }

  next();
});

export default mongoose.model('WholesaleTier', wholesaleTierSchema);