import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { reportesService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency } from '../utils/helpers';
import { FileText, Download, Loader2 } from 'lucide-react';

export default function Reportes() {
  const { addToast } = useToast();
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [utilidades, setUtilidades] = useState(null);
  const [loading, setLoading] = useState(false);
  const [descargando, setDescargando] = useState('');

  const generarReporteUtilidades = async () => {
    if (!fechaInicio || !fechaFin) {
      addToast('Selecciona las fechas de inicio y fin', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await reportesService.getUtilidades({ fechaInicio, fechaFin });
      setUtilidades(response.data.utilidades);
    } catch (error) {
      addToast(error.response?.data?.error || 'Error al generar el reporte', 'error');
    } finally {
      setLoading(false);
    }
  };

  const descargarPDF = async (tipo) => {
    if (tipo !== 'inventario' && (!fechaInicio || !fechaFin)) {
      addToast('Selecciona las fechas antes de descargar el PDF', 'warning');
      return;
    }
    setDescargando(tipo);
    try {
      let response;
      let filename;
      const params = { fechaInicio, fechaFin };

      switch (tipo) {
        case 'ventas':
          response = await reportesService.descargarPdfVentas(params);
          filename = `ventas_${fechaInicio}_a_${fechaFin}.pdf`;
          break;
        case 'inventario':
          response = await reportesService.descargarPdfInventario();
          filename = `inventario_${(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })()}.pdf`;
          break;
        case 'top-productos':
          response = await reportesService.descargarPdfTopProductos(params);
          filename = `top_productos.pdf`;
          break;
        case 'utilidades':
          response = await reportesService.descargarPdfUtilidades(params);
          filename = `utilidades_${fechaInicio}_a_${fechaFin}.pdf`;
          break;
        default:
          return;
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      addToast(error.response?.data?.error || 'Error al descargar el PDF. Verifica que las fechas sean correctas.', 'error');
    } finally {
      setDescargando('');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText size={24} />
            Reportes y Estadísticas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Fecha Inicio</label>
              <Input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Fecha Fin</label>
              <Input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={generarReporteUtilidades} disabled={loading} className="flex-1">
                {loading ? 'Generando...' : 'Ver Reporte'}
              </Button>
            </div>
          </div>

          {utilidades && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Ingresos</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(utilidades.ingresos)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Costos</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(utilidades.costos)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Gastos</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(utilidades.gastos)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Utilidad Neta</p>
                    <p className={`text-2xl font-bold ${utilidades.utilidadNeta >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatCurrency(utilidades.utilidadNeta)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Margen: {utilidades.margenUtilidad}%
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => descargarPDF('utilidades')}
                  disabled={descargando === 'utilidades'}
                  variant="outline"
                >
                  {descargando === 'utilidades' ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
                  Descargar Utilidades PDF
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">Ventas por Fecha</h3>
            <p className="text-sm text-muted-foreground">
              Reporte detallado de ventas en un periodo
            </p>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => descargarPDF('ventas')}
              disabled={descargando === 'ventas'}
            >
              {descargando === 'ventas' ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
              Descargar PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">Inventario Actual</h3>
            <p className="text-sm text-muted-foreground">
              Estado actual del inventario y valores
            </p>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => descargarPDF('inventario')}
              disabled={descargando === 'inventario'}
            >
              {descargando === 'inventario' ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
              Descargar PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">Productos Más Vendidos</h3>
            <p className="text-sm text-muted-foreground">
              Top productos con mejor rotación
            </p>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => descargarPDF('top-productos')}
              disabled={descargando === 'top-productos'}
            >
              {descargando === 'top-productos' ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Download size={16} className="mr-2" />}
              Descargar PDF
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
