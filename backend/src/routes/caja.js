const express = require('express');
const router = express.Router();
const cajaController = require('../controllers/cajaController');
const { authMiddleware } = require('../middleware/auth');

router.get('/actual', authMiddleware, cajaController.getActual.bind(cajaController));
router.get('/historial', authMiddleware, cajaController.getHistorial.bind(cajaController));
router.post('/abrir', authMiddleware, cajaController.abrir.bind(cajaController));
router.post('/cerrar', authMiddleware, cajaController.cerrar.bind(cajaController));

module.exports = router;
