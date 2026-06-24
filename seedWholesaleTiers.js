import mongoose from 'mongoose';
import dotenv from 'dotenv';
import WholesaleTier from './models/WholesaleTier.js';

dotenv.config();

const defaultTiers = [
  {
    minQuantity: 1,
    maxQuantity: 9,
    discountPercentage: 0,
    borderColor: '#3B82F6',
    status: 'active',
    displayOrder: 1
  },
  {
    minQuantity: 10,
    maxQuantity: 49,
    discountPercentage: 15,
    borderColor: '#10B981',
    status: 'active',
    displayOrder: 2
  },
  {
    minQuantity: 50,
    maxQuantity: 99,
    discountPercentage: 25,
    borderColor: '#F59E0B',
    status: 'active',
    displayOrder: 3
  },
  {
    minQuantity: 100,
    maxQuantity: 9999,
    discountPercentage: 40,
    borderColor: '#8B5CF6',
    status: 'active',
    displayOrder: 4
  }
];

const seedWholesaleTiers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if tiers already exist
    const existingTiers = await WholesaleTier.countDocuments();
    if (existingTiers > 0) {
      console.log(`Found ${existingTiers} existing tiers. Skipping seed.`);
      await mongoose.disconnect();
      return;
    }

    // Create default tiers
    const createdTiers = await WholesaleTier.insertMany(defaultTiers);
    console.log(`Created ${createdTiers.length} default wholesale tiers`);

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding wholesale tiers:', error);
    process.exit(1);
  }
};

seedWholesaleTiers();