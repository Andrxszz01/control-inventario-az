const express = require('express');
const router = express.Router();
const gastosController = require('../controllers/gastosController');
const { authMiddleware, isAdmin } = require('../middleware/auth');

router.post('/', authMiddleware, isAdmin, gastosController.create);
router.get('/', authMiddleware, isAdmin, gastosController.getAll);
router.get('/stats', authMiddleware, isAdmin, gastosController.getStats);
router.get('/:id', authMiddleware, isAdmin, gastosController.getById);
router.put('/:id', authMiddleware, isAdmin, gastosController.update);
router.delete('/:id', authMiddleware, isAdmin, gastosController.delete);

module.exports = router;
