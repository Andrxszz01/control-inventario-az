# Control de Inventario AZ - Guía de Desarrollo

## 📋 Prerrequisitos

- Node.js 18 o superior
- npm o pnpm
- Windows 10/11 (para desarrollo de aplicación de escritorio)

## 🚀 Instalación Rápida

### Opción 1: Automática (Windows)
```bash
install.bat
```

### Opción 2: Manual

1. **Instalar dependencias del backend:**
```bash
cd backend
npm install
```

2. **Instalar dependencias del frontend:**
```bash
cd frontend
npm install
```

3. **Instalar dependencias raíz:**
```bash
npm install
```

## 💻 Desarrollo

### Iniciar Backend
```bash
cd backend
npm run dev
```
El backend estará disponible en: `http://localhost:3000`

### Iniciar Frontend
```bash
cd frontend
npm run dev
```
El frontend estará disponible en: `http://localhost:5173`

### Iniciar todo con un comando (Windows)
```bash
start_dev.bat
```

### Iniciar con Electron
```bash
npm start
```

## 📦 Compilar Instalador

### Automático (Windows)
```bash
build.bat
```

### Manual
```bash
cd frontend
npm run build
cd ..
npm run package
```

El instalador se generará en `dist/`

## 🏗️ Estructura del Proyecto

```
control-inventario-az/
├── backend/               # API REST con Express
│   ├── src/
│   │   ├── controllers/  # Controladores de rutas
│   │   ├── routes/       # Definición de rutas
│   │   ├── database/     # Configuración SQLite
│   │   ├── middleware/   # Autenticación y otros
│   │   └── server.js     # Servidor principal
│   └── package.json
│
├── frontend/             # Interfaz React
│   ├── src/
│   │   ├── components/   # Componentes reutilizables
│   │   ├── pages/        # Páginas de la aplicación
│   │   ├── services/     # Servicios API
│   │   ├── contexts/     # Context API (Auth)
│   │   ├── utils/        # Funciones auxiliares
│   │   └── App.jsx       # Componente principal
│   └── package.json
│
├── electron/             # Configuración Electron
│   └── main.js          # Proceso principal
│
├── database/            # Base de datos SQLite
│   └── inventario.db    # (se crea automático)
│
└── package.json         # Configuración raíz
```

## 🔑 Credenciales por Defecto

**Administrador:**
- Usuario: `admin`
- Contraseña: `admin123`

**Empleado:**
- Usuario: `empleado`
- Contraseña: `empleado123`

## 🔧 Tecnologías Utilizadas

### Backend
- Node.js
- Express.js
- SQLite3
- JWT (autenticación)
- bcryptjs (encriptación)
- QRCode (generación de códigos QR)

### Frontend
- React 18
- Vite
- TailwindCSS
- React Router
- Axios
- Recharts (gráficas)
- Lucide React (iconos)

### Desktop
- Electron.js
- Electron Builder

## 📝 Variables de Entorno

### Backend (.env)
```
PORT=3000
JWT_SECRET=tu_clave_secreta
NODE_ENV=development
DB_PATH=../database/inventario.db
```

## 🔄 API Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/profile` - Obtener perfil
- `POST /api/auth/change-password` - Cambiar contraseña

### Productos
- `GET /api/productos` - Listar productos
- `GET /api/productos/:id` - Obtener producto
- `POST /api/productos` - Crear producto (admin)
- `PUT /api/productos/:id` - Actualizar producto (admin)
- `DELETE /api/productos/:id` - Eliminar producto (admin)
- `GET /api/productos/low-stock` - Productos con stock bajo
- `GET /api/productos/:id/qr` - Generar QR

### Ventas
- `POST /api/ventas` - Registrar venta
- `GET /api/ventas` - Listar ventas
- `GET /api/ventas/:id` - Obtener venta
- `GET /api/ventas/stats` - Estadísticas

### Gastos (Solo Admin)
- `POST /api/gastos` - Registrar gasto
- `GET /api/gastos` - Listar gastos
- `GET /api/gastos/:id` - Obtener gasto
- `PUT /api/gastos/:id` - Actualizar gasto
- `DELETE /api/gastos/:id` - Eliminar gasto
- `GET /api/gastos/stats` - Estadísticas

### Reportes (Solo Admin)
- `GET /api/reportes/dashboard` - Dashboard principal
- `GET /api/reportes/ventas-por-fecha` - Reporte de ventas
- `GET /api/reportes/utilidades` - Reporte de utilidades
- `GET /api/reportes/inventario` - Reporte de inventario

### Categorías
- `GET /api/categorias` - Listar categorías
- `POST /api/categorias` - Crear categoría (admin)
- `PUT /api/categorias/:id` - Actualizar categoría (admin)
- `DELETE /api/categorias/:id` - Eliminar categoría (admin)

## 🐛 Debugging

### Ver logs del backend
Los logs aparecen directamente en la consola donde ejecutas `npm run dev`

### Verificar base de datos
La base de datos SQLite se encuentra en `database/inventario.db`
Puedes abrirla con herramientas como DB Browser for SQLite

### Reiniciar base de datos
```bash
cd backend
npm run init-db
```

## 📱 Funcionalidades Principales

✅ Sistema de autenticación con roles
✅ Gestión de inventario (CRUD productos)
✅ Punto de Venta (POS)
✅ Generación automática de códigos QR
✅ Control de gastos
✅ Reportes y estadísticas
✅ Dashboard con gráficas
✅ Alertas de stock bajo
✅ Modo oscuro
✅ Diseño responsive

## 🔐 Seguridad

- Contraseñas encriptadas con bcrypt
- Autenticación con JWT
- Validación de permisos por rol
- Protección de rutas en frontend y backend

## 📄 Licencia

MIT License - Uso libre para proyectos comerciales y personales

## 🤝 Soporte

Para preguntas o problemas:
- Email: soporte@azsoftware.com
- Issues: GitHub Issues

---

Desarrollado con ❤️ por AZ Software
