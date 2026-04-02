const db = require('./connection');
const bcrypt = require('bcryptjs');

async function initDatabase() {
  try {
    // Connect only if not already connected (server.js may have connected already)
    if (!db.db) {
      await db.connect();
    }
    console.log('Iniciando creación de tablas...');

    // Tabla de usuarios
    await db.run(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nombre TEXT NOT NULL,
        telefono TEXT DEFAULT '',
        rol TEXT NOT NULL CHECK(rol IN ('administrador', 'empleado')),
        activo INTEGER DEFAULT 1,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla usuarios creada');

    // Agregar columna telefono si no existe (migración)
    try {
      await db.run(`ALTER TABLE usuarios ADD COLUMN telefono TEXT DEFAULT ''`);
      console.log('✅ Columna telefono agregada');
    } catch (e) {
      // La columna ya existe, ignorar
    }

    // Agregar columna imagen a productos si no existe (migración)
    try {
      await db.run(`ALTER TABLE productos ADD COLUMN imagen TEXT DEFAULT ''`);
      console.log('✅ Columna imagen agregada a productos');
    } catch (e) {
      // La columna ya existe, ignorar
    }

    // Agregar columna metodo_pago a ventas si no existe (migración)
    try {
      await db.run(`ALTER TABLE ventas ADD COLUMN metodo_pago TEXT DEFAULT 'efectivo'`);
      console.log('✅ Columna metodo_pago agregada a ventas');
    } catch (e) {
      // La columna ya existe, ignorar
    }

    // Agregar columna monto_recibido a ventas si no existe (migración)
    try {
      await db.run(`ALTER TABLE ventas ADD COLUMN monto_recibido REAL DEFAULT 0`);
      console.log('✅ Columna monto_recibido agregada a ventas');
    } catch (e) {
      // La columna ya existe, ignorar
    }

    // Agregar columna cambio a ventas si no existe (migración)
    try {
      await db.run(`ALTER TABLE ventas ADD COLUMN cambio REAL DEFAULT 0`);
      console.log('✅ Columna cambio agregada a ventas');
    } catch (e) {
      // La columna ya existe, ignorar
    }

    // Agregar columna cliente_id a ventas si no existe (migración)
    try {
      await db.run(`ALTER TABLE ventas ADD COLUMN cliente_id INTEGER`);
      console.log('✅ Columna cliente_id agregada a ventas');
    } catch (e) {
      // La columna ya existe, ignorar
    }

    // Agregar columna estado a ventas si no existe (migración)
    try {
      await db.run(`ALTER TABLE ventas ADD COLUMN estado TEXT DEFAULT 'pagada'`);
      console.log('✅ Columna estado agregada a ventas');
    } catch (e) {
      // La columna ya existe, ignorar
    }

    // Tabla de categorías
    await db.run(`
      CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL,
        descripcion TEXT,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla categorias creada');

    // Tabla de productos
    await db.run(`
      CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        categoria_id INTEGER,
        tipo TEXT NOT NULL DEFAULT 'producto' CHECK(tipo IN ('producto','insumo','servicio')),
        codigo_qr TEXT UNIQUE,
        precio_compra REAL NOT NULL,
        precio_venta REAL NOT NULL,
        stock INTEGER DEFAULT 0,
        stock_minimo INTEGER DEFAULT 5,
        descripcion TEXT,
        activo INTEGER DEFAULT 1,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id)
      )
    `);
    console.log('✅ Tabla productos creada');


    // Tabla de clientes (CRM)
    await db.run(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        telefono TEXT,
        direccion TEXT,
        email TEXT,
        tipo TEXT NOT NULL DEFAULT 'cliente' CHECK(tipo IN ('cliente','paciente')),
        notas TEXT DEFAULT '',
        alergias TEXT DEFAULT '',
        observaciones TEXT DEFAULT '',
        ultima_visita DATETIME,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla clientes creada');

    // Migration: add extra profile fields to clientes if missing
    try {
      await db.run("ALTER TABLE clientes ADD COLUMN tipo TEXT NOT NULL DEFAULT 'cliente'");
      console.log('✅ Columna tipo agregada a clientes');
    } catch (e) { /* column already exists */ }
    try {
      await db.run("ALTER TABLE clientes ADD COLUMN notas TEXT DEFAULT ''");
      console.log('✅ Columna notas agregada a clientes');
    } catch (e) { /* column already exists */ }
    try {
      await db.run("ALTER TABLE clientes ADD COLUMN alergias TEXT DEFAULT ''");
      console.log('✅ Columna alergias agregada a clientes');
    } catch (e) { /* column already exists */ }
    try {
      await db.run("ALTER TABLE clientes ADD COLUMN observaciones TEXT DEFAULT ''");
      console.log('✅ Columna observaciones agregada a clientes');
    } catch (e) { /* column already exists */ }
    try {
      await db.run("ALTER TABLE clientes ADD COLUMN ultima_visita DATETIME");
      console.log('✅ Columna ultima_visita agregada a clientes');
    } catch (e) { /* column already exists */ }

    // Tabla de ventas (agrega cliente_id y estado)
    await db.run(`
      CREATE TABLE IF NOT EXISTS ventas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        cliente_id INTEGER,
        subtotal REAL NOT NULL,
        descuento REAL DEFAULT 0,
        total REAL NOT NULL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        estado TEXT DEFAULT 'pagada',
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
      )
    `);
    console.log('✅ Tabla ventas creada');

    // Tabla de abonos (para ventas pendientes)
    await db.run(`
      CREATE TABLE IF NOT EXISTS abonos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venta_id INTEGER NOT NULL,
        monto REAL NOT NULL,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (venta_id) REFERENCES ventas(id)
      )
    `);
    console.log('✅ Tabla abonos creada');

    // Tabla de detalle de ventas
    await db.run(`
      CREATE TABLE IF NOT EXISTS detalle_ventas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venta_id INTEGER NOT NULL,
        producto_id INTEGER NOT NULL,
        cantidad INTEGER NOT NULL,
        precio_unitario REAL NOT NULL,
        subtotal REAL NOT NULL,
        FOREIGN KEY (venta_id) REFERENCES ventas(id),
        FOREIGN KEY (producto_id) REFERENCES productos(id)
      )
    `);
    console.log('✅ Tabla detalle_ventas creada');

    // Tabla de gastos
    await db.run(`
      CREATE TABLE IF NOT EXISTS gastos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        descripcion TEXT NOT NULL,
        monto REAL NOT NULL,
        categoria TEXT NOT NULL,
        fecha DATE NOT NULL,
        usuario_id INTEGER NOT NULL,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )
    `);
    console.log('✅ Tabla gastos creada');

    // Tabla de caja (cash register sessions)
    await db.run(`
      CREATE TABLE IF NOT EXISTS caja (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        monto_apertura REAL NOT NULL DEFAULT 0,
        monto_cierre REAL,
        ventas_efectivo REAL DEFAULT 0,
        ventas_tarjeta REAL DEFAULT 0,
        total_ventas INTEGER DEFAULT 0,
        gastos_total REAL DEFAULT 0,
        estado TEXT NOT NULL DEFAULT 'abierta' CHECK(estado IN ('abierta', 'cerrada')),
        fecha_apertura DATETIME NOT NULL,
        fecha_cierre DATETIME,
        notas TEXT DEFAULT '',
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
      )
    `);
    console.log('✅ Tabla caja creada');

    // Migration: add gastos_total to caja if missing
    try {
      await db.run('ALTER TABLE caja ADD COLUMN gastos_total REAL DEFAULT 0');
      console.log('✅ Columna gastos_total agregada a caja');
    } catch (e) { /* column already exists */ }

    // Migration: add codigo_barras to productos if missing
    try {
      await db.run("ALTER TABLE productos ADD COLUMN codigo_barras TEXT DEFAULT ''");
      console.log('✅ Columna codigo_barras agregada a productos');
    } catch (e) { /* column already exists */ }

    // Migration: add tipo to productos if missing
    try {
      await db.run("ALTER TABLE productos ADD COLUMN tipo TEXT NOT NULL DEFAULT 'producto'");
      console.log('✅ Columna tipo agregada a productos');
    } catch (e) { /* column already exists */ }

    // Insertar datos iniciales
    await insertInitialData();

    console.log('✅ Base de datos inicializada correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    throw error;
  }
}

async function insertInitialData() {
  // Verificar si ya existen usuarios
  const existingUser = await db.get('SELECT id FROM usuarios LIMIT 1');
  
  if (!existingUser) {
    console.log('Insertando datos iniciales...');

    // Crear usuarios por defecto
    const adminPassword = await bcrypt.hash('admin123', 10);
    const empleadoPassword = await bcrypt.hash('empleado123', 10);

    await db.run(
      'INSERT INTO usuarios (username, password, nombre, rol) VALUES (?, ?, ?, ?)',
      ['admin', adminPassword, 'Administrador', 'administrador']
    );

    await db.run(
      'INSERT INTO usuarios (username, password, nombre, rol) VALUES (?, ?, ?, ?)',
      ['empleado', empleadoPassword, 'Empleado Demo', 'empleado']
    );

    console.log('✅ Usuarios por defecto creados');

    // Crear categorías por defecto
    const categorias = [
      ['Electrónicos', 'Productos electrónicos y tecnología'],
      ['Alimentos', 'Productos alimenticios'],
      ['Bebidas', 'Bebidas y refrescos'],
      ['Limpieza', 'Productos de limpieza'],
      ['Papelería', 'Artículos de oficina y papelería'],
      ['Otros', 'Otros productos']
    ];

    for (const [nombre, descripcion] of categorias) {
      await db.run(
        'INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)',
        [nombre, descripcion]
      );
    }

    console.log('✅ Categorías por defecto creadas');

    // Crear productos de ejemplo
    const productos = [
      ['Laptop HP', 1, 'LAP001', 8000, 10000, 5, 2, 'Laptop HP Core i5'],
      ['Mouse Logitech', 1, 'MOU001', 150, 250, 20, 5, 'Mouse inalámbrico'],
      ['Coca Cola 600ml', 3, 'COC001', 10, 15, 100, 20, 'Refresco'],
      ['Agua 1L', 3, 'AGU001', 5, 10, 150, 30, 'Agua purificada'],
      ['Jabón Líquido', 4, 'JAB001', 25, 40, 30, 10, 'Jabón para manos'],
      ['Papel Bond', 5, 'PAP001', 50, 80, 40, 10, 'Paquete 500 hojas']
    ];

    for (const producto of productos) {
      await db.run(
        'INSERT INTO productos (nombre, categoria_id, codigo_qr, precio_compra, precio_venta, stock, stock_minimo, descripcion) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        producto
      );
    }

    console.log('✅ Productos de ejemplo creados');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('Proceso completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { initDatabase };
