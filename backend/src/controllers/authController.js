const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/connection');

const JWT_SECRET = process.env.JWT_SECRET || 'az-control-inventario-secret-key-2024';

class AuthController {
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Username y password son requeridos' });
      }

      const user = await db.get(
        'SELECT * FROM usuarios WHERE username = ? AND activo = 1',
        [username]
      );

      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const validPassword = await bcrypt.compare(password, user.password);

      if (!validPassword) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username, 
          rol: user.rol,
          nombre: user.nombre
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          nombre: user.nombre,
          rol: user.rol
        }
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async register(req, res) {
    try {
      const { username, password, telefono, rol } = req.body;

      if (!username || !password || !rol) {
        return res.status(400).json({ error: 'Usuario, contraseña y rol son requeridos' });
      }

      if (!['administrador', 'empleado'].includes(rol)) {
        return res.status(400).json({ error: 'Rol inválido' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      }

      const existing = await db.get('SELECT id FROM usuarios WHERE username = ?', [username]);
      if (existing) {
        return res.status(400).json({ error: 'El usuario ya existe' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await db.run(
        'INSERT INTO usuarios (username, password, nombre, telefono, rol) VALUES (?, ?, ?, ?, ?)',
        [username, hashedPassword, username, telefono || '', rol]
      );

      res.json({ success: true, message: 'Usuario registrado correctamente' });
    } catch (error) {
      console.error('Error en registro:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async getUsers(req, res) {
    try {
      const users = await db.all(
        'SELECT id, username, nombre, telefono, rol, activo, fecha_creacion FROM usuarios ORDER BY fecha_creacion DESC'
      );
      res.json({ success: true, users });
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      const { username, telefono, rol, activo, password } = req.body;

      const user = await db.get('SELECT id FROM usuarios WHERE id = ?', [id]);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      if (username) {
        const dup = await db.get('SELECT id FROM usuarios WHERE username = ? AND id != ?', [username, id]);
        if (dup) {
          return res.status(400).json({ error: 'Ese nombre de usuario ya está en uso' });
        }
      }

      if (password) {
        if (password.length < 6) {
          return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.run(
          'UPDATE usuarios SET username = COALESCE(?, username), nombre = COALESCE(?, nombre), telefono = COALESCE(?, telefono), rol = COALESCE(?, rol), activo = COALESCE(?, activo), password = ? WHERE id = ?',
          [username, username, telefono, rol, activo, hashedPassword, id]
        );
      } else {
        await db.run(
          'UPDATE usuarios SET username = COALESCE(?, username), nombre = COALESCE(?, nombre), telefono = COALESCE(?, telefono), rol = COALESCE(?, rol), activo = COALESCE(?, activo) WHERE id = ?',
          [username, username, telefono, rol, activo, id]
        );
      }

      res.json({ success: true, message: 'Usuario actualizado' });
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      const userId = parseInt(id, 10);

      if (userId === req.user.id) {
        return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
      }

      const targetUser = await db.get('SELECT id, rol FROM usuarios WHERE id = ?', [userId]);
      if (!targetUser) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      if (targetUser.rol === 'administrador') {
        const adminCountRow = await db.get(
          "SELECT COUNT(*) AS total FROM usuarios WHERE rol = 'administrador'"
        );
        if ((adminCountRow?.total || 0) <= 1) {
          return res.status(400).json({ error: 'No puedes eliminar el ultimo administrador' });
        }
      }

      await db.run('DELETE FROM usuarios WHERE id = ?', [userId]);
      res.json({ success: true, message: 'Usuario eliminado permanentemente' });
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async resetStore(req, res) {
    const resetTables = ['detalle_ventas', 'abonos', 'ventas', 'gastos', 'caja', 'clientes'];

    try {
      await db.run('BEGIN TRANSACTION');

      const tables = await db.all("SELECT name FROM sqlite_master WHERE type = 'table'");
      const tableSet = new Set(tables.map((t) => t.name));

      await db.run('PRAGMA foreign_keys = OFF');

      for (const tableName of resetTables) {
        if (tableSet.has(tableName)) {
          await db.run(`DELETE FROM ${tableName}`);
        }
      }

      if (tableSet.has('productos')) {
        await db.run('UPDATE productos SET stock = 0');
      }

      if (tableSet.has('sqlite_sequence')) {
        const existingResetTables = resetTables.filter((tableName) => tableSet.has(tableName));
        for (const tableName of existingResetTables) {
          await db.run('DELETE FROM sqlite_sequence WHERE name = ?', [tableName]);
        }
      }

      await db.run('PRAGMA foreign_keys = ON');

      const summary = {
        ventas: (await db.get('SELECT COUNT(*) AS c FROM ventas'))?.c || 0,
        detalle_ventas: (await db.get('SELECT COUNT(*) AS c FROM detalle_ventas'))?.c || 0,
        gastos: (await db.get('SELECT COUNT(*) AS c FROM gastos'))?.c || 0,
        caja: (await db.get('SELECT COUNT(*) AS c FROM caja'))?.c || 0,
        caja_abierta: (await db.get("SELECT COUNT(*) AS c FROM caja WHERE estado = 'abierta'"))?.c || 0,
        productos_stock_no_cero: (await db.get('SELECT COUNT(*) AS c FROM productos WHERE stock <> 0'))?.c || 0,
      };

      await db.run('COMMIT');

      res.json({
        success: true,
        message: 'Tienda reseteada correctamente. Ventas, gastos y caja fueron limpiados y el inventario quedo en 0.',
        summary,
      });
    } catch (error) {
      try {
        await db.run('ROLLBACK');
      } catch (_) {
        // Ignore rollback errors
      }
      console.error('Error al resetear tienda:', error);
      res.status(500).json({ error: 'Error al resetear la tienda' });
    }
  }

  async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;
      const userId = req.user.id;

      const user = await db.get('SELECT * FROM usuarios WHERE id = ?', [userId]);

      const validPassword = await bcrypt.compare(oldPassword, user.password);
      
      if (!validPassword) {
        return res.status(401).json({ error: 'Contraseña actual incorrecta' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await db.run(
        'UPDATE usuarios SET password = ? WHERE id = ?',
        [hashedPassword, userId]
      );

      res.json({ success: true, message: 'Contraseña actualizada' });
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async getProfile(req, res) {
    try {
      const user = await db.get(
        'SELECT id, username, nombre, rol, fecha_creacion FROM usuarios WHERE id = ?',
        [req.user.id]
      );

      res.json({ success: true, user });
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }
}

module.exports = new AuthController();
