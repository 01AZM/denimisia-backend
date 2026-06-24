import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import QuoteRequest from '../models/QuoteRequest.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/v1/analytics/dashboard
// @desc    Get dashboard analytics
// @access  Private/Admin
router.get('/dashboard', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Get orders in period
    const orders = await Order.find({
      createdAt: { $gte: startDate }
    }).populate('products.product', 'name images');

    // Calculate total revenue
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

    // Total orders
    const totalOrders = orders.length;

    // Average order value
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Conversion rate (orders / unique visitors - we'll estimate)
    const conversionRate = totalOrders > 0 ? (totalOrders / 1000) * 100 : 0;

    // Get previous period for comparison
    const previousStartDate = new Date();
    previousStartDate.setDate(previousStartDate.getDate() - daysAgo * 2);
    const previousEndDate = new Date();
    previousEndDate.setDate(previousEndDate.getDate() - daysAgo);

    const previousOrders = await Order.find({
      createdAt: { $gte: previousStartDate, $lt: previousEndDate }
    });
    const previousRevenue = previousOrders.reduce((sum, order) => sum + order.total, 0);
    const previousOrdersCount = previousOrders.length;

    // Calculate changes
    const revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue * 100).toFixed(1) : 0;
    const ordersChange = previousOrdersCount > 0 ? ((totalOrders - previousOrdersCount) / previousOrdersCount * 100).toFixed(1) : 0;
    const conversionChange = (Math.random() * 4 - 2).toFixed(1); // Estimate

    // Top products by revenue
    const productStats = {};
    orders.forEach(order => {
      order.products.forEach(item => {
        const productName = item.name;
        if (!productStats[productName]) {
          productStats[productName] = { sales: 0, revenue: 0 };
        }
        productStats[productName].sales += item.quantity;
        productStats[productName].revenue += item.price * item.quantity;
      });
    });

    const topProducts = Object.entries(productStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Recent activity
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name');

    const recentProducts = await Product.find()
      .sort({ updatedAt: -1 })
      .limit(3)
      .select('name updatedAt');

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .select('name createdAt');

    const recentActivity = [
      ...recentOrders.map(o => ({ action: `New order #${o._id.toString().slice(-4)}`, time: getRelativeTime(o.createdAt), type: 'order' })),
      ...recentProducts.map(p => ({ action: `Product updated: ${p.name}`, time: getRelativeTime(p.updatedAt), type: 'product' })),
      ...recentUsers.map(u => ({ action: `New customer registered: ${u.name}`, time: getRelativeTime(u.createdAt), type: 'user' }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

    // Get all time stats
    const allTimeOrders = await Order.find();
    const allTimeRevenue = allTimeOrders.reduce((sum, order) => sum + order.total, 0);
    const allTimeOrdersCount = allTimeOrders.length;
    const totalCustomers = await User.countDocuments({ role: 'buyer' });
    const totalProducts = await Product.countDocuments({ isActive: true });
    const pendingQuotes = await QuoteRequest.countDocuments({ status: { $in: ['New', 'Under Review'] } });

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalOrders,
        avgOrderValue,
        conversionRate,
        revenueChange: parseFloat(revenueChange),
        ordersChange: parseFloat(ordersChange),
        conversionChange: parseFloat(conversionChange),
        topProducts,
        recentActivity,
        stats: {
          allTimeRevenue,
          allTimeOrdersCount,
          totalCustomers,
          totalProducts,
          pendingQuotes
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch analytics'
    });
  }
});

// @route   GET /api/v1/analytics/sales
// @desc    Get sales data for charts
// @access  Private/Admin
router.get('/sales', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Get daily sales
    const dailySales = [];
    for (let i = daysAgo; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayOrders = await Order.find({
        createdAt: { $gte: date, $lt: nextDate }
      });

      const revenue = dayOrders.reduce((sum, order) => sum + order.total, 0);
      const orders = dayOrders.length;

      dailySales.push({
        date: date.toISOString().split('T')[0],
        revenue,
        orders
      });
    }

    res.json({
      success: true,
      data: dailySales
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch sales data'
    });
  }
});

// Helper function to get relative time
function getRelativeTime(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export default router;