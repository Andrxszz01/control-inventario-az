const db = require('../database/connection');
const PDFDocument = require('pdfkit');

function hoyLocal() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function mesLocal() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }

class ReportesController {

  // ─── Helpers para PDF ───
  _initPDF(res, filename) {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);
    return doc;
  }

  _header(doc, titulo, subtitulo) {
    doc.fontSize(20).font('Helvetica-Bold').text('Control de Inventario AZ', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(14).text(titulo, { align: 'center' });
    if (subtitulo) {
      doc.fontSize(10).font('Helvetica').text(subtitulo, { align: 'center' });
    }
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).stroke();
    doc.moveDown(1);
  }

  _tableRow(doc, cols, y, opts = {}) {
    const bold = opts.bold || false;
    const bg = opts.bg || null;
    if (bg) {
      doc.rect(50, y - 2, 512, 18).fill(bg);
      doc.fillColor('#ffffff');
    } else {
      doc.fillColor('#000000');
    }
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
    let x = 50;
    cols.forEach(col => {
      doc.text(String(col.text ?? ''), x, y, { width: col.width, align: col.align || 'left' });
      x += col.width;
    });
    if (bg) doc.fillColor('#000000');
    return y + 18;
  }

  _formatMoney(n) {
    return '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  async getVentasPorFecha(req, res) {
    try {
      const { fechaInicio, fechaFin } = req.query;

      const ventas = await db.all(
        `SELECT 
          DATE(v.fecha) as fecha,
          COUNT(*) as num_ventas,
          SUM(v.total) as total_ventas,
          SUM(v.descuento) as total_descuentos
         FROM ventas v
         WHERE DATE(v.fecha) BETWEEN DATE(?) AND DATE(?)
         GROUP BY DATE(v.fecha)
         ORDER BY fecha DESC`,
        [fechaInicio, fechaFin]
      );

      res.json({ success: true, ventas });
    } catch (error) {
      console.error('Error en reporte de ventas:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async getUtilidades(req, res) {
    try {
      const { fechaInicio, fechaFin } = req.query;

      // Calcular ingresos por ventas
      const ingresos = await db.get(
        `SELECT COALESCE(SUM(total), 0) as total
         FROM ventas
         WHERE DATE(fecha) BETWEEN DATE(?) AND DATE(?)`,
        [fechaInicio, fechaFin]
      );

      // Calcular costo de productos vendidos
      const costos = await db.get(
        `SELECT COALESCE(SUM(dv.cantidad * p.precio_compra), 0) as total
         FROM detalle_ventas dv
         JOIN productos p ON dv.producto_id = p.id
         JOIN ventas v ON dv.venta_id = v.id
         WHERE DATE(v.fecha) BETWEEN DATE(?) AND DATE(?)`,
        [fechaInicio, fechaFin]
      );

      // Calcular gastos
      const gastos = await db.get(
        `SELECT COALESCE(SUM(monto), 0) as total
         FROM gastos
         WHERE DATE(fecha) BETWEEN DATE(?) AND DATE(?)`,
        [fechaInicio, fechaFin]
      );

      const utilidadBruta = ingresos.total - costos.total;
      const utilidadNeta = utilidadBruta - gastos.total;
      const margenUtilidad = ingresos.total > 0 
        ? ((utilidadNeta / ingresos.total) * 100).toFixed(2) 
        : 0;

      res.json({
        success: true,
        utilidades: {
          ingresos: ingresos.total,
          costos: costos.total,
          gastos: gastos.total,
          utilidadBruta,
          utilidadNeta,
          margenUtilidad: parseFloat(margenUtilidad)
        }
      });
    } catch (error) {
      console.error('Error en reporte de utilidades:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async getInventarioActual(req, res) {
    try {
      const productos = await db.all(
        `SELECT 
          p.*,
          c.nombre as categoria_nombre,
          (p.stock * p.precio_compra) as valor_inventario
         FROM productos p
         LEFT JOIN categorias c ON p.categoria_id = c.id
         WHERE p.activo = 1
         ORDER BY p.nombre`
      );

      const valorTotal = productos.reduce((sum, p) => sum + p.valor_inventario, 0);

      res.json({
        success: true,
        inventario: {
          productos,
          valorTotal,
          totalProductos: productos.length
        }
      });
    } catch (error) {
      console.error('Error en reporte de inventario:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  async getDashboardStats(req, res) {
    try {
      const hoy = hoyLocal();
      const mesActual = mesLocal();

      // Ventas del día
      const ventasHoy = await db.get(
        'SELECT COUNT(*) as total, COALESCE(SUM(total), 0) as monto FROM ventas WHERE DATE(fecha) = DATE(?)',
        [hoy]
      );

      // Ganancias del mes
      const ventasMes = await db.get(
        'SELECT COALESCE(SUM(total), 0) as total FROM ventas WHERE strftime("%Y-%m", fecha) = ?',
        [mesActual]
      );

      const costosMes = await db.get(
        `SELECT COALESCE(SUM(dv.cantidad * p.precio_compra), 0) as total
         FROM detalle_ventas dv
         JOIN productos p ON dv.producto_id = p.id
         JOIN ventas v ON dv.venta_id = v.id
         WHERE strftime("%Y-%m", v.fecha) = ?`,
        [mesActual]
      );

      const gastosMes = await db.get(
        'SELECT COALESCE(SUM(monto), 0) as total FROM gastos WHERE strftime("%Y-%m", fecha) = ?',
        [mesActual]
      );

      const gananciasMes = ventasMes.total - costosMes.total - gastosMes.total;

      // Productos con stock bajo
      const stockBajo = await db.get(
        'SELECT COUNT(*) as total FROM productos WHERE stock <= stock_minimo AND activo = 1'
      );

      // Total de productos activos
      const totalProductos = await db.get(
        'SELECT COUNT(*) as total FROM productos WHERE activo = 1'
      );

      // Ventas últimos 7 días
      const hace7dias = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
      const ventasSemana = await db.all(
        `SELECT 
          DATE(fecha) as fecha,
          COUNT(*) as num_ventas,
          SUM(total) as total
         FROM ventas
         WHERE DATE(fecha) >= DATE(?)
         GROUP BY DATE(fecha)
         ORDER BY fecha ASC`,
        [hace7dias]
      );

      // Top 5 productos más vendidos del mes
      const topProductos = await db.all(
        `SELECT 
          p.nombre,
          SUM(dv.cantidad) as cantidad_vendida,
          SUM(dv.subtotal) as total_vendido
         FROM detalle_ventas dv
         JOIN productos p ON dv.producto_id = p.id
         JOIN ventas v ON dv.venta_id = v.id
         WHERE strftime("%Y-%m", v.fecha) = ?
         GROUP BY p.id
         ORDER BY cantidad_vendida DESC
         LIMIT 5`,
        [mesActual]
      );

      res.json({
        success: true,
        dashboard: {
          ventasHoy: {
            cantidad: ventasHoy.total,
            monto: ventasHoy.monto
          },
          gananciasMes,
          stockBajo: stockBajo.total,
          totalProductos: totalProductos.total,
          ventasSemana,
          topProductos
        }
      });
    } catch (error) {
      console.error('Error en estadísticas de dashboard:', error);
      res.status(500).json({ error: 'Error en el servidor' });
    }
  }

  // ─── PDF: Ventas por Fecha ───
  async pdfVentasPorFecha(req, res) {
    try {
      const { fechaInicio, fechaFin } = req.query;
      if (!fechaInicio || !fechaFin) {
        return res.status(400).json({ error: 'Fechas requeridas' });
      }

      const ventas = await db.all(
        `SELECT 
          DATE(v.fecha) as fecha,
          COUNT(*) as num_ventas,
          SUM(v.total) as total_ventas,
          SUM(v.descuento) as total_descuentos
         FROM ventas v
         WHERE DATE(v.fecha) BETWEEN DATE(?) AND DATE(?)
         GROUP BY DATE(v.fecha)
         ORDER BY fecha DESC`,
        [fechaInicio, fechaFin]
      );

      const doc = this._initPDF(res, `ventas_${fechaInicio}_a_${fechaFin}.pdf`);
      this._header(doc, 'Reporte de Ventas por Fecha', `Del ${fechaInicio} al ${fechaFin}`);

      // Resumen
      const totalVentas = ventas.reduce((s, v) => s + (v.total_ventas || 0), 0);
      const totalOps = ventas.reduce((s, v) => s + v.num_ventas, 0);
      doc.fontSize(11).font('Helvetica-Bold').text(`Total de operaciones: ${totalOps}`);
      doc.text(`Total vendido: ${this._formatMoney(totalVentas)}`);
      doc.moveDown(1);

      // Tabla
      const colsW = [{ text: 'Fecha', width: 150 }, { text: 'Ventas', width: 100, align: 'center' }, { text: 'Total', width: 140, align: 'right' }, { text: 'Descuentos', width: 122, align: 'right' }];
      let y = this._tableRow(doc, colsW, doc.y, { bold: true, bg: '#1e3a5f' });

      ventas.forEach(v => {
        if (y > 700) { doc.addPage(); y = 50; }
        y = this._tableRow(doc, [
          { text: v.fecha, width: 150 },
          { text: v.num_ventas, width: 100, align: 'center' },
          { text: this._formatMoney(v.total_ventas), width: 140, align: 'right' },
          { text: this._formatMoney(v.total_descuentos), width: 122, align: 'right' }
        ], y);
      });

      if (ventas.length === 0) {
        doc.moveDown(1).fontSize(11).text('No se encontraron ventas en el periodo seleccionado.', { align: 'center' });
      }

      // Pie
      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica').fillColor('#888888')
        .text(`Generado el ${new Date().toLocaleString('es-MX')}`, { align: 'center' });

      doc.end();
    } catch (error) {
      console.error('Error PDF ventas:', error);
      if (!res.headersSent) res.status(500).json({ error: 'Error generando PDF' });
    }
  }

  // ─── PDF: Inventario Actual ───
  async pdfInventario(req, res) {
    try {
      const productos = await db.all(
        `SELECT 
          p.codigo_qr, p.nombre, p.stock, p.stock_minimo,
          p.precio_compra, p.precio_venta,
          c.nombre as categoria_nombre,
          (p.stock * p.precio_compra) as valor_inventario
         FROM productos p
         LEFT JOIN categorias c ON p.categoria_id = c.id
         WHERE p.activo = 1
         ORDER BY p.nombre`
      );

      const valorTotal = productos.reduce((s, p) => s + (p.valor_inventario || 0), 0);

      const doc = this._initPDF(res, `inventario_${new Date().toISOString().split('T')[0]}.pdf`);
      this._header(doc, 'Reporte de Inventario Actual', `${productos.length} productos activos`);

      doc.fontSize(11).font('Helvetica-Bold')
        .text(`Valor total del inventario: ${this._formatMoney(valorTotal)}`);
      doc.moveDown(1);

      // Tabla
      const cols = [
        { text: 'Codigo', width: 60 },
        { text: 'Producto', width: 155 },
        { text: 'Categoria', width: 85 },
        { text: 'Stock', width: 45, align: 'center' },
        { text: 'Min', width: 35, align: 'center' },
        { text: 'P.Compra', width: 66, align: 'right' },
        { text: 'P.Venta', width: 66, align: 'right' }
      ];
      let y = this._tableRow(doc, cols, doc.y, { bold: true, bg: '#1e3a5f' });

      productos.forEach(p => {
        if (y > 700) { doc.addPage(); y = 50; }
        const stockColor = p.stock <= p.stock_minimo ? '#cc0000' : '#000000';
        y = this._tableRow(doc, [
          { text: p.codigo_qr || '-', width: 60 },
          { text: (p.nombre || '').substring(0, 25), width: 155 },
          { text: (p.categoria_nombre || 'Sin cat.').substring(0, 14), width: 85 },
          { text: p.stock, width: 45, align: 'center' },
          { text: p.stock_minimo, width: 35, align: 'center' },
          { text: this._formatMoney(p.precio_compra), width: 66, align: 'right' },
          { text: this._formatMoney(p.precio_venta), width: 66, align: 'right' }
        ], y);
      });

      if (productos.length === 0) {
        doc.moveDown(1).fontSize(11).text('No hay productos registrados.', { align: 'center' });
      }

      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica').fillColor('#888888')
        .text(`Generado el ${new Date().toLocaleString('es-MX')}`, { align: 'center' });

      doc.end();
    } catch (error) {
      console.error('Error PDF inventario:', error);
      if (!res.headersSent) res.status(500).json({ error: 'Error generando PDF' });
    }
  }

  // ─── PDF: Productos Más Vendidos ───
  async pdfTopProductos(req, res) {
    try {
      const { fechaInicio, fechaFin } = req.query;
      let whereClause = '';
      let params = [];
      let subtitulo = 'Todos los tiempos';

      if (fechaInicio && fechaFin) {
        whereClause = 'WHERE DATE(v.fecha) BETWEEN DATE(?) AND DATE(?)';
        params = [fechaInicio, fechaFin];
        subtitulo = `Del ${fechaInicio} al ${fechaFin}`;
      }

      const topProductos = await db.all(
        `SELECT 
          p.codigo_qr, p.nombre,
          SUM(dv.cantidad) as cantidad_vendida,
          SUM(dv.subtotal) as total_vendido,
          AVG(dv.precio_unitario) as precio_promedio
         FROM detalle_ventas dv
         JOIN productos p ON dv.producto_id = p.id
         JOIN ventas v ON dv.venta_id = v.id
         ${whereClause}
         GROUP BY p.id
         ORDER BY cantidad_vendida DESC
         LIMIT 20`,
        params
      );

      const doc = this._initPDF(res, `top_productos_${new Date().toISOString().split('T')[0]}.pdf`);
      this._header(doc, 'Productos Mas Vendidos', subtitulo);

      // Tabla
      const cols = [
        { text: '#', width: 30, align: 'center' },
        { text: 'Codigo', width: 80 },
        { text: 'Producto', width: 180 },
        { text: 'Uds. Vendidas', width: 80, align: 'center' },
        { text: 'Total Vendido', width: 142, align: 'right' }
      ];
      let y = this._tableRow(doc, cols, doc.y, { bold: true, bg: '#1e3a5f' });

      topProductos.forEach((p, i) => {
        if (y > 700) { doc.addPage(); y = 50; }
        y = this._tableRow(doc, [
          { text: i + 1, width: 30, align: 'center' },
          { text: p.codigo_qr || '-', width: 80 },
          { text: (p.nombre || '').substring(0, 30), width: 180 },
          { text: p.cantidad_vendida, width: 80, align: 'center' },
          { text: this._formatMoney(p.total_vendido), width: 142, align: 'right' }
        ], y);
      });

      if (topProductos.length === 0) {
        doc.moveDown(1).fontSize(11).text('No se encontraron ventas registradas.', { align: 'center' });
      }

      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica').fillColor('#888888')
        .text(`Generado el ${new Date().toLocaleString('es-MX')}`, { align: 'center' });

      doc.end();
    } catch (error) {
      console.error('Error PDF top productos:', error);
      if (!res.headersSent) res.status(500).json({ error: 'Error generando PDF' });
    }
  }

  // ─── PDF: Reporte de Utilidades ───
  async pdfUtilidades(req, res) {
    try {
      const { fechaInicio, fechaFin } = req.query;
      if (!fechaInicio || !fechaFin) {
        return res.status(400).json({ error: 'Fechas requeridas' });
      }

      const ingresos = await db.get(
        `SELECT COALESCE(SUM(total), 0) as total FROM ventas WHERE DATE(fecha) BETWEEN DATE(?) AND DATE(?)`,
        [fechaInicio, fechaFin]
      );
      const costos = await db.get(
        `SELECT COALESCE(SUM(dv.cantidad * p.precio_compra), 0) as total
         FROM detalle_ventas dv JOIN productos p ON dv.producto_id = p.id
         JOIN ventas v ON dv.venta_id = v.id
         WHERE DATE(v.fecha) BETWEEN DATE(?) AND DATE(?)`,
        [fechaInicio, fechaFin]
      );
      const gastos = await db.get(
        `SELECT COALESCE(SUM(monto), 0) as total FROM gastos WHERE DATE(fecha) BETWEEN DATE(?) AND DATE(?)`,
        [fechaInicio, fechaFin]
      );

      const utilidadBruta = ingresos.total - costos.total;
      const utilidadNeta = utilidadBruta - gastos.total;
      const margen = ingresos.total > 0 ? ((utilidadNeta / ingresos.total) * 100).toFixed(2) : '0.00';

      const doc = this._initPDF(res, `utilidades_${fechaInicio}_a_${fechaFin}.pdf`);
      this._header(doc, 'Reporte de Utilidades', `Del ${fechaInicio} al ${fechaFin}`);

      const items = [
        { label: 'Ingresos por Ventas', value: this._formatMoney(ingresos.total), color: '#16a34a' },
        { label: 'Costo de Productos Vendidos', value: this._formatMoney(costos.total), color: '#ea580c' },
        { label: 'Gastos Operativos', value: this._formatMoney(gastos.total), color: '#dc2626' },
        { label: 'Utilidad Bruta', value: this._formatMoney(utilidadBruta), color: '#2563eb' },
        { label: 'Utilidad Neta', value: this._formatMoney(utilidadNeta), color: utilidadNeta >= 0 ? '#16a34a' : '#dc2626' },
        { label: 'Margen de Utilidad', value: `${margen}%`, color: '#7c3aed' },
      ];

      items.forEach(item => {
        doc.fontSize(12).font('Helvetica').text(item.label + ':', { continued: true });
        doc.font('Helvetica-Bold').fillColor(item.color).text('  ' + item.value);
        doc.fillColor('#000000').moveDown(0.5);
      });

      doc.moveDown(2);
      doc.fontSize(8).font('Helvetica').fillColor('#888888')
        .text(`Generado el ${new Date().toLocaleString('es-MX')}`, { align: 'center' });

      doc.end();
    } catch (error) {
      console.error('Error PDF utilidades:', error);
      if (!res.headersSent) res.status(500).json({ error: 'Error generando PDF' });
    }
  }
}

module.exports = new ReportesController();
