const db = require('../database/connection');

// CRUD Clientes
exports.crearCliente = async (req, res) => {
  try {
    const {
      nombre,
      telefono,
      direccion,
      email,
      tipo = 'cliente',
      notas = '',
      alergias = '',
      observaciones = '',
      ultima_visita = null,
    } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const result = await db.run(
      `INSERT INTO clientes
      (nombre, telefono, direccion, email, tipo, notas, alergias, observaciones, ultima_visita)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, telefono, direccion, email, tipo, notas, alergias, observaciones, ultima_visita]
    );
    res.json({
      id: result.lastID,
      nombre,
      telefono,
      direccion,
      email,
      tipo,
      notas,
      alergias,
      observaciones,
      ultima_visita,
    });
  } catch (e) {
    res.status(500).json({ error: 'Error al crear cliente' });
  }
};

exports.listarClientes = async (req, res) => {
  try {
    const clientes = await db.all('SELECT * FROM clientes ORDER BY nombre');
    res.json(clientes);
  } catch (e) {
    res.status(500).json({ error: 'Error al listar clientes' });
  }
};

exports.obtenerCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const cliente = await db.get('SELECT * FROM clientes WHERE id = ?', [id]);
    if (!cliente) return res.status(404).json({ error: 'No encontrado' });
    res.json(cliente);
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
};

exports.actualizarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      telefono,
      direccion,
      email,
      tipo = 'cliente',
      notas = '',
      alergias = '',
      observaciones = '',
      ultima_visita = null,
    } = req.body;
    await db.run(
      `UPDATE clientes
       SET nombre=?, telefono=?, direccion=?, email=?, tipo=?, notas=?, alergias=?, observaciones=?, ultima_visita=?
       WHERE id=?`,
      [nombre, telefono, direccion, email, tipo, notas, alergias, observaciones, ultima_visita, id]
    );
    res.json({
      id,
      nombre,
      telefono,
      direccion,
      email,
      tipo,
      notas,
      alergias,
      observaciones,
      ultima_visita,
    });
  } catch (e) {
    res.status(500).json({ error: 'Error al actualizar cliente' });
  }
};

exports.eliminarCliente = async (req, res) => {
  try {
    const { id } = req.params;
    // No permitir eliminar si tiene ventas pendientes
    const deuda = await db.get('SELECT COUNT(*) as c FROM ventas WHERE cliente_id=? AND estado="pendiente"', [id]);
    if (deuda.c > 0) return res.status(400).json({ error: 'Cliente con deudas activas' });
    await db.run('DELETE FROM clientes WHERE id=?', [id]);
    res.json({ id });
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar cliente' });
  }
};

// Historial de compras
exports.ventasPorCliente = async (req, res) => {
  try {
    const { id } = req.params;
    const ventas = await db.all('SELECT * FROM ventas WHERE cliente_id=? ORDER BY fecha DESC', [id]);
    res.json(ventas);
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
};

// Estado de cuenta y abonos
exports.estadoCuentaCliente = async (req, res) => {
  try {
    const { id } = req.params;
    // Ventas pendientes
    const ventas = await db.all('SELECT * FROM ventas WHERE cliente_id=? AND estado="pendiente"', [id]);
    for (let venta of ventas) {
      const abonos = await db.all('SELECT * FROM abonos WHERE venta_id=?', [venta.id]);
      venta.abonos = abonos;
      venta.saldo = venta.total - abonos.reduce((s, a) => s + a.monto, 0);
    }
    res.json(ventas);
  } catch (e) {
    res.status(500).json({ error: 'Error al obtener estado de cuenta' });
  }
};

exports.registrarAbono = async (req, res) => {
  try {
    const { id } = req.params; // venta_id
    const { monto } = req.body;
    if (!monto || monto <= 0) return res.status(400).json({ error: 'Monto inválido' });
    // Obtener venta y abonos
    const venta = await db.get('SELECT * FROM ventas WHERE id=?', [id]);
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
    const abonos = await db.all('SELECT * FROM abonos WHERE venta_id=?', [id]);
    const totalAbonado = abonos.reduce((s, a) => s + a.monto, 0);
    const saldo = venta.total - totalAbonado;
    if (monto > saldo) return res.status(400).json({ error: 'Abono excede saldo' });
    await db.run('INSERT INTO abonos (venta_id, monto) VALUES (?, ?)', [id, monto]);
    // Si se cubre la deuda, marcar como pagada
    if (monto === saldo) {
      await db.run('UPDATE ventas SET estado="pagada" WHERE id=?', [id]);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error al registrar abono' });
  }
};
