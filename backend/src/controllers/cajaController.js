const db = require('../database/connection');

function fechaLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}

class CajaController {
  // Open cash register
  async abrir(req, res) {
    try {
      const { monto_apertura = 0 } = req.body;
      const usuario_id = req.user.id;

      // Check if there's already an open register
      const abierta = await db.get(
        "SELECT * FROM caja WHERE estado = 'abierta' ORDER BY fecha_apertura DESC LIMIT 1"
      );

      if (abierta) {
        return res.status(400).json({ error: 'Ya hay una caja abierta. Ciérrela antes de abrir una nueva.' });
      }

      const result = await db.run(
        'INSERT INTO caja (usuario_id, monto_apertura, fecha_apertura) VALUES (?, ?, ?)',
        [usuario_id, monto_apertura, fechaLocal()]
      );

      const caja = await db.get('SELECT c.*, u.nombre as usuario FROM caja c JOIN usuarios u ON c.usuario_id = u.id WHERE c.id = ?', [result.id]);

      res.status(201).json({ success: true, message: 'Caja abierta exitosamente', caja });
    } catch (error) {
      console.error('Error al abrir caja:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  // Close cash register
  async cerrar(req, res) {
    try {
      const { notas = '' } = req.body;

      const abierta = await db.get(
        "SELECT * FROM caja WHERE estado = 'abierta' ORDER BY fecha_apertura DESC LIMIT 1"
      );

      if (!abierta) {
        return res.status(400).json({ error: 'No hay caja abierta para cerrar.' });
      }

      // Calculate sales during this register session
      const ventas = await db.get(
        `SELECT 
          COUNT(*) as total_ventas,
          COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END), 0) as ventas_efectivo,
          COALESCE(SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END), 0) as ventas_tarjeta
        FROM ventas 
        WHERE fecha >= ? AND fecha <= ?`,
        [abierta.fecha_apertura, fechaLocal()]
      );

      // Calculate expenses during this register session
      const gastos = await db.get(
        `SELECT COALESCE(SUM(monto), 0) as total_gastos
        FROM gastos 
        WHERE fecha >= ? AND fecha <= ?`,
        [abierta.fecha_apertura, fechaLocal()]
      );

      const monto_cierre = abierta.monto_apertura + ventas.ventas_efectivo - gastos.total_gastos;

      await db.run(
        `UPDATE caja SET 
          estado = 'cerrada', 
          monto_cierre = ?, 
          ventas_efectivo = ?, 
          ventas_tarjeta = ?, 
          total_ventas = ?,
          gastos_total = ?,
          fecha_cierre = ?,
          notas = ?
        WHERE id = ?`,
        [monto_cierre, ventas.ventas_efectivo, ventas.ventas_tarjeta, ventas.total_ventas, gastos.total_gastos, fechaLocal(), notas, abierta.id]
      );

      const caja = await db.get('SELECT c.*, u.nombre as usuario FROM caja c JOIN usuarios u ON c.usuario_id = u.id WHERE c.id = ?', [abierta.id]);

      res.json({ success: true, message: 'Caja cerrada exitosamente', caja });
    } catch (error) {
      console.error('Error al cerrar caja:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  // Get current open register status
  async getActual(req, res) {
    try {
      const abierta = await db.get(
        `SELECT c.*, u.nombre as usuario FROM caja c 
         JOIN usuarios u ON c.usuario_id = u.id 
         WHERE c.estado = 'abierta' 
         ORDER BY c.fecha_apertura DESC LIMIT 1`
      );

      if (!abierta) {
        return res.json({ success: true, caja: null, abierta: false });
      }

      // Get real-time sales for the open register
      const ventas = await db.get(
        `SELECT 
          COUNT(*) as total_ventas,
          COALESCE(SUM(total), 0) as total_monto,
          COALESCE(SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END), 0) as ventas_efectivo,
          COALESCE(SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END), 0) as ventas_tarjeta
        FROM ventas 
        WHERE fecha >= ?`,
        [abierta.fecha_apertura]
      );

      // Get real-time expenses for the open register
      const gastos = await db.get(
        `SELECT COALESCE(SUM(monto), 0) as total_gastos
        FROM gastos 
        WHERE DATE(fecha) >= DATE(?)`,
        [abierta.fecha_apertura]
      );

      const dineroEnCaja = abierta.monto_apertura + ventas.ventas_efectivo - gastos.total_gastos;

      res.json({
        success: true,
        abierta: true,
        caja: {
          ...abierta,
          ventas_efectivo: ventas.ventas_efectivo,
          ventas_tarjeta: ventas.ventas_tarjeta,
          total_ventas: ventas.total_ventas,
          total_monto: ventas.total_monto,
          gastos_total: gastos.total_gastos,
          dinero_en_caja: dineroEnCaja
        }
      });
    } catch (error) {
      console.error('Error al obtener caja actual:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  // Get register history
  async getHistorial(req, res) {
    try {
      const { limit = 20 } = req.query;

      const cajas = await db.all(
        `SELECT c.*, u.nombre as usuario FROM caja c 
         JOIN usuarios u ON c.usuario_id = u.id 
         ORDER BY c.fecha_apertura DESC LIMIT ?`,
        [parseInt(limit)]
      );

      res.json({ success: true, cajas });
    } catch (error) {
      console.error('Error al obtener historial de caja:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }
}

module.exports = new CajaController();
