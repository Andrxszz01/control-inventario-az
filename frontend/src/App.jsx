import React from 'react';
import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Productos from './pages/Productos';
import Ventas from './pages/Ventas';
import Gastos from './pages/Gastos';
import Reportes from './pages/Reportes';
import Usuarios from './pages/Usuarios';
import Caja from './pages/Caja';
import Clientes from './pages/Clientes';
import EstadoCuentaCliente from './pages/EstadoCuentaCliente';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <MainLayout><ErrorBoundary>{children}</ErrorBoundary></MainLayout>;
}

function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <MainLayout><ErrorBoundary>{children}</ErrorBoundary></MainLayout>;
}

const router = createHashRouter([
  { path: '/login',    element: <Login /> },
  { path: '/register', element: <Register /> },
  { path: '/dashboard', element: <ProtectedRoute><Dashboard /></ProtectedRoute> },
  { path: '/productos', element: <ProtectedRoute><Productos /></ProtectedRoute> },
  { path: '/ventas',    element: <ProtectedRoute><Ventas /></ProtectedRoute> },
  { path: '/gastos',    element: <AdminRoute><Gastos /></AdminRoute> },
  { path: '/reportes',  element: <AdminRoute><Reportes /></AdminRoute> },
  { path: '/usuarios',  element: <AdminRoute><Usuarios /></AdminRoute> },
  { path: '/caja',      element: <ProtectedRoute><Caja /></ProtectedRoute> },
  { path: '/clientes',  element: <ProtectedRoute><Clientes /></ProtectedRoute> },
  { path: '/clientes/:id/estado-cuenta', element: <ProtectedRoute><EstadoCuentaCliente /></ProtectedRoute> },
  { path: '/',          element: <Navigate to="/dashboard" replace /> },
  { path: '*',          element: <Navigate to="/dashboard" replace /> },
]);

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
