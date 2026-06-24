import express from 'express';
import Product from '../models/Product.js';

const router = express.Router();

const products = [
  {
    name: 'Classic Slim Fit Jeans',
    slug: 'classic-slim-fit-jeans',
    description: 'Premium quality slim fit jeans made from 100% premium cotton denim. Perfect for everyday wear with comfort and style.',
    shortDescription: 'Premium slim fit denim jeans',
    basePrice: 850,
    sizes: ['28', '30', '32', '34', '36'],
    color: 'Dark Wash',
    fit: 'Slim',
    material: '100% Cotton Denim',
    rise: 'Mid Rise',
    closure: 'Button Fly',
    care: 'Machine Washable',
    images: ['https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?w=800'],
    category: 'Jeans',
    stock: { '28': 50, '30': 100, '32': 120, '34': 80, '36': 40 },
    totalStock: 390,
    rating: 4.5,
    distributionMode: 'automatic',
    allowCustomerOverride: true
  },
  {
    name: 'Relaxed Fit Cargo Pants',
    slug: 'relaxed-fit-cargo-pants',
    description: 'Comfortable relaxed fit cargo pants with multiple pockets.',
    shortDescription: 'Comfortable cargo pants',
    basePrice: 920,
    sizes: ['28', '30', '32', '34', '36', '38'],
    color: 'Stone Wash',
    fit: 'Relaxed',
    material: '100% Cotton Denim',
    rise: 'Mid Rise',
    closure: 'Zipper',
    care: 'Machine Washable',
    images: ['https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800'],
    category: 'Jeans',
    stock: { '28': 30, '30': 60, '32': 80, '34': 70, '36': 50, '38': 25 },
    totalStock: 315,
    rating: 4.3,
    distributionMode: 'automatic',
    allowCustomerOverride: true
  },
  {
    name: 'Straight Leg Jeans',
    slug: 'straight-leg-jeans',
    description: 'Classic straight leg jeans with a timeless look.',
    shortDescription: 'Classic straight leg denim',
    basePrice: 780,
    sizes: ['28', '30', '32', '34', '36'],
    color: 'Medium Wash',
    fit: 'Regular',
    material: '100% Cotton Denim',
    rise: 'Mid Rise',
    closure: 'Button Fly',
    care: 'Machine Washable',
    images: ['https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=800'],
    category: 'Jeans',
    stock: { '28': 45, '30': 90, '32': 110, '34': 75, '36': 35 },
    totalStock: 355,
    rating: 4.6,
    distributionMode: 'automatic',
    allowCustomerOverride: true
  },
  {
    name: 'Skinny Fit High Rise',
    slug: 'skinny-fit-high-rise',
    description: 'Modern skinny fit jeans with high rise waist.',
    shortDescription: 'Modern skinny fit',
    basePrice: 950,
    sizes: ['26', '28', '30', '32', '34'],
    color: 'Black',
    fit: 'Skinny',
    material: '98% Cotton, 2% Elastane',
    rise: 'High Rise',
    closure: 'Zipper',
    care: 'Machine Washable',
    images: ['https://images.unsplash.com/photo-1565084888279-aca607ecce0c?w=800'],
    category: 'Jeans',
    stock: { '26': 25, '28': 50, '30': 75, '32': 60, '34': 40 },
    totalStock: 250,
    rating: 4.7,
    distributionMode: 'automatic',
    allowCustomerOverride: true
  },
  {
    name: 'Bootcut Jeans',
    slug: 'bootcut-jeans',
    description: 'Classic bootcut jeans with slight flare.',
    shortDescription: 'Classic bootcut style',
    basePrice: 820,
    sizes: ['28', '30', '32', '34', '36'],
    color: 'Light Wash',
    fit: 'Bootcut',
    material: '100% Cotton Denim',
    rise: 'Mid Rise',
    closure: 'Button Fly',
    care: 'Machine Washable',
    images: ['https://images.unsplash.com/photo-1475178626620-a4d074967452?w=800'],
    category: 'Jeans',
    stock: { '28': 35, '30': 70, '32': 90, '34': 65, '36': 30 },
    totalStock: 290,
    rating: 4.4,
    distributionMode: 'automatic',
    allowCustomerOverride: true
  },
  {
    name: 'Jogger Denim Pants',
    slug: 'jogger-denim-pants',
    description: 'Modern jogger style denim pants.',
    shortDescription: 'Modern jogger style',
    basePrice: 880,
    sizes: ['28', '30', '32', '34', '36'],
    color: 'Blue Stone',
    fit: 'Slim',
    material: '95% Cotton, 5% Elastane',
    rise: 'Mid Rise',
    closure: 'Elastic',
    care: 'Machine Washable',
    images: ['https://images.unsplash.com/photo-1517438476312-10d76c06be2e?w=800'],
    category: 'Jeans',
    stock: { '28': 40, '30': 80, '32': 100, '34': 70, '36': 45 },
    totalStock: 335,
    rating: 4.5,
    distributionMode: 'automatic',
    allowCustomerOverride: true
  }
];

router.post('/products', async (req, res) => {
  try {
    await Product.deleteMany({});
    const seeded = await Product.insertMany(products);
    res.json({ success: true, count: seeded.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;