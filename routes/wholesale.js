import express from 'express';
import { Router } from 'express';
import {
  getWholesaleTiers,
  getAllWholesaleTiers,
  getWholesaleTier,
  createWholesaleTier,
  updateWholesaleTier,
  deleteWholesaleTier,
  toggleTierStatus,
  duplicateTier,
  reorderTiers,
  bulkCreateTiers,
  bulkUpdateTiers,
  importTiers,
  exportTiers,
  getAuditLogs,
  calculatePrice
} from '../controllers/wholesaleController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Public routes
router.get('/', getWholesaleTiers);
router.post('/calculate', calculatePrice);

// Protected Admin routes
router.get('/admin/all', protect, authorize('admin'), getAllWholesaleTiers);
router.get('/audit', protect, authorize('admin'), getAuditLogs);
router.get('/export', protect, authorize('admin'), exportTiers);

router.get('/:id', protect, authorize('admin'), getWholesaleTier);
router.post('/', protect, authorize('admin'), createWholesaleTier);
router.put('/:id', protect, authorize('admin'), updateWholesaleTier);
router.delete('/:id', protect, authorize('admin'), deleteWholesaleTier);
router.put('/:id/toggle', protect, authorize('admin'), toggleTierStatus);
router.post('/:id/duplicate', protect, authorize('admin'), duplicateTier);
router.put('/reorder', protect, authorize('admin'), reorderTiers);
router.post('/bulk', protect, authorize('admin'), bulkCreateTiers);
router.put('/bulk', protect, authorize('admin'), bulkUpdateTiers);
router.post('/import', protect, authorize('admin'), importTiers);

export default router;