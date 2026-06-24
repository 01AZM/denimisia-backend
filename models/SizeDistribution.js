import mongoose from 'mongoose';

const sizeRatioSchema = new mongoose.Schema({
  size: { type: String, required: true },
  ratio: { type: Number, default: 1, min: 0 }
}, { _id: false });

const sizeDistributionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  category: {
    type: String,
    enum: ['Jeans', 'Shirt', 'Pants', 'Shorts', 'Jacket', 'Custom'],
    default: 'Custom'
  },
  sizes: [sizeRatioSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String
  },
  // Distribution settings for products
  defaultDistributionMode: {
    type: String,
    enum: ['automatic', 'equal', 'customer_select', 'manual'],
    default: 'automatic'
  },
  allowCustomerOverride: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  // Minimum order quantity rules
  minimumOrderQuantity: {
    type: Number,
    default: 1
  },
  ratioPackMultiples: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Calculate total ratio weight
sizeDistributionSchema.methods.getTotalRatio = function() {
  return this.sizes.reduce((sum, s) => sum + s.ratio, 0);
};

// Static method to calculate size distribution
sizeDistributionSchema.statics.calculateDistribution = function(sizes, quantity, mode = 'automatic') {
  if (mode === 'equal') {
    // Equal distribution
    const perSize = Math.floor(quantity / sizes.length);
    const remainder = quantity % sizes.length;
    const distribution = {};
    sizes.forEach((size, index) => {
      distribution[size.size] = perSize + (index < remainder ? 1 : 0);
    });
    return distribution;
  }

  if (mode === 'automatic') {
    // Weighted ratio distribution
    const totalRatio = sizes.reduce((sum, s) => sum + s.ratio, 0);
    const distribution = {};
    let allocated = 0;

    // First pass - calculate base quantities
    sizes.forEach((size, index) => {
      const rawQty = (quantity * size.ratio) / totalRatio;
      const qty = Math.floor(rawQty);
      distribution[size.size] = qty;
      allocated += qty;
    });

    // Distribute remainder based on decimal parts
    const remainder = quantity - allocated;
    const remainders = sizes.map(s => {
      const rawQty = (quantity * s.ratio) / totalRatio;
      return rawQty - Math.floor(rawQty);
    });

    // Sort by remainder descending and distribute
    const indexed = remainders.map((r, i) => ({ r, i })).sort((a, b) => b.r - a.r);
    for (let i = 0; i < remainder; i++) {
      const sizeIndex = indexed[i].i;
      distribution[sizes[sizeIndex].size]++;
    }

    return distribution;
  }

  // For customer_select or manual, return zeros (customer will specify)
  const distribution = {};
  sizes.forEach(size => {
    distribution[size.size] = 0;
  });
  return distribution;
};

export default mongoose.model('SizeDistribution', sizeDistributionSchema);