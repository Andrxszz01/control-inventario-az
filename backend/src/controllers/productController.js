const db = require('../database/connection');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configure multer for product images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = req.app.locals.uploadsDir;
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `prod_${Date.now()}${ext}`;
    cb(null, safeName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

class ProductController {
  async getAll(req, res) {
    try {
      const { categoria, busqueda, soloActivos = 'true' } = req.query;
      
      let sql = `
        SELECT p.*, c.nombre as categoria_nombre 
        FROM productos p 
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE 1=1
      `;
      const params = [];

      if (soloActivos === 'true') {
        sql += ' AND p.activo = 1';
      }

      if (categoria) {
        sql += ' AND p.categoria_id = ?';
        params.push(categoria);
      }

      if (busqueda) {
        sql += ' AND (p.nombre LIKE ? OR p.codigo_qr LIKE ? OR p.codigo_barras LIKE ? OR p.descripcion LIKE ?)';
        params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
      }

      sql += ' ORDER BY p.nombre';

      const productos = await db.all(sql, params);
      res.json({ success: true, productos });
    } catch (error) {
      console.error('Error al obtener productos:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async getById(req, res) {
    try {
      const producto = await db.get(
        `SELECT p.*, c.nombre as categoria_nombre 
         FROM productos p 
         LEFT JOIN categorias c ON p.categoria_id = c.id
         WHERE p.id = ?`,
        [req.params.id]
      );

      if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      res.json({ success: true, producto });
    } catch (error) {
      console.error('Error al obtener producto:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async create(req, res) {
    try {
      const {
        nombre,
        categoria_id,
        precio_compra,
        precio_venta,
        stock,
        stock_minimo,
        descripcion,
        codigo_barras
      } = req.body;

      // Generar código QR único
      const codigo_qr = `PROD-${Date.now()}`;

      const result = await db.run(
        `INSERT INTO productos 
         (nombre, categoria_id, codigo_qr, precio_compra, precio_venta, stock, stock_minimo, descripcion, codigo_barras)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [nombre, categoria_id, codigo_qr, precio_compra, precio_venta, stock || 0, stock_minimo || 5, descripcion, codigo_barras || '']
      );

      const producto = await db.get('SELECT * FROM productos WHERE id = ?', [result.id]);

      res.status(201).json({ 
        success: true, 
        message: 'Producto creado exitosamente',
        producto 
      });
    } catch (error) {
      console.error('Error al crear producto:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const {
        nombre,
        categoria_id,
        precio_compra,
        precio_venta,
        stock,
        stock_minimo,
        descripcion,
        codigo_barras
      } = req.body;

      await db.run(
        `UPDATE productos 
         SET nombre = ?, categoria_id = ?, precio_compra = ?, precio_venta = ?, 
             stock = ?, stock_minimo = ?, descripcion = ?, codigo_barras = ?
         WHERE id = ?`,
        [nombre, categoria_id, precio_compra, precio_venta, stock, stock_minimo, descripcion, codigo_barras || '', id]
      );

      const producto = await db.get('SELECT * FROM productos WHERE id = ?', [id]);

      res.json({ 
        success: true, 
        message: 'Producto actualizado exitosamente',
        producto 
      });
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async uploadImage(req, res) {
    try {
      const { id } = req.params;
      const producto = await db.get('SELECT * FROM productos WHERE id = ?', [id]);
      if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No se envió ninguna imagen' });
      }

      // Delete old image if exists
      if (producto.imagen) {
        const oldPath = path.join(req.app.locals.uploadsDir, producto.imagen);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }

      const filename = req.file.filename;
      await db.run('UPDATE productos SET imagen = ? WHERE id = ?', [filename, id]);

      res.json({ success: true, imagen: filename });
    } catch (error) {
      console.error('Error al subir imagen:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async deleteImage(req, res) {
    try {
      const { id } = req.params;
      const producto = await db.get('SELECT * FROM productos WHERE id = ?', [id]);
      if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      if (producto.imagen) {
        const imgPath = path.join(req.app.locals.uploadsDir, producto.imagen);
        if (fs.existsSync(imgPath)) {
          fs.unlinkSync(imgPath);
        }
        await db.run("UPDATE productos SET imagen = '' WHERE id = ?", [id]);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error al eliminar imagen:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await db.run('UPDATE productos SET activo = 0 WHERE id = ?', [id]);
      res.json({ success: true, message: 'Producto eliminado exitosamente' });
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async getLowStock(req, res) {
    try {
      const productos = await db.all(
        `SELECT p.*, c.nombre as categoria_nombre 
         FROM productos p 
         LEFT JOIN categorias c ON p.categoria_id = c.id
         WHERE p.stock <= p.stock_minimo AND p.activo = 1
         ORDER BY p.stock ASC`
      );
      res.json({ success: true, productos });
    } catch (error) {
      console.error('Error al obtener productos con stock bajo:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async generateQR(req, res) {
    try {
      const { id } = req.params;
      const producto = await db.get('SELECT * FROM productos WHERE id = ?', [id]);

      if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      const qrData = JSON.stringify({
        id: producto.id,
        codigo: producto.codigo_qr,
        nombre: producto.nombre,
        precio: producto.precio_venta
      });

      const qrImage = await QRCode.toDataURL(qrData);

      res.json({ success: true, qrImage, codigo_qr: producto.codigo_qr });
    } catch (error) {
      console.error('Error al generar QR:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async findByBarcode(req, res) {
    try {
      const { code } = req.params;
      if (!code) {
        return res.status(400).json({ error: 'Código no proporcionado' });
      }
      const producto = await db.get(
        `SELECT p.*, c.nombre as categoria_nombre
         FROM productos p
         LEFT JOIN categorias c ON p.categoria_id = c.id
         WHERE (p.codigo_barras = ? OR p.codigo_qr = ?) AND p.activo = 1`,
        [code, code]
      );
      if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado con ese código' });
      }
      res.json({ success: true, producto });
    } catch (error) {
      console.error('Error al buscar por código de barras:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }
}

const productController = new ProductController();
module.exports = { productController, upload };
