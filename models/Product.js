import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide product name'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Please provide product description'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    required: true,
    enum: ['Jeans', 'Jackets', 'Shorts', 'Accessories']
  },
  fit: {
    type: String,
    required: true,
    enum: ['Slim', 'Regular', 'Baggy', 'Skinny', 'Bootcut', 'Wide-Leg', 'Flared', 'Cargo', 'Boyfriend', 'Straight Leg', 'Designed', 'Barrel Fit', 'Distressed', 'Low-Waisted', 'High-Waisted']
  },
  sizes: [{
    type: Number,
    enum: [26, 28, 30, 32, 34, 36, 38, 40, 42, 44]
  }],
  // Size Distribution Settings
  sizeDistributionSet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SizeDistribution'
  },
  distributionMode: {
    type: String,
    enum: ['automatic', 'equal', 'customer_select', 'manual'],
    default: 'automatic'
  },
  allowCustomerOverride: {
    type: Boolean,
    default: true
  },
  isDistributionLocked: {
    type: Boolean,
    default: false
  },
  customSizeDistribution: {
    type: Map,
    of: Number,
    default: {}
  },
  priceTiers: [{
    minQty: { type: Number, required: true },
    maxQty: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },
  images: [{
    type: String
  }],
  stock: {
    type: Map,
    of: Number,
    default: {}
  },
  totalStock: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

productSchema.pre('save', function(next) {
  if (!this.slug) {
    const baseSlug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const uniqueSuffix = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    this.slug = `${baseSlug}-${uniqueSuffix}`;
  }
  // Note: priceTiers are now managed globally via WholesaleTier model
  // Remove old hardcoded default tiers - global wholesale pricing will be used instead
  let total = 0;
  if (this.stock) {
    for (const qty of this.stock.values()) {
      total += qty;
    }
  }
  this.totalStock = total;
  next();
});

productSchema.index({ name: 'text', description: 'text' });

export default mongoose.model('Product', productSchema);