const db = require('../database/connection');

class CategoriasController {
  async getAll(req, res) {
    try {
      const categorias = await db.all(
        'SELECT * FROM categorias ORDER BY nombre'
      );

      res.json({ success: true, categorias });
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async create(req, res) {
    try {
      const { nombre, descripcion } = req.body;

      const result = await db.run(
        'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)',
        [nombre, descripcion]
      );

      const categoria = await db.get('SELECT * FROM categorias WHERE id = ?', [result.id]);

      res.status(201).json({
        success: true,
        message: 'Categoría creada exitosamente',
        categoria
      });
    } catch (error) {
      console.error('Error al crear categoría:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { nombre, descripcion } = req.body;

      await db.run(
        'UPDATE categorias SET nombre = ?, descripcion = ? WHERE id = ?',
        [nombre, descripcion, id]
      );

      const categoria = await db.get('SELECT * FROM categorias WHERE id = ?', [id]);

      res.json({
        success: true,
        message: 'Categoría actualizada exitosamente',
        categoria
      });
    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async delete(req, res) {
    try {
      await db.run('DELETE FROM categorias WHERE id = ?', [req.params.id]);

      res.json({
        success: true,
        message: 'Categoría eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }
}

module.exports = new CategoriasController();
