const express = require('express');
const router = express.Router();
const clientes = require('../controllers/clientesController');

// CRUD
router.post('/', clientes.crearCliente);
router.get('/', clientes.listarClientes);
router.get('/:id', clientes.obtenerCliente);
router.put('/:id', clientes.actualizarCliente);
router.delete('/:id', clientes.eliminarCliente);

// Historial de compras
router.get('/:id/ventas', clientes.ventasPorCliente);

// Estado de cuenta y abonos
router.get('/:id/estado-cuenta', clientes.estadoCuentaCliente);
router.post('/ventas/:id/abono', clientes.registrarAbono);

module.exports = router;
