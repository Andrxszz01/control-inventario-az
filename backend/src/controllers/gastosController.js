const db = require('../database/connection');

function hoyLocal() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function mesLocal() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }

class GastosController {
  async create(req, res) {
    try {
      const { descripcion, monto, categoria, fecha } = req.body;
      const usuario_id = req.user.id;

      const result = await db.run(
        'INSERT INTO gastos (descripcion, monto, categoria, fecha, usuario_id) VALUES (?, ?, ?, ?, ?)',
        [descripcion, monto, categoria, fecha, usuario_id]
      );

      const gasto = await db.get('SELECT * FROM gastos WHERE id = ?', [result.id]);

      res.status(201).json({
        success: true,
        message: 'Gasto registrado exitosamente',
        gasto
      });
    } catch (error) {
      console.error('Error al crear gasto:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async getAll(req, res) {
    try {
      const { fechaInicio, fechaFin, categoria } = req.query;

      let sql = `
        SELECT g.*, u.nombre as registrado_por
        FROM gastos g
        JOIN usuarios u ON g.usuario_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (fechaInicio) {
        sql += ' AND DATE(g.fecha) >= DATE(?)';
        params.push(fechaInicio);
      }

      if (fechaFin) {
        sql += ' AND DATE(g.fecha) <= DATE(?)';
        params.push(fechaFin);
      }

      if (categoria) {
        sql += ' AND g.categoria = ?';
        params.push(categoria);
      }

      sql += ' ORDER BY g.fecha DESC';

      const gastos = await db.all(sql, params);

      res.json({ success: true, gastos });
    } catch (error) {
      console.error('Error al obtener gastos:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async getById(req, res) {
    try {
      const gasto = await db.get(
        `SELECT g.*, u.nombre as registrado_por
         FROM gastos g
         JOIN usuarios u ON g.usuario_id = u.id
         WHERE g.id = ?`,
        [req.params.id]
      );

      if (!gasto) {
        return res.status(404).json({ error: 'Gasto no encontrado' });
      }

      res.json({ success: true, gasto });
    } catch (error) {
      console.error('Error al obtener gasto:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { descripcion, monto, categoria, fecha } = req.body;

      await db.run(
        'UPDATE gastos SET descripcion = ?, monto = ?, categoria = ?, fecha = ? WHERE id = ?',
        [descripcion, monto, categoria, fecha, id]
      );

      const gasto = await db.get('SELECT * FROM gastos WHERE id = ?', [id]);

      res.json({
        success: true,
        message: 'Gasto actualizado exitosamente',
        gasto
      });
    } catch (error) {
      console.error('Error al actualizar gasto:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async delete(req, res) {
    try {
      await db.run('DELETE FROM gastos WHERE id = ?', [req.params.id]);

      res.json({
        success: true,
        message: 'Gasto eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar gasto:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async getStats(req, res) {
    try {
      const hoy = hoyLocal();
      const mesActual = mesLocal();

      // Gastos del día
      const gastosHoy = await db.get(
        'SELECT COALESCE(SUM(monto), 0) as total FROM gastos WHERE DATE(fecha) = DATE(?)',
        [hoy]
      );

      // Gastos del mes
      const gastosMes = await db.get(
        'SELECT COALESCE(SUM(monto), 0) as total FROM gastos WHERE strftime("%Y-%m", fecha) = ?',
        [mesActual]
      );

      // Gastos por categoría (mes actual)
      const gastosPorCategoria = await db.all(
        `SELECT categoria, COALESCE(SUM(monto), 0) as total
         FROM gastos
         WHERE strftime("%Y-%m", fecha) = ?
         GROUP BY categoria
         ORDER BY total DESC`,
        [mesActual]
      );

      res.json({
        success: true,
        stats: {
          gastosHoy: gastosHoy.total,
          gastosMes: gastosMes.total,
          gastosPorCategoria
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas de gastos:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }
}

module.exports = new GastosController();
