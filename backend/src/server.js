require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./database/connection');
const { initDatabase } = require('./database/init');

const app = express();
const DEFAULT_PORT = process.env.PORT || 3000;
const DEFAULT_HOST = process.env.HOST || '127.0.0.1';
let httpServer = null;

// Uploads directory - same folder as database
const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.resolve(__dirname, '../../database/inventario.db');
const UPLOADS_DIR = path.join(path.dirname(DB_PATH), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
// Export for use in controllers
app.locals.uploadsDir = UPLOADS_DIR;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use('/api/uploads', express.static(UPLOADS_DIR));

// Importar rutas
const authRoutes = require('./routes/auth');
const productosRoutes = require('./routes/productos');
const ventasRoutes = require('./routes/ventas');
const gastosRoutes = require('./routes/gastos');
const categoriasRoutes = require('./routes/categorias');
const clientesRoutes = require('./routes/clientes');
const reportesRoutes = require('./routes/reportes');
const cajaRoutes = require('./routes/caja');

// Usar rutas
app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/gastos', gastosRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/caja', cajaRoutes);

// Ruta de prueba
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API Control de Inventario AZ funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Inicializar base de datos y servidor
async function startServer(options = {}) {
  const PORT = options.port || DEFAULT_PORT;
  const HOST = options.host || DEFAULT_HOST;

  if (httpServer) {
    return httpServer;
  }

  try {
    await db.connect();
    await initDatabase();

    httpServer = app.listen(PORT, HOST, () => {
      console.log(`
╔═══════════════════════════════════════════════╗
║   🚀 Control de Inventario AZ - Backend      ║
║   📍 http://${HOST}:${PORT}                    ║
║   ✅ Base de datos conectada                  ║
╚═══════════════════════════════════════════════╝
      `);
    });

    return httpServer;
  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    throw error;
  }
}

function stopServer() {
  return new Promise((resolve) => {
    if (!httpServer) {
      resolve();
      return;
    }

    httpServer.close(() => {
      httpServer = null;
      resolve();
    });
  });
}

if (require.main === module) {
  startServer().catch(() => process.exit(1));
}

module.exports = { app, startServer, stopServer };
