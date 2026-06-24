import express from 'express';
import Settings from '../models/Settings.js';

const router = express.Router();

// @desc    Get all settings
// @route   GET /api/v1/settings
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const { category } = req.query;
    let query = {};

    // Filter by category if provided
    if (category) {
      query.category = category;
    }

    const settings = await Settings.find(query).sort({ category: 1, key: 1 });

    // Convert to key-value object
    const settingsObj = {};
    settings.forEach(setting => {
      settingsObj[setting.key] = {
        value: setting.value,
        description: setting.description,
        order: setting.order || 0,
        image: setting.image || '',
        category: setting.category
      };
    });

    res.status(200).json({
      success: true,
      settings: settingsObj
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single setting
// @route   GET /api/v1/settings/:key
// @access  Public
router.get('/:key', async (req, res, next) => {
  try {
    const setting = await Settings.findOne({ key: req.params.key });

    if (!setting) {
      return res.status(200).json({
        success: true,
        setting: null
      });
    }

    res.status(200).json({
      success: true,
      setting
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Set a setting
// @route   PUT /api/v1/settings/:key
// @access  Private (Admin)
router.put('/:key', async (req, res, next) => {
  try {
    const { value, description, category, order, image } = req.body;

    let setting = await Settings.findOne({ key: req.params.key });

    if (setting) {
      // Update existing
      setting.value = value;
      if (description !== undefined) setting.description = description;
      if (category !== undefined) setting.category = category;
      if (order !== undefined) setting.order = order;
      if (image !== undefined) setting.image = image;
      if (req.user) setting.updatedBy = req.user._id;
      await setting.save();
    } else {
      // Create new
      setting = await Settings.create({
        key: req.params.key,
        value,
        description,
        category: category || 'general',
        order: order || 0,
        image: image || '',
        updatedBy: req.user?._id
      });
    }

    res.status(200).json({
      success: true,
      setting
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Bulk update settings
// @route   PUT /api/v1/settings
// @access  Private (Admin)
router.put('/', async (req, res, next) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Please provide settings object'
      });
    }

    const updates = [];

    for (const [key, value] of Object.entries(settings)) {
      let setting = await Settings.findOne({ key });

      if (setting) {
        setting.value = value;
        if (req.user) setting.updatedBy = req.user._id;
        updates.push(setting.save());
      } else {
        updates.push(Settings.create({
          key,
          value,
          updatedBy: req.user?._id
        }));
      }
    }

    await Promise.all(updates);

    // Fetch all updated settings
    const allSettings = await Settings.find().sort({ category: 1, key: 1 });
    const settingsObj = {};
    allSettings.forEach(setting => {
      settingsObj[setting.key] = setting.value;
    });

    res.status(200).json({
      success: true,
      settings: settingsObj
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Delete a setting
// @route   DELETE /api/v1/settings/:key
// @access  Private (Admin)
router.delete('/:key', async (req, res, next) => {
  try {
    const setting = await Settings.findOneAndDelete({ key: req.params.key });

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Setting deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;