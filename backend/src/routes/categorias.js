const express = require('express');
const router = express.Router();
const categoriasController = require('../controllers/categoriasController');
const { authMiddleware, isAdmin } = require('../middleware/auth');

router.get('/', authMiddleware, categoriasController.getAll);
router.post('/', authMiddleware, isAdmin, categoriasController.create);
router.put('/:id', authMiddleware, isAdmin, categoriasController.update);
router.delete('/:id', authMiddleware, isAdmin, categoriasController.delete);

module.exports = router;
