import Order from '../models/Order.js';
import Product from '../models/Product.js';
import WholesaleTier from '../models/WholesaleTier.js';

export const createOrder = async (req, res) => {
  try {
    const { products, shippingAddress, paymentMethod, couponUsed } = req.body;

    let subtotal = 0;
    const orderProducts = [];

    // Fetch wholesale tiers for pricing
    const wholesaleTiers = await WholesaleTier.find().sort({ minQuantity: 1 });

    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.productId} not found`
        });
      }

      // Handle size distribution if provided, otherwise use single size
      let sizeDistribution = item.sizeDistribution;
      let sizesToProcess = [];

      if (sizeDistribution && typeof sizeDistribution === 'object' && Object.keys(sizeDistribution).length > 0) {
        // Convert size distribution object to array of sizes
        sizesToProcess = Object.entries(sizeDistribution).map(([size, qty]) => ({
          size: String(size),
          quantity: parseInt(qty) || 0
        })).filter(item => item.quantity > 0);
      } else if (item.size) {
        // Single size order (legacy support)
        sizesToProcess = [{ size: String(item.size), quantity: item.quantity }];
      } else {
        // No size specified - use total quantity with equal distribution
        const productSizes = product.sizes || [28, 30, 32, 34, 36, 38, 40, 42, 44];
        const qtyPerSize = Math.floor(item.quantity / productSizes.length);
        const remainder = item.quantity % productSizes.length;
        sizesToProcess = productSizes.map((size, index) => ({
          size: String(size),
          quantity: qtyPerSize + (index < remainder ? 1 : 0)
        })).filter(item => item.quantity > 0);
      }

      // Validate stock for each size
      for (const sizeItem of sizesToProcess) {
        const stock = product.stock.get(sizeItem.size) || 0;
        if (stock > 0 && stock < sizeItem.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for size ${sizeItem.size} of ${product.name} (needed: ${sizeItem.quantity}, available: ${stock})`
          });
        }
      }

      // Calculate price using wholesale tiers
      const tier = wholesaleTiers.find(
        t => item.quantity >= t.minQuantity && item.quantity <= t.maxQuantity
      );
      const price = tier ? product.basePrice - (product.basePrice * tier.discountPercentage / 100) : product.basePrice;

      subtotal += price * item.quantity;

      // Add order products for each size
      for (const sizeItem of sizesToProcess) {
        orderProducts.push({
          product: product._id,
          name: product.name,
          image: product.images[0],
          size: sizeItem.size,
          quantity: sizeItem.quantity,
          price
        });

        // Update stock
        const stock = product.stock.get(sizeItem.size) || 0;
        if (stock > 0) {
          const newStock = stock - sizeItem.quantity;
          product.stock.set(sizeItem.size, newStock);
        }
      }

      await product.save();
    }

    const discount = couponUsed ? Math.round(subtotal * 0.1) : 0;
    const shippingCost = subtotal >= 500 ? 0 : 25;
    const total = subtotal - discount + shippingCost;

    const order = await Order.create({
      user: req.user.id,
      products: orderProducts,
      shippingAddress,
      subtotal,
      discount,
      shippingCost,
      total,
      paymentMethod,
      couponUsed,
      status: 'pending',
      paymentStatus: 'pending'
    });

    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('products.product', 'name images')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('products.product');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    if (order.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('user', 'name email company')
      .populate('products.product', 'name images')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = status;
    if (status === 'shipped') order.shippedAt = new Date();
    if (status === 'delivered') order.deliveredAt = new Date();

    await order.save();

    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, paymentIntentId } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.paymentStatus = paymentStatus;
    if (paymentIntentId) order.paymentIntentId = paymentIntentId;

    await order.save();

    res.status(200).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const statusCounts = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      stats: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        statusCounts,
        recentOrders
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};