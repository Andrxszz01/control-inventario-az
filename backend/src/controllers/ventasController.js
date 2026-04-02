const db = require('../database/connection');
const PDFDocument = require('pdfkit');

function fechaLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}
function hoyLocal() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function mesLocal() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toAscii(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
}

function padRight(value, width) {
  const text = String(value ?? '');
  return text.length >= width ? text.slice(0, width) : text + ' '.repeat(width - text.length);
}

function padLeft(value, width) {
  const text = String(value ?? '');
  return text.length >= width ? text.slice(0, width) : ' '.repeat(width - text.length) + text;
}

class VentasController {
  buildTicketText(venta) {
    const money = (v) => `$${Number(v || 0).toFixed(2)}`;

    const fechaVenta = new Date(venta.fecha);
    const fechaStr = `${String(fechaVenta.getDate()).padStart(2,'0')}/${String(fechaVenta.getMonth()+1).padStart(2,'0')}/${fechaVenta.getFullYear()} ${String(fechaVenta.getHours()).padStart(2,'0')}:${String(fechaVenta.getMinutes()).padStart(2,'0')}`;

    const toAsciiLocal = (text) =>
      String(text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, '');

    const padRightLocal = (text, width) => {
      const parsedText = String(text || '');
      return parsedText.length >= width ? parsedText.slice(0, width) : parsedText + ' '.repeat(width - parsedText.length);
    };

    const padLeftLocal = (text, width) => {
      const parsedText = String(text || '');
      return parsedText.length >= width ? parsedText.slice(0, width) : ' '.repeat(width - parsedText.length) + parsedText;
    };

const center = (text, width = 32) => {
  text = toAsciiLocal(text);
  const left = Math.floor((width - text.length) / 2);
  return ' '.repeat(left > 0 ? left : 0) + text;
};

    const splitText = (text, chunkSize) => {
      const chunks = [];
      let remaining = String(text || '');
      while (remaining.length > chunkSize) {
        chunks.push(remaining.slice(0, chunkSize));
        remaining = remaining.slice(chunkSize);
      }
      chunks.push(remaining || '');
      return chunks;
    };

    const WIDTH = 32;
    const line = '-'.repeat(WIDTH);

    const ticket = [];

    ticket.push(center('ABARROTES AZ'));
    ticket.push(center('TICKET DE VENTA'));
    ticket.push(line);

    ticket.push(`Folio : ${venta.id}`);
    ticket.push(`Fecha : ${fechaStr}`);
    ticket.push(`Cajero: ${toAsciiLocal(venta.vendedor)}`);
    ticket.push(`Pago  : ${toAsciiLocal((venta.metodo_pago || 'efectivo').toUpperCase())}`);

    ticket.push(line);

    ticket.push(
      padRightLocal('Cant', 5) +
      padRightLocal('Producto', 17) +
      padLeftLocal('Total', 10)
    );

    ticket.push(line);

    for (const item of (venta.detalles || [])) {
let partes = splitText(toAsciiLocal(item.producto_nombre), 17);

      ticket.push(
        padRightLocal(item.cantidad, 5) +
        padRightLocal(partes[0], 17) +
        padLeftLocal(money(item.subtotal), 10)
      );

      for (let i = 1; i < partes.length; i++) {
        ticket.push(
          padRightLocal('', 5) +
          padRightLocal(partes[i], 17) +
          padLeftLocal('', 10)
        );
      }

      ticket.push(
        padRightLocal('', 5) +
        padRightLocal(`@${money(item.precio_unitario)}`, 17)
      );
    }

    ticket.push(line);

    ticket.push(
      padRightLocal('Subtotal', 22) +
      padLeftLocal(money(venta.subtotal), 10)
    );

    if (Number(venta.descuento) > 0) {
      ticket.push(
        padRightLocal('Descuento', 22) +
        padLeftLocal(`-${money(venta.descuento)}`, 10)
      );
    }

    ticket.push(line);

    ticket.push(center(`TOTAL: ${money(venta.total)}`));

    if (venta.metodo_pago === 'efectivo' && Number(venta.monto_recibido) > 0) {
      ticket.push('');
      ticket.push(
        padRightLocal('Recibido', 22) +
        padLeftLocal(money(venta.monto_recibido), 10)
      );

      ticket.push(
        padRightLocal('Cambio', 22) +
        padLeftLocal(money(venta.cambio || 0), 10)
      );
    }

    ticket.push(line);
    return ticket.join('\n');
  }

