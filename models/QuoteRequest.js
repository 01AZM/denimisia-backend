import mongoose from 'mongoose';

const quoteRequestSchema = new mongoose.Schema({
  // Reference number
  referenceNumber: {
    type: String,
    unique: true
  },

  // Customer Information
  customerInfo: {
    fullName: { type: String, required: true },
    companyName: { type: String },
    emailAddress: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    whatsappNumber: { type: String },
    country: { type: String, required: true },
    city: { type: String },
    website: { type: String }
  },

  // Order Requirements
  orderRequirements: {
    productType: {
      type: String,
      required: true,
      enum: ['Jeans', 'Denim Jacket', 'Shirt', 'T-Shirt', 'Hoodie', 'Pants', 'Shorts', 'Custom Product']
    },
    quantityRequired: { type: Number, required: true }
  },

  // Customization Requirements
  customization: {
    sizeRange: [{
      type: Number,
      enum: [28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50]
    }],
    customSize: { type: String },
    projectDetails: { type: String }
  },

  // Status tracking
  status: {
    type: String,
    enum: ['New', 'Under Review', 'Quoted', 'Negotiating', 'Approved', 'Production', 'Completed', 'Rejected'],
    default: 'New'
  },

  // Admin notes and communication
  adminNotes: [{
    note: { type: String },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now }
  }],

  // Communication logs
  communications: [{
    type: { type: String, enum: ['customer', 'admin'] },
    message: { type: String },
    sentAt: { type: Date, default: Date.now },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],

  // Quotation details
  quotation: {
    pricePerUnit: { type: Number },
    totalPrice: { type: Number },
    currency: { type: String, default: 'BDT' },
    leadTime: { type: String },
    validUntil: { type: Date },
    notes: { type: String }
  },

  // Assigned team member
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Internal notes
  internalNotes: { type: String },

  // Expected response time
  expectedResponseTime: {
    type: Date
  },

  // Timestamps
  submittedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Generate reference number before saving
quoteRequestSchema.pre('save', async function(next) {
  if (!this.referenceNumber) {
    const count = await mongoose.model('QuoteRequest').countDocuments();
    this.referenceNumber = `CQ-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

export default mongoose.model('QuoteRequest', quoteRequestSchema);