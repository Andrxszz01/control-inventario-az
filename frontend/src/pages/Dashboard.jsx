import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { reportesService } from '../services/api';
import { formatCurrency } from '../utils/helpers';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, ShoppingCart, Package, AlertTriangle, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadDashboard(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    const interval = setInterval(() => {
      loadDashboard(true);
    }, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, []);

  const loadDashboard = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await reportesService.getDashboard();
      setStats(response.data.dashboard);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo conectar con el servidor');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Cargando dashboard...</div>;
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 w-14 h-14 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-2xl font-bold">!</div>
        <h3 className="text-lg font-semibold mb-1">No se pudo cargar el dashboard</h3>
        <p className="text-sm text-muted-foreground mb-5">{error}</p>
        <button
          onClick={loadDashboard}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <RefreshCw size={15} /> Reintentar
        </button>
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Ventas del Día',
      value: formatCurrency(stats.ventasHoy?.monto ?? 0),
      subtitle: `${stats.ventasHoy?.cantidad ?? 0} ventas`,
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      title: 'Ganancias del Mes',
      value: formatCurrency(stats.gananciasMes ?? 0),
      subtitle: 'Utilidad neta',
      icon: ShoppingCart,
      color: 'text-blue-600',
    },
    {
      title: 'Total Productos',
      value: stats.totalProductos ?? 0,
      subtitle: 'Activos',
      icon: Package,
      color: 'text-purple-600',
    },
    {
      title: 'Stock Bajo',
      value: stats.stockBajo ?? 0,
      subtitle: 'Productos',
      icon: AlertTriangle,
      color: 'text-red-600',
    },
  ];

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold mt-2">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                  </div>
                  <div className={`p-3 rounded-full bg-accent ${stat.color}`}>
                    <Icon size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Ventas Últimos 7 Días</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.ventasSemana ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topProductos?.map((producto, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-accent rounded-lg">
                  <div>
                    <p className="font-medium">{producto.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {producto.cantidad_vendida} unidades
                    </p>
                  </div>
                  <p className="font-semibold">{formatCurrency(producto.total_vendido)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
