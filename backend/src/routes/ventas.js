const express = require('express');
const router = express.Router();
const ventasController = require('../controllers/ventasController');
const { authMiddleware, isAdmin } = require('../middleware/auth');

router.post('/', authMiddleware, ventasController.create.bind(ventasController));
router.get('/', authMiddleware, ventasController.getAll.bind(ventasController));
router.get('/stats', authMiddleware, ventasController.getStats.bind(ventasController));
router.get('/:id', authMiddleware, ventasController.getById.bind(ventasController));
router.get('/:id/ticket', authMiddleware, ventasController.getTicket.bind(ventasController));
router.get('/:id/ticket-html', authMiddleware, ventasController.getTicketHtml.bind(ventasController));
router.get('/:id/ticket-text', authMiddleware, ventasController.getTicketText.bind(ventasController));
router.delete('/:id', authMiddleware, isAdmin, ventasController.delete.bind(ventasController));

module.exports = router;
