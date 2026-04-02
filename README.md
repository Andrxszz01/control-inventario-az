# Control de Inventario AZ

Sistema profesional de control de inventario, ventas y gastos para pequeños y medianos negocios.

## 🚀 Características

- ✅ Sistema de autenticación con roles (Administrador/Empleado)
- ✅ Gestión completa de inventario
- ✅ Generación automática de códigos QR
- ✅ Sistema de ventas tipo POS
- ✅ Generación de tickets de venta
- ✅ Control de gastos
- ✅ Reportes y estadísticas
- ✅ Dashboard profesional con gráficas
- ✅ Modo oscuro
- ✅ 100% Offline
- ✅ Base de datos SQLite local

## 🛠️ Tecnologías

### Frontend
- React 18
- Vite
- TailwindCSS
- ShadCN UI
- React Router
- Recharts (gráficas)

### Backend
- Node.js
- Express.js
- SQLite3
- JWT Authentication

### Desktop
- Electron.js

## 📦 Instalación

### Requisitos previos
- Node.js 18+ instalado
- npm o pnpm

### Pasos

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

## 🚀 Ejecutar en desarrollo

### Opción 1: Todo junto
```bash
npm run dev
```

### Opción 2: Por separado

**Backend:**
```bash
npm run dev:backend
```

**Frontend:**
```bash
npm run dev:frontend
```

**Electron:**
```bash
npm run electron:dev
```

## 📱 Ejecutar como aplicación de escritorio

```bash
npm start
```

## 🏗️ Compilar instalador

```bash
npm run package
```

El instalador se generará en la carpeta `dist/`

## 📁 Estructura del proyecto

```
control-inventario-az/
├── backend/           # API REST con Express
├── frontend/          # Interfaz con React
├── database/          # Archivos SQLite
├── electron/          # Configuración Electron
├── shared/            # Código compartido
└── package.json       # Configuración principal
```

## 👤 Usuario por defecto

**Administrador:**
- Usuario: `admin`
- Contraseña: `admin123`

**Empleado:**
- Usuario: `empleado`
- Contraseña: `empleado123`

## 🔒 Seguridad

- Las contraseñas se almacenan con hash bcrypt
- Autenticación con JWT
- Validación de permisos por rol

## 📊 Base de datos

La base de datos SQLite se crea automáticamente en `database/inventario.db`

## 🎨 Temas

El sistema incluye modo claro y oscuro que se puede cambiar desde la interfaz.

## 📄 Licencia

MIT License - Libre uso para proyectos comerciales y personales.

## 🤝 Soporte

Para soporte y preguntas, contactar a manuel-lionel123@hotmail.com

---

Desarrollado con ❤️ por AZ Software
