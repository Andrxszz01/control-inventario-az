import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';
import { cajaService } from '../services/api';
import { formatCurrency } from '../utils/helpers';
import { Landmark, DollarSign, Clock, Ban, History, Banknote, CreditCard, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

export default function Caja() {
  const { addToast } = useToast();
  const [cajaActual, setCajaActual] = useState(null);
  const [cajaAbierta, setCajaAbierta] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [montoApertura, setMontoApertura] = useState('');
  const [notasCierre, setNotasCierre] = useState('');
  const [loading, setLoading] = useState(true);
  const [showHistorial, setShowHistorial] = useState(false);
  const [cerrarConfirm, setCerrarConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCaja();

    // Auto-refresco cuando el usuario vuelve a la pestaña/ventana
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadCaja(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Auto-refresco cada 30 segundos mientras la caja está abierta
    const interval = setInterval(() => {
      loadCaja(true);
    }, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, []);

  const loadCaja = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const res = await cajaService.getActual();
      setCajaAbierta(res.data.abierta);
      setCajaActual(res.data.caja);
    } catch {
      addToast('Error al cargar la caja', 'error');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const loadHistorial = async () => {
    try {
      const res = await cajaService.getHistorial();
      setHistorial(res.data.cajas || []);
      setShowHistorial(true);
    } catch {
      addToast('Error al cargar el historial', 'error');
    }
  };

  const handleAbrir = async () => {
    setSubmitting(true);
    try {
      await cajaService.abrir({ monto_apertura: Number(montoApertura) || 0 });
      addToast('Caja abierta correctamente', 'success');
      setMontoApertura('');
      loadCaja();
    } catch (error) {
      addToast(error.response?.data?.error || 'Error al abrir caja', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCerrar = async () => {
    setCerrarConfirm(false);
    setSubmitting(true);
    try {
      await cajaService.cerrar({ notas: notasCierre });
      addToast('Caja cerrada correctamente', 'success');
      setNotasCierre('');
      loadCaja();
    } catch (error) {
      addToast(error.response?.data?.error || 'Error al cerrar caja', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    const str = typeof fecha === 'string' ? fecha : String(fecha);
    const [date, time] = str.split(' ');
    const parts = date?.split('-');
    if (!parts || parts.length < 3) return str;
    const [y, m, d] = parts;
    return `${d}/${m}/${y} ${time || ''}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 size={24} className="animate-spin mr-2" /> Cargando caja...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        isOpen={cerrarConfirm}
        title="¿Cerrar la caja?"
        message="Se registrará el cierre con los datos actuales. Esta acción no se puede deshacer."
        onConfirm={handleCerrar}
        onCancel={() => setCerrarConfirm(false)}
        confirmLabel="Sí, cerrar caja"
        danger
      />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Landmark size={32} /> Caja
        </h1>
        <Button variant="outline" onClick={loadHistorial}>
          <History size={18} className="mr-2" /> Historial
        </Button>
      </div>

      {/* Caja cerrada - Abrir */}
      {!cajaAbierta && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban size={20} /> No hay caja abierta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Abra la caja para comenzar a registrar ventas del día.</p>
            <div className="flex gap-4 items-end max-w-md">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Monto de apertura</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={montoApertura}
                  onChange={(e) => setMontoApertura(e.target.value)}
                />
              </div>
              <Button onClick={handleAbrir} disabled={submitting}>
                {submitting ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" />Abriendo...</>
                ) : (
                  <><Landmark size={18} className="mr-2" /> Abrir Caja</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Caja abierta - Resumen */}
      {cajaAbierta && cajaActual && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-green-100 text-green-600">
                    <DollarSign size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Dinero en Caja</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(cajaActual.dinero_en_caja)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                    <Banknote size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ventas Efectivo</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(cajaActual.ventas_efectivo)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ventas Tarjeta</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(cajaActual.ventas_tarjeta)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-amber-100 text-amber-600">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Ventas</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {cajaActual.total_ventas}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-red-100 text-red-600">
                    <TrendingDown size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Gastos</p>
                    <p className="text-2xl font-bold text-red-600">
                      -{formatCurrency(cajaActual.gastos_total || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock size={20} /> Información de Caja
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">Abierta por</p>
                  <p className="font-semibold">{cajaActual.usuario}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fecha/Hora Apertura</p>
                  <p className="font-semibold">{formatFecha(cajaActual.fecha_apertura)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monto Apertura</p>
                  <p className="font-semibold">{formatCurrency(cajaActual.monto_apertura)}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium mb-1">Notas de cierre (opcional)</label>
                <div className="flex gap-4 items-end max-w-lg">
                  <Input
                    placeholder="Observaciones al cerrar caja..."
                    value={notasCierre}
                    onChange={(e) => setNotasCierre(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="destructive" onClick={() => setCerrarConfirm(true)} disabled={submitting}>
                    {submitting ? (
                      <><Loader2 size={16} className="mr-2 animate-spin" />Cerrando...</>
                    ) : (
                      <><Ban size={18} className="mr-2" /> Cerrar Caja</>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <Button variant="outline" onClick={loadCaja}>
              Actualizar datos
            </Button>
          </div>
        </>
      )}

      {/* Historial */}
      {showHistorial && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History size={20} /> Historial de Caja
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historial.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No hay registros de caja aún.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Usuario</th>
                      <th className="text-left py-2 px-3">Apertura</th>
                      <th className="text-left py-2 px-3">Cierre</th>
                      <th className="text-right py-2 px-3">Monto Apertura</th>
                      <th className="text-right py-2 px-3">Efectivo</th>
                      <th className="text-right py-2 px-3">Tarjeta</th>
                      <th className="text-right py-2 px-3">Gastos</th>
                      <th className="text-right py-2 px-3">Monto Cierre</th>
                      <th className="text-center py-2 px-3">Estado</th>
                      <th className="text-left py-2 px-3">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((c) => (
                      <tr key={c.id} className="border-b hover:bg-accent/50">
                        <td className="py-2 px-3">{c.usuario}</td>
                        <td className="py-2 px-3">{formatFecha(c.fecha_apertura)}</td>
                        <td className="py-2 px-3">{formatFecha(c.fecha_cierre)}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(c.monto_apertura)}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(c.ventas_efectivo)}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(c.ventas_tarjeta)}</td>
                        <td className="py-2 px-3 text-right text-red-600">{formatCurrency(c.gastos_total || 0)}</td>
                        <td className="py-2 px-3 text-right font-semibold">{formatCurrency(c.monto_cierre)}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            c.estado === 'abierta' 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {c.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{c.notas || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
