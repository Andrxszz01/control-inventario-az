import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  BarChart3, 
  Users,
  Landmark,
  LogOut, 
  Menu, 
  X,
  Moon,
  Sun
} from 'lucide-react';

export default function MainLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = () => {
    logout();
    // Hard reload prevents stale React/router state after logout in desktop builds.
    window.location.hash = '#/login';
    window.location.reload();
  };

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', admin: false },
    { path: '/productos', icon: Package, label: 'Inventario', admin: false },
    { path: '/ventas', icon: ShoppingCart, label: 'Ventas', admin: false },
    { path: '/caja', icon: Landmark, label: 'Caja', admin: false },
    { path: '/gastos', icon: DollarSign, label: 'Gastos', admin: true },
    { path: '/reportes', icon: BarChart3, label: 'Reportes', admin: true },
    { path: '/usuarios', icon: Users, label: 'Usuarios', admin: true },
  ];

  const filteredMenuItems = menuItems.filter(item => !item.admin || isAdmin());

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-card border-r border-border transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <span className="text-xl font-bold text-primary whitespace-nowrap select-none">
                Panel de Control
              </span>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-accent rounded-lg"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
              {(user?.nombre ?? user?.username)?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {sidebarOpen && (
              <div className="flex-1">
                <p className="text-sm font-medium">{user?.nombre ?? user?.username}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user?.rol}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">
              {filteredMenuItems.find(item => item.path === location.pathname)?.label || 'Control de Inventario'}
            </h2>
            
            <div className="flex items-center gap-4">
              <button
                onClick={toggleDarkMode}
                className="p-2 hover:bg-accent rounded-lg"
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90"
              >
                <LogOut size={20} />
                Salir
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
