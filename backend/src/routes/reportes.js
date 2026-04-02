const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');
const { authMiddleware, isAdmin } = require('../middleware/auth');

router.get('/ventas-por-fecha', authMiddleware, isAdmin, reportesController.getVentasPorFecha);
router.get('/utilidades', authMiddleware, isAdmin, reportesController.getUtilidades);
router.get('/inventario', authMiddleware, isAdmin, reportesController.getInventarioActual);
router.get('/dashboard', authMiddleware, reportesController.getDashboardStats);

// PDF endpoints
router.get('/pdf/ventas', authMiddleware, isAdmin, reportesController.pdfVentasPorFecha.bind(reportesController));
router.get('/pdf/inventario', authMiddleware, isAdmin, reportesController.pdfInventario.bind(reportesController));
router.get('/pdf/top-productos', authMiddleware, isAdmin, reportesController.pdfTopProductos.bind(reportesController));
router.get('/pdf/utilidades', authMiddleware, isAdmin, reportesController.pdfUtilidades.bind(reportesController));

module.exports = router;