  buildTicketHtml(venta) {
    const text = this.buildTicketText(venta);
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Ticket #${venta.id}</title>
  <style>
    @page { size: 80mm auto; margin: 3mm; }
    html, body {
      margin: 0;
      padding: 0;
      color: #000;
      background: #fff;
      font-family: Consolas, 'Courier New', monospace;
      font-size: 10px;
      line-height: 1.2;
    }
    .ticket {
      white-space: pre;
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
<pre class="ticket">${escapeHtml(text)}</pre>
</body>
</html>`;
  }

  async create(req, res) {
    try {
      const { productos, descuento, metodo_pago = 'efectivo', monto_recibido = 0, cliente_id = null } = req.body;
      const usuario_id = req.user.id;

      if (!productos || productos.length === 0) {
        return res.status(400).json({ error: 'Debe incluir al menos un producto' });
      }

      // Calcular subtotal
      let subtotal = 0;
      for (const item of productos) {
        const producto = await db.get('SELECT * FROM productos WHERE id = ?', [item.producto_id]);
        
        if (!producto) {
          return res.status(404).json({ error: `Producto ${item.producto_id} no encontrado` });
        }

        if (producto.tipo === 'insumo') {
          return res.status(400).json({
            error: `"${producto.nombre}" es un insumo y no puede venderse directamente`
          });
        }

        if (producto.tipo !== 'servicio' && producto.stock < item.cantidad) {
          return res.status(400).json({ 
            error: `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}` 
          });
        }

        subtotal += producto.precio_venta * item.cantidad;
      }

      const descuentoMonto = descuento || 0;
      const total = subtotal - descuentoMonto;
      const cambio = metodo_pago === 'efectivo' ? Math.max(0, (monto_recibido || total) - total) : 0;
      const montoFinal = metodo_pago === 'efectivo' ? (monto_recibido || total) : total;

      // Crear venta con fecha local
      const ventaResult = await db.run(
        'INSERT INTO ventas (usuario_id, cliente_id, subtotal, descuento, total, metodo_pago, monto_recibido, cambio, fecha) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [usuario_id, cliente_id || null, subtotal, descuentoMonto, total, metodo_pago, montoFinal, cambio, fechaLocal()]
      );

      const venta_id = ventaResult.id;

      // Insertar detalles y actualizar stock
      for (const item of productos) {
        const producto = await db.get('SELECT * FROM productos WHERE id = ?', [item.producto_id]);
        
        const itemSubtotal = producto.precio_venta * item.cantidad;

        await db.run(
          'INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
          [venta_id, item.producto_id, item.cantidad, producto.precio_venta, itemSubtotal]
        );

        // Actualizar stock solo para productos físicos
        if (producto.tipo !== 'servicio') {
          await db.run(
            'UPDATE productos SET stock = stock - ? WHERE id = ?',
            [item.cantidad, item.producto_id]
          );
        }
      }

      if (cliente_id) {
        await db.run('UPDATE clientes SET ultima_visita = ? WHERE id = ?', [fechaLocal(), cliente_id]);
      }

      // Obtener venta completa con detalles
      const venta = await this.getVentaCompleta(venta_id);

      res.status(201).json({
        success: true,
        message: 'Venta registrada exitosamente',
        venta
      });
    } catch (error) {
      console.error('Error al crear venta:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async getAll(req, res) {
    try {
      const { fechaInicio, fechaFin, limit = 50 } = req.query;

      let sql = `
        SELECT v.*, u.nombre as vendedor
        FROM ventas v
        JOIN usuarios u ON v.usuario_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (fechaInicio) {
        sql += ' AND DATE(v.fecha) >= DATE(?)';
        params.push(fechaInicio);
      }

      if (fechaFin) {
        sql += ' AND DATE(v.fecha) <= DATE(?)';
        params.push(fechaFin);
      }

      sql += ' ORDER BY v.fecha DESC LIMIT ?';
      params.push(parseInt(limit));

      const ventas = await db.all(sql, params);

      res.json({ success: true, ventas });
    } catch (error) {
      console.error('Error al obtener ventas:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async getById(req, res) {
    try {
      const venta = await this.getVentaCompleta(req.params.id);

      if (!venta) {
        return res.status(404).json({ error: 'Venta no encontrada' });
      }

      res.json({ success: true, venta });
    } catch (error) {
      console.error('Error al obtener venta:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async getVentaCompleta(ventaId) {
    const venta = await db.get(
      `SELECT v.*, u.nombre as vendedor
       FROM ventas v
       JOIN usuarios u ON v.usuario_id = u.id
       WHERE v.id = ?`,
      [ventaId]
    );

    if (!venta) return null;

    const detalles = await db.all(
      `SELECT dv.*, p.nombre as producto_nombre
       FROM detalle_ventas dv
       JOIN productos p ON dv.producto_id = p.id
       WHERE dv.venta_id = ?`,
      [ventaId]
    );

    venta.detalles = detalles;
    return venta;
  }

  async getStats(req, res) {
    try {
      const hoy = hoyLocal();

      // Ventas del día
      const ventasHoy = await db.get(
        'SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as monto FROM ventas WHERE DATE(fecha) = DATE(?)',
        [hoy]
      );

      // Ventas del mes
      const mesActual = mesLocal();
      const ventasMes = await db.get(
        'SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as monto FROM ventas WHERE strftime("%Y-%m", fecha) = ?',
        [mesActual]
      );

      // Productos más vendidos
      const hace30dias = (() => { const d = new Date(); d.setDate(d.getDate() - 30); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
      const topProductos = await db.all(
        `SELECT p.nombre, SUM(dv.cantidad) as cantidad_vendida, SUM(dv.subtotal) as total_vendido
         FROM detalle_ventas dv
         JOIN productos p ON dv.producto_id = p.id
         JOIN ventas v ON dv.venta_id = v.id
         WHERE DATE(v.fecha) >= DATE(?)
         GROUP BY p.id
         ORDER BY cantidad_vendida DESC
         LIMIT 5`,
        [hace30dias]
      );

      res.json({
        success: true,
        stats: {
          ventasHoy,
          ventasMes,
          topProductos
        }
      });
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async getTicket(req, res) {
    try {
      const venta = await this.getVentaCompleta(req.params.id);
      if (!venta) {
        return res.status(404).json({ error: 'Venta no encontrada' });
      }

      // Ticket PDF - 80mm width (approx 226 points)
      const ticketWidth = 226;
      const doc = new PDFDocument({
        size: [ticketWidth, 600],
        margins: { top: 10, bottom: 10, left: 10, right: 10 }
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=ticket-${venta.id}.pdf`);
      doc.pipe(res);

      const centerX = ticketWidth / 2;
      const contentWidth = ticketWidth - 20;

      // Header
      doc.fontSize(14).font('Helvetica-Bold')
        .text('Abarrotes AZ', 10, 10, { width: contentWidth, align: 'center' });
      
      doc.fontSize(8).font('Helvetica')
        .text('TICKET DE VENTA', 10, 30, { width: contentWidth, align: 'left' });

      doc.moveDown(0.3);
      doc.text('-'.repeat(38), 10, doc.y, { width: contentWidth, align: 'center' });

      // Sale info
      const fechaVenta = new Date(venta.fecha);
      const fechaStr = `${String(fechaVenta.getDate()).padStart(2,'0')}/${String(fechaVenta.getMonth()+1).padStart(2,'0')}/${fechaVenta.getFullYear()} ${String(fechaVenta.getHours()).padStart(2,'0')}:${String(fechaVenta.getMinutes()).padStart(2,'0')}`;
      
      doc.moveDown(0.3);
      doc.fontSize(7).font('Helvetica');
      doc.text(`Ticket #: ${venta.id}`, 10, doc.y);
      doc.text(`Fecha: ${fechaStr}`, 10, doc.y);
      doc.text(`Vendedor: ${venta.vendedor}`, 10, doc.y);
      doc.text(`Pago: ${(venta.metodo_pago || 'efectivo').toUpperCase()}`, 10, doc.y);

      doc.text('-'.repeat(38), 10, doc.y + 3, { width: contentWidth, align: 'center' });

      // Column headers
      doc.moveDown(0.3);
      doc.font('Helvetica-Bold').fontSize(7);
      const headerY = doc.y;
      doc.text('Cant', 10, headerY, { width: 25 });
      doc.text('Producto', 38, headerY, { width: 100 });
      doc.text('P.U.', 140, headerY, { width: 38, align: 'right' });
      doc.text('Total', 178, headerY, { width: 38, align: 'right' });

      doc.font('Helvetica').fontSize(7);
      doc.text('-'.repeat(38), 10, doc.y + 2, { width: contentWidth, align: 'center' });

      // Items
      doc.moveDown(0.3);
      for (const item of venta.detalles) {
        const y = doc.y;
        doc.text(String(item.cantidad), 10, y, { width: 25 });
        doc.text(item.producto_nombre.substring(0, 18), 38, y, { width: 100 });
        doc.text(`$${item.precio_unitario.toFixed(2)}`, 140, y, { width: 38, align: 'right' });
        doc.text(`$${item.subtotal.toFixed(2)}`, 178, y, { width: 38, align: 'right' });
        doc.moveDown(0.2);
      }

      doc.text('-'.repeat(38), 10, doc.y + 2, { width: contentWidth, align: 'center' });

      // Totals
      doc.moveDown(0.3);
      doc.fontSize(7);
      doc.text(`Subtotal:`, 100, doc.y, { width: 78, align: 'right' });
      doc.text(`$${venta.subtotal.toFixed(2)}`, 178, doc.y - doc.currentLineHeight(), { width: 38, align: 'right' });
      
      if (venta.descuento > 0) {
        doc.text(`Descuento:`, 100, doc.y, { width: 78, align: 'right' });
        doc.text(`-$${venta.descuento.toFixed(2)}`, 178, doc.y - doc.currentLineHeight(), { width: 38, align: 'right' });
      }

      doc.moveDown(0.2);
      doc.font('Helvetica-Bold').fontSize(10);
      doc.text(`TOTAL: $${venta.total.toFixed(2)}`, 10, doc.y, { width: contentWidth, align: 'left' });

      // Show payment details
      if (venta.metodo_pago === 'efectivo' && venta.monto_recibido > 0) {
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(8);
        doc.text(`Recibido: $${venta.monto_recibido.toFixed(2)}`, 10, doc.y, { width: contentWidth, align: 'left' });
        doc.text(`Cambio: $${(venta.cambio || 0).toFixed(2)}`, 10, doc.y, { width: contentWidth, align: 'left' });
      }

      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(7);
      doc.text('-'.repeat(38), 10, doc.y, { width: contentWidth, align: 'center' });
      doc.moveDown(0.3);
      doc.text('Gracias por su compra!', 10, doc.y, { width: contentWidth, align: 'left' });
      doc.text('AZ Control de Inventario', 10, doc.y, { width: contentWidth, align: 'left' });

      doc.end();
    } catch (error) {
      console.error('Error al generar ticket:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async getTicketHtml(req, res) {
    try {
      const venta = await this.getVentaCompleta(req.params.id);
      if (!venta) {
        return res.status(404).json({ error: 'Venta no encontrada' });
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(this.buildTicketHtml(venta));
    } catch (error) {
      console.error('Error al generar ticket HTML:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async getTicketText(req, res) {
    try {
      const venta = await this.getVentaCompleta(req.params.id);
      if (!venta) {
        return res.status(404).json({ error: 'Venta no encontrada' });
      }

      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.send(this.buildTicketText(venta));
    } catch (error) {
      console.error('Error al generar ticket texto:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;

      const venta = await db.get('SELECT id FROM ventas WHERE id = ?', [id]);
      if (!venta) {
        return res.status(404).json({ error: 'Venta no encontrada' });
      }

      const detalles = await db.all(
        'SELECT producto_id, cantidad FROM detalle_ventas WHERE venta_id = ?',
        [id]
      );

      await db.run('BEGIN TRANSACTION');

      for (const item of detalles) {
        await db.run(
          'UPDATE productos SET stock = stock + ? WHERE id = ?',
          [item.cantidad, item.producto_id]
        );
      }

      await db.run('DELETE FROM detalle_ventas WHERE venta_id = ?', [id]);
      await db.run('DELETE FROM abonos WHERE venta_id = ?', [id]);
      await db.run('DELETE FROM ventas WHERE id = ?', [id]);

      await db.run('COMMIT');

      res.json({ success: true, message: 'Venta eliminada y stock restaurado' });
    } catch (error) {
      try {
        await db.run('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error en rollback de eliminación de venta:', rollbackError);
      }
      console.error('Error al eliminar venta:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }
}

module.exports = new VentasController();
