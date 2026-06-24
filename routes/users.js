import express from 'express';
import {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  addToWishlist,
  removeFromWishlist,
  getWishlist
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, authorize('admin'), getUsers);
router.get('/wishlist', protect, getWishlist);
router.get('/:id', protect, authorize('admin'), getUser);
router.put('/:id', protect, authorize('admin'), updateUser);
router.delete('/:id', protect, authorize('admin'), deleteUser);
router.post('/wishlist', protect, addToWishlist);
router.delete('/wishlist/:productId', protect, removeFromWishlist);

export default router;