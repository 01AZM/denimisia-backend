import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  getProducts,
  getProduct,
  getFeaturedProducts,
  createProduct,
  updateProduct,
  updateProductStock,
  deleteProduct,
  getProductById,
  getAllProductsAdmin
} from '../controllers/productController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed (jpeg, jpg, png, webp)'));
    }
  }
});

router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/admin/all', protect, authorize('admin'), getAllProductsAdmin);
router.get('/:slug', getProduct);
router.get('/id/:id', getProductById);

router.post('/', protect, authorize('admin'), createProduct);
router.put('/:id', protect, authorize('admin'), updateProduct);
router.put('/:id/stock', protect, authorize('admin'), updateProductStock);
router.delete('/:id', protect, authorize('admin'), deleteProduct);

// Upload product images
router.post('/upload', protect, authorize('admin'), upload.array('images', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, message: 'No files uploaded' });
  }
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const imageUrls = req.files.map(file => `${baseUrl}/uploads/${file.filename}`);
  res.json({ success: true, images: imageUrls });
});

export default router;