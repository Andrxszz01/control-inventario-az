const express = require('express');
const router = express.Router();
const { productController, upload } = require('../controllers/productController');
const { authMiddleware, isAdmin } = require('../middleware/auth');

router.get('/', authMiddleware, productController.getAll.bind(productController));
router.get('/low-stock', authMiddleware, productController.getLowStock.bind(productController));
router.get('/barcode/:code', authMiddleware, productController.findByBarcode.bind(productController));
router.get('/:id', authMiddleware, productController.getById.bind(productController));
router.get('/:id/qr', authMiddleware, productController.generateQR.bind(productController));
router.post('/', authMiddleware, isAdmin, productController.create.bind(productController));
router.put('/:id', authMiddleware, isAdmin, productController.update.bind(productController));
router.post('/:id/imagen', authMiddleware, isAdmin, upload.single('imagen'), productController.uploadImage.bind(productController));
router.delete('/:id/imagen', authMiddleware, isAdmin, productController.deleteImage.bind(productController));
router.delete('/:id', authMiddleware, isAdmin, productController.delete.bind(productController));

module.exports = router;
