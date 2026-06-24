import express from 'express';
import QuoteRequest from '../models/QuoteRequest.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/v1/quotes
// @desc    Submit a new quote request (public)
// @access  Public
router.post('/', async (req, res) => {
  try {
    const quoteRequest = new QuoteRequest(req.body);
    await quoteRequest.save();

    res.status(201).json({
      success: true,
      message: 'Quote request submitted successfully',
      referenceNumber: quoteRequest.referenceNumber,
      data: quoteRequest
    });
  } catch (error) {
    console.error('Quote request error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit quote request'
    });
  }
});

// @route   GET /api/v1/quotes/:referenceNumber
// @desc    Get quote request by reference number (public - for tracking)
// @access  Public
router.get('/:referenceNumber', async (req, res) => {
  try {
    const quoteRequest = await QuoteRequest.findOne({
      referenceNumber: req.params.referenceNumber
    });

    if (!quoteRequest) {
      return res.status(404).json({
        success: false,
        message: 'Quote request not found'
      });
    }

    res.json({
      success: true,
      data: quoteRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch quote request'
    });
  }
});

// @route   GET /api/v1/quotes
// @desc    Get all quote requests (admin)
// @access  Private/Admin
router.get('/', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { 'customerInfo.fullName': { $regex: search, $options: 'i' } },
        { 'customerInfo.companyName': { $regex: search, $options: 'i' } },
        { 'customerInfo.emailAddress': { $regex: search, $options: 'i' } },
        { referenceNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const quoteRequests = await QuoteRequest.find(query)
      .sort({ submittedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('assignedTo', 'name email');

    const total = await QuoteRequest.countDocuments(query);

    res.json({
      success: true,
      data: quoteRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch quote requests'
    });
  }
});

// @route   GET /api/v1/quotes/admin/:id
// @desc    Get single quote request by ID (admin)
// @access  Private/Admin
router.get('/admin/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const quoteRequest = await QuoteRequest.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('adminNotes.addedBy', 'name email');

    if (!quoteRequest) {
      return res.status(404).json({
        success: false,
        message: 'Quote request not found'
      });
    }

    res.json({
      success: true,
      data: quoteRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch quote request'
    });
  }
});

// @route   PUT /api/v1/quotes/:id
// @desc    Update quote request status (admin)
// @access  Private/Admin
router.put('/:id', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { status, adminNotes, quotation, assignedTo, internalNotes, expectedResponseTime } = req.body;

    const quoteRequest = await QuoteRequest.findById(req.params.id);

    if (!quoteRequest) {
      return res.status(404).json({
        success: false,
        message: 'Quote request not found'
      });
    }

    // Update status
    if (status) {
      quoteRequest.status = status;
    }

    // Add admin note
    if (adminNotes) {
      quoteRequest.adminNotes.push({
        note: adminNotes,
        addedBy: req.user.id
      });
    }

    // Update quotation details
    if (quotation) {
      quoteRequest.quotation = { ...quoteRequest.quotation, ...quotation };
    }

    // Assign team member
    if (assignedTo) {
      quoteRequest.assignedTo = assignedTo;
    }

    // Internal notes
    if (internalNotes !== undefined) {
      quoteRequest.internalNotes = internalNotes;
    }

    // Expected response time
    if (expectedResponseTime) {
      quoteRequest.expectedResponseTime = expectedResponseTime;
    }

    await quoteRequest.save();

    res.json({
      success: true,
      message: 'Quote request updated successfully',
      data: quoteRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update quote request'
    });
  }
});

// @route   POST /api/v1/quotes/:id/communicate
// @desc    Add communication to quote request (admin)
// @access  Private/Admin
router.post('/:id/communicate', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const { message, type = 'admin' } = req.body;

    const quoteRequest = await QuoteRequest.findById(req.params.id);

    if (!quoteRequest) {
      return res.status(404).json({
        success: false,
        message: 'Quote request not found'
      });
    }

    quoteRequest.communications.push({
      type,
      message,
      sentBy: req.user.id
    });

    await quoteRequest.save();

    res.json({
      success: true,
      message: 'Communication added successfully',
      data: quoteRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add communication'
    });
  }
});

// @route   GET /api/v1/quotes/stats/summary
// @desc    Get quote request statistics (admin)
// @access  Private/Admin
router.get('/stats/summary', protect, authorize('admin', 'superadmin'), async (req, res) => {
  try {
    const totalRequests = await QuoteRequest.countDocuments();
    const newRequests = await QuoteRequest.countDocuments({ status: 'New' });
    const underReview = await QuoteRequest.countDocuments({ status: 'Under Review' });
    const quoted = await QuoteRequest.countDocuments({ status: 'Quoted' });
    const negotiating = await QuoteRequest.countDocuments({ status: 'Negotiating' });
    const approved = await QuoteRequest.countDocuments({ status: 'Approved' });
    const production = await QuoteRequest.countDocuments({ status: 'Production' });
    const completed = await QuoteRequest.countDocuments({ status: 'Completed' });
    const rejected = await QuoteRequest.countDocuments({ status: 'Rejected' });

    // Recent submissions
    const recentRequests = await QuoteRequest.find()
      .sort({ submittedAt: -1 })
      .limit(5)
      .select('referenceNumber customerInfo.fullName customerInfo.companyName status submittedAt');

    res.json({
      success: true,
      data: {
        totalRequests,
        statusBreakdown: {
          new: newRequests,
          underReview,
          quoted,
          negotiating,
          approved,
          production,
          completed,
          rejected
        },
        recentRequests
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch statistics'
    });
  }
});

// @route   DELETE /api/v1/quotes/:id
// @desc    Delete quote request (admin)
// @access  Private/Superadmin
router.delete('/:id', protect, authorize('superadmin'), async (req, res) => {
  try {
    const quoteRequest = await QuoteRequest.findByIdAndDelete(req.params.id);

    if (!quoteRequest) {
      return res.status(404).json({
        success: false,
        message: 'Quote request not found'
      });
    }

    res.json({
      success: true,
      message: 'Quote request deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete quote request'
    });
  }
});

export default router;