import express from 'express';
import SizeDistribution from '../models/SizeDistribution.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/v1/size-distributions
// @desc    Get all size distributions (public)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, active } = req.query;
    const query = {};

    if (active !== undefined) {
      query.isActive = active === 'true';
    }
    if (category) {
      query.category = category;
    }

    const distributions = await SizeDistribution.find(query).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: distributions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch size distributions'
    });
  }
});

// @route   GET /api/v1/size-distributions/:id
// @desc    Get single size distribution
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const distribution = await SizeDistribution.findById(req.params.id);
    if (!distribution) {
      return res.status(404).json({
        success: false,
        message: 'Size distribution not found'
      });
    }
    res.json({
      success: true,
      data: distribution
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch size distribution'
    });
  }
});

// @route   POST /api/v1/size-distributions
// @desc    Create new size distribution (admin)
// @access  Private/Admin
router.post('/', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const distribution = new SizeDistribution(req.body);
    await distribution.save();
    res.status(201).json({
      success: true,
      message: 'Size distribution created successfully',
      data: distribution
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create size distribution'
    });
  }
});

// @route   PUT /api/v1/size-distributions/:id
// @desc    Update size distribution (admin)
// @access  Private/Admin
router.put('/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const distribution = await SizeDistribution.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!distribution) {
      return res.status(404).json({
        success: false,
        message: 'Size distribution not found'
      });
    }
    res.json({
      success: true,
      message: 'Size distribution updated successfully',
      data: distribution
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update size distribution'
    });
  }
});

// @route   DELETE /api/v1/size-distributions/:id
// @desc    Delete size distribution (admin)
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const distribution = await SizeDistribution.findByIdAndDelete(req.params.id);
    if (!distribution) {
      return res.status(404).json({
        success: false,
        message: 'Size distribution not found'
      });
    }
    res.json({
      success: true,
      message: 'Size distribution deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete size distribution'
    });
  }
});

// @route   POST /api/v1/size-distributions/calculate
// @desc    Calculate size distribution preview
// @access  Public
router.post('/calculate', async (req, res) => {
  try {
    const { distributionId, sizes, quantity, mode } = req.body;

    let distribution = null;
    let distributionSizes = sizes;

    if (distributionId) {
      distribution = await SizeDistribution.findById(distributionId);
      if (distribution) {
        distributionSizes = distribution.sizes;
      }
    }

    if (!distributionSizes || distributionSizes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No sizes provided'
      });
    }

    const result = SizeDistribution.calculateDistribution(distributionSizes, quantity, mode || 'automatic');

    res.json({
      success: true,
      data: {
        distribution: result,
        total: Object.values(result).reduce((sum, qty) => sum + qty, 0)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to calculate distribution'
    });
  }
});

// @route   GET /api/v1/size-distributions/categories
// @desc    Get available categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await SizeDistribution.distinct('category');
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch categories'
    });
  }
});

export default router;