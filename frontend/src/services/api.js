import axios from 'axios';

const isDesktopApp = window.location.protocol === 'file:';
const API_URL = import.meta.env.VITE_API_URL || (isDesktopApp ? 'http://127.0.0.1:3000/api' : '/api');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a todas las requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.hash = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (data) => api.post('/auth/change-password', data),
  getUsers: () => api.get('/auth/users'),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
  resetStore: () => api.post('/auth/reset-store'),
};

// Productos
export const productosService = {
  getAll: (params) => api.get('/productos', { params }),
  getById: (id) => api.get(`/productos/${id}`),
  findByBarcode: (code) => api.get(`/productos/barcode/${encodeURIComponent(code)}`),
  create: (data) => api.post('/productos', data),
  update: (id, data) => api.put(`/productos/${id}`, data),
  delete: (id) => api.delete(`/productos/${id}`),
  getLowStock: () => api.get('/productos/low-stock'),
  generateQR: (id) => api.get(`/productos/${id}/qr`),
  uploadImage: (id, file) => {
    const formData = new FormData();
    formData.append('imagen', file);
    return api.post(`/productos/${id}/imagen`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteImage: (id) => api.delete(`/productos/${id}/imagen`),
  getImageUrl: (filename) => {
    if (!filename) return null;
    return `${API_URL}/uploads/${filename}`;
  },
};

// Categorías
export const categoriasService = {
  getAll: () => api.get('/categorias'),
  create: (data) => api.post('/categorias', data),
  update: (id, data) => api.put(`/categorias/${id}`, data),
  delete: (id) => api.delete(`/categorias/${id}`),
};

// Ventas
export const ventasService = {
  create: (data) => api.post('/ventas', data),
  getAll: (params) => api.get('/ventas', { params }),
  getById: (id) => api.get(`/ventas/${id}`),
  delete: (id) => api.delete(`/ventas/${id}`),
  getStats: () => api.get('/ventas/stats'),
  getTicket: (id) => api.get(`/ventas/${id}/ticket`, { responseType: 'blob' }),
  getTicketHtml: (id) => api.get(`/ventas/${id}/ticket-html`, { responseType: 'text' }),
  getTicketText: (id) => api.get(`/ventas/${id}/ticket-text`, { responseType: 'text' }),
};

// Caja
export const cajaService = {
  getActual: () => api.get('/caja/actual'),
  getHistorial: (params) => api.get('/caja/historial', { params }),
  abrir: (data) => api.post('/caja/abrir', data),
  cerrar: (data) => api.post('/caja/cerrar', data),
};

// Gastos
export const gastosService = {
  create: (data) => api.post('/gastos', data),
  getAll: (params) => api.get('/gastos', { params }),
  getById: (id) => api.get(`/gastos/${id}`),
  update: (id, data) => api.put(`/gastos/${id}`, data),
  delete: (id) => api.delete(`/gastos/${id}`),
  getStats: () => api.get('/gastos/stats'),
};

// Reportes
export const reportesService = {
  getVentasPorFecha: (params) => api.get('/reportes/ventas-por-fecha', { params }),
  getUtilidades: (params) => api.get('/reportes/utilidades', { params }),
  getInventario: () => api.get('/reportes/inventario'),
  getDashboard: () => api.get('/reportes/dashboard'),
  // PDF downloads
  descargarPdfVentas: (params) => api.get('/reportes/pdf/ventas', { params, responseType: 'blob' }),
  descargarPdfInventario: () => api.get('/reportes/pdf/inventario', { responseType: 'blob' }),
  descargarPdfTopProductos: (params) => api.get('/reportes/pdf/top-productos', { params, responseType: 'blob' }),
  descargarPdfUtilidades: (params) => api.get('/reportes/pdf/utilidades', { params, responseType: 'blob' }),
};

export default api;
