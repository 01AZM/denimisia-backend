import WholesaleTier from '../models/WholesaleTier.js';
import AuditLog from '../models/AuditLog.js';

// Helper function to create audit log
const createAuditLog = async (action, entityId, userId, userName, changes, previousValues, newValues, description) => {
  try {
    await AuditLog.create({
      action,
      entityType: 'wholesale_tier',
      entityId,
      userId,
      userName: userName || 'System',
      changes,
      previousValues,
      newValues,
      description
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
  }
};

// @desc    Get all wholesale tiers
// @route   GET /api/v1/wholesale
// @access  Public
export const getWholesaleTiers = async (req, res, next) => {
  try {
    const tiers = await WholesaleTier.find({ status: 'active' }).sort({ displayOrder: 1 });

    res.status(200).json({
      success: true,
      count: tiers.length,
      tiers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all wholesale tiers (including inactive) for admin
// @route   GET /api/v1/wholesale/admin/all
// @access  Private (Admin)
export const getAllWholesaleTiers = async (req, res, next) => {
  try {
    const tiers = await WholesaleTier.find().sort({ displayOrder: 1 });

    res.status(200).json({
      success: true,
      count: tiers.length,
      tiers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single wholesale tier
// @route   GET /api/v1/wholesale/:id
// @access  Private (Admin)
export const getWholesaleTier = async (req, res, next) => {
  try {
    const tier = await WholesaleTier.findById(req.params.id);

    if (!tier) {
      return res.status(404).json({
        success: false,
        message: 'Pricing tier not found'
      });
    }

    res.status(200).json({
      success: true,
      tier
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new wholesale tier
// @route   POST /api/v1/wholesale
// @access  Private (Admin)
export const createWholesaleTier = async (req, res, next) => {
  try {
    const { minQuantity, maxQuantity, discountPercentage, borderColor, status, displayOrder } = req.body;

    // Check for overlapping tiers
    const existingTiers = await WholesaleTier.find({ status: 'active' })
      .where('minQuantity').lte(maxQuantity)
      .where('maxQuantity').gte(minQuantity);

    if (existingTiers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This quantity range overlaps with an existing tier'
      });
    }

    const tier = await WholesaleTier.create({
      minQuantity,
      maxQuantity,
      discountPercentage,
      borderColor: borderColor || '#3B82F6',
      status: status || 'active',
      displayOrder,
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    // Create audit log
    await createAuditLog(
      'create',
      tier._id,
      req.user?._id,
      req.user?.name,
      { action: 'create' },
      {},
      tier.toObject(),
      `Created new pricing tier: ${minQuantity}-${maxQuantity} with ${discountPercentage}% discount`
    );

    res.status(201).json({
      success: true,
      tier
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

// @desc    Update wholesale tier
// @route   PUT /api/v1/wholesale/:id
// @access  Private (Admin)
export const updateWholesaleTier = async (req, res, next) => {
  try {
    const { minQuantity, maxQuantity, discountPercentage, borderColor, status, displayOrder } = req.body;

    const existingTier = await WholesaleTier.findById(req.params.id);

    if (!existingTier) {
      return res.status(404).json({
        success: false,
        message: 'Pricing tier not found'
      });
    }

    // Store previous values for audit
    const previousValues = existingTier.toObject();

    // Check for overlapping tiers (excluding current tier)
    const overlappingTiers = await WholesaleTier.find({
      _id: { $ne: req.params.id },
      status: 'active'
    })
      .where('minQuantity').lte(maxQuantity || existingTier.maxQuantity)
      .where('maxQuantity').gte(minQuantity || existingTier.minQuantity);

    if (overlappingTiers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This quantity range overlaps with an existing tier'
      });
    }

    const tier = await WholesaleTier.findByIdAndUpdate(
      req.params.id,
      {
        minQuantity,
        maxQuantity,
        discountPercentage,
        borderColor,
        status,
        displayOrder,
        updatedBy: req.user?._id
      },
      { new: true, runValidators: true }
    );

    // Create audit log
    await createAuditLog(
      'update',
      tier._id,
      req.user?._id,
      req.user?.name,
      { action: 'update' },
      previousValues,
      tier.toObject(),
      `Updated pricing tier: ${tier.minQuantity}-${tier.maxQuantity}`
    );

    res.status(200).json({
      success: true,
      tier
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

// @desc    Delete wholesale tier
// @route   DELETE /api/v1/wholesale/:id
// @access  Private (Admin)
export const deleteWholesaleTier = async (req, res, next) => {
  try {
    const tier = await WholesaleTier.findById(req.params.id);

    if (!tier) {
      return res.status(404).json({
        success: false,
        message: 'Pricing tier not found'
      });
    }

    // Store for audit
    const deletedValues = tier.toObject();

    await WholesaleTier.findByIdAndDelete(req.params.id);

    // Create audit log
    await createAuditLog(
      'delete',
      tier._id,
      req.user?._id,
      req.user?.name,
      { action: 'delete' },
      deletedValues,
      {},
      `Deleted pricing tier: ${tier.minQuantity}-${tier.maxQuantity}`
    );

    res.status(200).json({
      success: true,
      message: 'Pricing tier deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle tier status
// @route   PUT /api/v1/wholesale/:id/toggle
// @access  Private (Admin)
export const toggleTierStatus = async (req, res, next) => {
  try {
    const tier = await WholesaleTier.findById(req.params.id);

    if (!tier) {
      return res.status(404).json({
        success: false,
        message: 'Pricing tier not found'
      });
    }

    const previousStatus = tier.status;
    const newStatus = previousStatus === 'active' ? 'inactive' : 'active';

    tier.status = newStatus;
    tier.updatedBy = req.user?._id;
    await tier.save();

    // Create audit log
    await createAuditLog(
      'toggle_status',
      tier._id,
      req.user?._id,
      req.user?.name,
      { action: 'toggle_status', field: 'status' },
      { status: previousStatus },
      { status: newStatus },
      `Changed tier ${tier.minQuantity}-${tier.maxQuantity} status from ${previousStatus} to ${newStatus}`
    );

    res.status(200).json({
      success: true,
      tier
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Duplicate tier
// @route   POST /api/v1/wholesale/:id/duplicate
// @access  Private (Admin)
export const duplicateTier = async (req, res, next) => {
  try {
    const tier = await WholesaleTier.findById(req.params.id);

    if (!tier) {
      return res.status(404).json({
        success: false,
        message: 'Pricing tier not found'
      });
    }

    // Get highest display order
    const lastTier = await WholesaleTier.findOne().sort({ displayOrder: -1 });
    const newDisplayOrder = lastTier ? lastTier.displayOrder + 1 : 1;

    const newTier = await WholesaleTier.create({
      minQuantity: tier.minQuantity,
      maxQuantity: tier.maxQuantity,
      discountPercentage: tier.discountPercentage,
      borderColor: tier.borderColor,
      status: 'inactive',
      displayOrder: newDisplayOrder,
      createdBy: req.user?._id,
      updatedBy: req.user?._id
    });

    // Create audit log
    await createAuditLog(
      'duplicate',
      newTier._id,
      req.user?._id,
      req.user?.name,
      { action: 'duplicate', originalId: tier._id },
      tier.toObject(),
      newTier.toObject(),
      `Duplicated tier ${tier.minQuantity}-${tier.maxQuantity}`
    );

    res.status(201).json({
      success: true,
      tier: newTier
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reorder tiers
// @route   PUT /api/v1/wholesale/reorder
// @access  Private (Admin)
export const reorderTiers = async (req, res, next) => {
  try {
    const { tierIds } = req.body;

    if (!tierIds || !Array.isArray(tierIds)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of tier IDs'
      });
    }

    // Update display order for each tier
    const updates = tierIds.map((id, index) => {
      return WholesaleTier.findByIdAndUpdate(id, { displayOrder: index + 1 });
    });

    await Promise.all(updates);

    // Get updated tiers
    const tiers = await WholesaleTier.find().sort({ displayOrder: 1 });

    // Create audit log
    await createAuditLog(
      'reorder',
      null,
      req.user?._id,
      req.user?.name,
      { action: 'reorder', tierIds },
      {},
      {},
      'Reordered pricing tiers'
    );

    res.status(200).json({
      success: true,
      tiers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk create tiers
// @route   POST /api/v1/wholesale/bulk
// @access  Private (Admin)
export const bulkCreateTiers = async (req, res, next) => {
  try {
    const { tiers } = req.body;

    if (!tiers || !Array.isArray(tiers) || tiers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of tier data'
      });
    }

    // Validate all tiers first
    const errors = [];
    tiers.forEach((tier, index) => {
      if (!tier.minQuantity || tier.minQuantity < 1) {
        errors.push(`Row ${index + 1}: Minimum quantity must be at least 1`);
      }
      if (!tier.maxQuantity || tier.maxQuantity < tier.minQuantity) {
        errors.push(`Row ${index + 1}: Maximum quantity must be >= minimum quantity`);
      }
      if (tier.discountPercentage === undefined || tier.discountPercentage < 0 || tier.discountPercentage > 100) {
        errors.push(`Row ${index + 1}: Discount must be between 0 and 100`);
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors
      });
    }

    // Get last display order
    const lastTier = await WholesaleTier.findOne().sort({ displayOrder: -1 });
    let orderOffset = lastTier ? lastTier.displayOrder : 0;

    // Create tiers
    const createdTiers = await WholesaleTier.insertMany(
      tiers.map((tier, index) => ({
        minQuantity: tier.minQuantity,
        maxQuantity: tier.maxQuantity,
        discountPercentage: tier.discountPercentage,
        borderColor: tier.borderColor || '#3B82F6',
        status: tier.status || 'active',
        displayOrder: orderOffset + index + 1,
        createdBy: req.user?._id,
        updatedBy: req.user?._id
      }))
    );

    // Create audit log
    await createAuditLog(
      'bulk_create',
      null,
      req.user?._id,
      req.user?.name,
      { action: 'bulk_create', count: createdTiers.length },
      {},
      { count: createdTiers.length },
      `Bulk created ${createdTiers.length} pricing tiers`
    );

    res.status(201).json({
      success: true,
      count: createdTiers.length,
      tiers: createdTiers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk update tiers
// @route   PUT /api/v1/wholesale/bulk
// @access  Private (Admin)
export const bulkUpdateTiers = async (req, res, next) => {
  try {
    const { tiers } = req.body;

    if (!tiers || !Array.isArray(tiers) || tiers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of tier data with IDs'
      });
    }

    const updatedTiers = [];

    for (const tier of tiers) {
      if (!tier._id) {
        continue;
      }

      const existingTier = await WholesaleTier.findById(tier._id);
      if (existingTier) {
        const updated = await WholesaleTier.findByIdAndUpdate(
          tier._id,
          {
            minQuantity: tier.minQuantity,
            maxQuantity: tier.maxQuantity,
            discountPercentage: tier.discountPercentage,
            borderColor: tier.borderColor,
            status: tier.status,
            displayOrder: tier.displayOrder,
            updatedBy: req.user?._id
          },
          { new: true, runValidators: true }
        );
        updatedTiers.push(updated);
      }
    }

    // Create audit log
    await createAuditLog(
      'bulk_update',
      null,
      req.user?._id,
      req.user?.name,
      { action: 'bulk_update', count: updatedTiers.length },
      {},
      { count: updatedTiers.length },
      `Bulk updated ${updatedTiers.length} pricing tiers`
    );

    res.status(200).json({
      success: true,
      count: updatedTiers.length,
      tiers: updatedTiers
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Import tiers from CSV data
// @route   POST /api/v1/wholesale/import
// @access  Private (Admin)
export const importTiers = async (req, res, next) => {
  try {
    const { data } = req.body;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide CSV data as array of objects'
      });
    }

    // Get last display order
    const lastTier = await WholesaleTier.findOne().sort({ displayOrder: -1 });
    let orderOffset = lastTier ? lastTier.displayOrder : 0;

    // Process and create tiers
    const tiersToCreate = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 2; // Account for header row and 0-index

      // Validate required fields
      const minQty = parseInt(row.minQuantity) || parseInt(row.min_qty) || parseInt(row.Minimum);
      const maxQty = parseInt(row.maxQuantity) || parseInt(row.max_qty) || parseInt(row.Maximum);
      const discount = parseFloat(row.discountPercentage) || parseFloat(row.discount) || parseFloat(row.Discount) || 0;
      const borderColor = row.borderColor || row.color || '#3B82F6';
      const status = row.status === 'inactive' ? 'inactive' : 'active';

      if (!minQty || minQty < 1) {
        errors.push(`Row ${rowNum}: Invalid minimum quantity`);
        continue;
      }
      if (!maxQty || maxQty < minQty) {
        errors.push(`Row ${rowNum}: Invalid maximum quantity`);
        continue;
      }
      if (discount < 0 || discount > 100) {
        errors.push(`Row ${rowNum}: Discount must be 0-100%`);
        continue;
      }

      tiersToCreate.push({
        minQuantity: minQty,
        maxQuantity: maxQty,
        discountPercentage: discount,
        borderColor,
        status,
        displayOrder: orderOffset + tiersToCreate.length + 1,
        createdBy: req.user?._id,
        updatedBy: req.user?._id
      });
    }

    if (tiersToCreate.length === 0 && errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid tiers found',
        errors
      });
    }

    const createdTiers = await WholesaleTier.insertMany(tiersToCreate);

    // Create audit log
    await createAuditLog(
      'import',
      null,
      req.user?._id,
      req.user?.name,
      { action: 'import', count: createdTiers.length },
      {},
      { count: createdTiers.length },
      `Imported ${createdTiers.length} pricing tiers from CSV`
    );

    res.status(201).json({
      success: true,
      count: createdTiers.length,
      tiers: createdTiers,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export tiers to CSV format
// @route   GET /api/v1/wholesale/export
// @access  Private (Admin)
export const exportTiers = async (req, res, next) => {
  try {
    const tiers = await WholesaleTier.find().sort({ displayOrder: 1 });

    const csvData = tiers.map(tier => ({
      minQuantity: tier.minQuantity,
      maxQuantity: tier.maxQuantity,
      discountPercentage: tier.discountPercentage,
      borderColor: tier.borderColor,
      status: tier.status,
      displayOrder: tier.displayOrder
    }));

    // Create audit log
    await createAuditLog(
      'export',
      null,
      req.user?._id,
      req.user?.name,
      { action: 'export', count: tiers.length },
      {},
      { count: tiers.length },
      `Exported ${tiers.length} pricing tiers to CSV`
    );

    res.status(200).json({
      success: true,
      count: tiers.length,
      data: csvData
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get audit logs
// @route   GET /api/v1/wholesale/audit
// @access  Private (Admin)
export const getAuditLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const logs = await AuditLog.find({ entityType: 'wholesale_tier' })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email');

    const total = await AuditLog.countDocuments({ entityType: 'wholesale_tier' });

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      logs
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Calculate price with wholesale discount
// @route   POST /api/v1/wholesale/calculate
// @access  Public
export const calculatePrice = async (req, res, next) => {
  try {
    const { originalPrice, quantity } = req.body;

    if (!originalPrice || originalPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid original price'
      });
    }

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid quantity'
      });
    }

    // Find applicable tier
    const tier = await WholesaleTier.findOne({
      status: 'active'
    })
      .where('minQuantity').lte(quantity)
      .where('maxQuantity').gte(quantity)
      .sort({ displayOrder: 1 });

    const discountPercentage = tier ? tier.discountPercentage : 0;
    const discountAmount = originalPrice * (discountPercentage / 100);
    const discountedPrice = originalPrice - discountAmount;
    const savings = discountAmount;

    res.status(200).json({
      success: true,
      pricing: {
        originalPrice,
        quantity,
        discountPercentage,
        discountAmount: Math.round(savings * 100) / 100,
        discountedPrice: Math.round(discountedPrice * 100) / 100,
        savingsPerUnit: Math.round(savings * 100) / 100,
        totalSavings: Math.round(savings * quantity * 100) / 100,
        appliedTier: tier ? {
          minQuantity: tier.minQuantity,
          maxQuantity: tier.maxQuantity,
          borderColor: tier.borderColor
        } : null
      }
    });
  } catch (error) {
    next(error);
  }
};