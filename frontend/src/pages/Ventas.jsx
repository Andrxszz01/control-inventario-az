import React, { useEffect, useState, useCallback, useRef, useTransition } from 'react';
import { useBlocker } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import BarcodeScanner from '../components/ui/BarcodeScanner';
import { useToast } from '../contexts/ToastContext';
import { productosService, ventasService } from '../services/api';
import { formatCurrency } from '../utils/helpers';
import { Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Printer, Search, ImagePlus, Loader2, ScanBarcode } from 'lucide-react';

export default function Ventas() {
  const [lastVentaId, setLastVentaId] = useState(null);
  const { addToast } = useToast();
  const [productos, setProductos] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [descuento, setDescuento] = useState(0);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [montoRecibido, setMontoRecibido] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [limpiarConfirm, setLimpiarConfirm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [, startTransition] = useTransition();
  const busquedaRef = useRef(null);

  // Warn when navigating away with items in the cart
  const blocker = useBlocker(carrito.length > 0 && !procesando);

  const loadProductos = useCallback(async (search) => {
    try {
      const response = await productosService.getAll({ busqueda: search });
      startTransition(() => {
        setProductos(response.data.productos ?? []);
      });
    } catch {
      addToast('Error al cargar los productos', 'error');
    }
  }, [addToast]);

  useEffect(() => { loadProductos(''); }, [loadProductos]);

  useEffect(() => {
    const timer = setTimeout(() => loadProductos(busqueda), 300);
    return () => clearTimeout(timer);
  }, [busqueda, loadProductos]);

  const handleBarcodeScan = useCallback(async (code) => {
    try {
      const response = await productosService.findByBarcode(code);
      if (response.data.producto) {
        agregarAlCarritoDirecto(response.data.producto);
        addToast(`"${response.data.producto.nombre}" agregado al carrito`, 'success');
      }
    } catch {
      // Producto no encontrado por barcode, buscar por texto
      setBusqueda(code);
      addToast(`Código "${code}" no encontrado, buscando...`, 'info');
    }
    setShowScanner(false);
  }, [addToast]);

  const agregarAlCarritoDirecto = (producto) => {
    if (producto.stock === 0) {
      addToast(`"${producto.nombre}" no tiene stock disponible`, 'warning');
      return;
    }
    setCarrito(prev => {
      const existe = prev.find((item) => item.producto_id === producto.id);
      if (existe) {
        if (existe.cantidad < producto.stock) {
          return prev.map((item) =>
            item.producto_id === producto.id
              ? { ...item, cantidad: item.cantidad + 1 }
              : item
          );
        }
        addToast(`Stock insuficiente — solo hay ${producto.stock} unidades`, 'warning');
        return prev;
      }
      return [...prev, {
        producto_id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio_venta,
        cantidad: 1,
        stock_disponible: producto.stock,
      }];
    });
  };

  const agregarAlCarrito = (producto) => {
    if (producto.stock === 0) {
      addToast(`"${producto.nombre}" no tiene stock disponible`, 'warning');
      return;
    }
    setCarrito(prev => {
      const existe = prev.find((item) => item.producto_id === producto.id);
      if (existe) {
        if (existe.cantidad < producto.stock) {
          return prev.map((item) =>
            item.producto_id === producto.id
              ? { ...item, cantidad: item.cantidad + 1 }
              : item
          );
        }
        addToast(`Stock insuficiente — solo hay ${producto.stock} unidades de "${producto.nombre}"`, 'warning');
        return prev;
      }
      return [...prev, {
        producto_id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio_venta,
        cantidad: 1,
        stock_disponible: producto.stock,
      }];
    });
  };

  const modificarCantidad = (id, delta) => {
    setCarrito(prev =>
      prev.map((item) => {
        if (item.producto_id !== id) return item;
        const nuevaCantidad = item.cantidad + delta;
        if (nuevaCantidad <= 0) return null;
        if (nuevaCantidad > item.stock_disponible) {
          addToast(`Máximo disponible: ${item.stock_disponible} unidades`, 'warning');
          return item;
        }
        return { ...item, cantidad: nuevaCantidad };
      }).filter(Boolean)
    );
  };

  const eliminarDelCarrito = (id) => setCarrito(prev => prev.filter((i) => i.producto_id !== id));

  const limpiarCarritoConfirmado = () => {
    setCarrito([]);
    setDescuento(0);
    setMontoRecibido('');
    setMetodoPago('efectivo');
    setLimpiarConfirm(false);
  };

  const subtotal = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const descuentoAplicado = Math.min(Math.max(0, descuento), subtotal);
  const total = subtotal - descuentoAplicado;
  const cambio = montoRecibido ? Math.max(0, Number(montoRecibido) - total) : 0;

  const imprimirTicket = async (ventaId) => {
    try {
      if (window.electronAPI?.printHtmlTicket) {
        const response = await ventasService.getTicketHtml(ventaId);
        const html = typeof response.data === 'string' ? response.data : String(response.data || '');
        const printResult = await window.electronAPI.printHtmlTicket(html);
        if (!printResult?.success) {
          throw new Error(printResult?.message || 'No se pudo imprimir');
        }
        return;
      }

      if (window.electronAPI?.printTextTicket) {
        const response = await ventasService.getTicketText(ventaId);
        const text = typeof response.data === 'string' ? response.data : String(response.data || '');
        const printResult = await window.electronAPI.printTextTicket(text);
        if (!printResult?.success) {
          throw new Error(printResult?.message || 'No se pudo imprimir en modo texto');
        }
        return;
      }

      const response = await ventasService.getTicket(ventaId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank', 'width=320,height=600');
      if (win) win.onload = () => win.print();
    } catch {
      addToast('Venta registrada, pero no se pudo imprimir el ticket', 'warning');
    }
  };


  const finalizarVenta = async () => {
    if (carrito.length === 0) {
      addToast('El carrito está vacío', 'warning');
      return;
    }
    if (metodoPago === 'efectivo') {
      if (!montoRecibido || Number(montoRecibido) <= 0) {
        addToast('Ingresa el monto recibido del cliente', 'warning');
        return;
      }
      if (Number(montoRecibido) < total) {
        addToast(`Monto insuficiente — faltan ${formatCurrency(total - Number(montoRecibido))}`, 'warning');
        return;
      }
    }

    setProcesando(true);
    try {
      const ventaData = {
        productos: carrito.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad })),
        descuento: descuentoAplicado,
        metodo_pago: metodoPago,
        monto_recibido: metodoPago === 'efectivo' ? Number(montoRecibido) : total,
      };

      const response = await ventasService.create(ventaData);

      if (response.data.success) {
        addToast('¡Venta registrada correctamente!', 'success');
        if (metodoPago === 'efectivo' && cambio > 0) {
          addToast(`Cambio a entregar: ${formatCurrency(cambio)}`, 'info', 7000);
        }
        await imprimirTicket(response.data.venta.id);
        setLastVentaId(response.data.venta.id);
        setCarrito([]);
        setDescuento(0);
        setMontoRecibido('');
        setMetodoPago('efectivo');
        loadProductos(busqueda);
      }
    } catch (error) {
      addToast(error.response?.data?.error || 'Error al registrar la venta', 'error');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Navigation blocker */}
      <ConfirmDialog
        isOpen={blocker.state === 'blocked'}
        title="¿Abandonar la venta?"
        message="Tienes productos en el carrito. Si cambias de sección perderás el carrito actual."
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
        confirmLabel="Salir de todos modos"
        cancelLabel="Quedarme aquí"
        danger
      />

      <ConfirmDialog
        isOpen={limpiarConfirm}
        title="¿Limpiar carrito?"
        message="Se eliminarán todos los productos del carrito. Esta acción no se puede deshacer."
        onConfirm={limpiarCarritoConfirmado}
        onCancel={() => setLimpiarConfirm(false)}
        confirmLabel="Limpiar carrito"
        danger
      />

      {/* Products list */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              ref={busquedaRef}
              placeholder="Buscar productos por nombre o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowScanner(true)}
            title="Escanear código de barras"
            className="shrink-0"
          >
            <ScanBarcode size={20} />
          </Button>
        </div>

        <BarcodeScanner
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={handleBarcodeScan}
        />

        {productos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {busqueda ? 'No se encontraron productos con esa búsqueda' : 'No hay productos disponibles'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {productos.map((producto) => (
              <Card
                key={producto.id}
                className={`transition-shadow ${producto.stock > 0 ? 'hover:shadow-lg cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                onClick={() => producto.stock > 0 && agregarAlCarrito(producto)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-3 items-start">
                    <div className="w-14 h-14 rounded border overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                      {producto.imagen ? (
                        <img
                          src={productosService.getImageUrl(producto.imagen)}
                          alt={producto.nombre}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImagePlus size={20} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{producto.nombre}</h3>
                      <p className="text-xs text-muted-foreground">{producto.categoria_nombre}</p>
                      <p className="text-base font-bold text-primary mt-1">
                        {formatCurrency(producto.precio_venta)}
                      </p>
                      <p className={`text-xs font-medium ${
                        producto.stock === 0 ? 'text-red-600' :
                        producto.stock <= producto.stock_minimo ? 'text-amber-600' : 'text-muted-foreground'
                      }`}>
                        {producto.stock === 0 ? 'Sin stock' : `Stock: ${producto.stock}`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); agregarAlCarrito(producto); }}
                      disabled={producto.stock === 0}
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Cart */}
      <div>
        <Card className="sticky top-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart size={20} />
                Carrito
                {carrito.length > 0 && (
                  <span className="ml-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-bold">
                    {carrito.reduce((s, i) => s + i.cantidad, 0)}
                  </span>
                )}
              </CardTitle>
              {carrito.length > 0 && (
                <button
                  className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                  onClick={() => setLimpiarConfirm(true)}
                >
                  Limpiar todo
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {carrito.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-8">
                Haz clic en un producto para agregarlo
              </p>
            ) : (
              <>
                <div className="space-y-2 max-h-72 overflow-auto pr-1">
                  {carrito.map((item) => (
                    <div key={item.producto_id} className="flex items-center justify-between p-2 bg-accent rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.precio)} × {item.cantidad} = {formatCurrency(item.precio * item.cantidad)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="ghost" onClick={() => modificarCantidad(item.producto_id, -1)}>
                          <Minus size={14} />
                        </Button>
                        <span className="w-7 text-center font-bold text-sm">{item.cantidad}</span>
                        <Button size="sm" variant="ghost" onClick={() => modificarCantidad(item.producto_id, 1)}>
                          <Plus size={14} />
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          className="text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => eliminarDelCarrito(item.producto_id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 border-t pt-4">
                  {/* Payment method */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Método de Pago:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'efectivo', label: 'Efectivo', Icon: Banknote, active: 'border-green-500 bg-green-50 text-green-700' },
                        { value: 'tarjeta', label: 'Tarjeta', Icon: CreditCard, active: 'border-blue-500 bg-blue-50 text-blue-700' },
                      ].map(({ value, label, Icon, active }) => (
                        <button
                          key={value}
                          type="button"
                          className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                            metodoPago === value ? active : 'border-border hover:border-muted-foreground'
                          }`}
                          onClick={() => setMetodoPago(value)}
                        >
                          <Icon size={18} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(subtotal)}</span>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Descuento ($):</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={descuento}
                      onChange={e => {
                        const v = e.target.value;
                        if (v === "") {
                          setDescuento("");
                        } else {
                          const num = parseFloat(v);
                          if (num > subtotal) {
                            addToast('El descuento no puede superar el subtotal', 'warning');
                            setDescuento(subtotal);
                          } else {
                            setDescuento(num < 0 ? 0 : num);
                          }
                        }
                      }}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>TOTAL:</span>
                    <span className="text-primary">{formatCurrency(total)}</span>
                  </div>

                  {metodoPago === 'efectivo' && (
                    <div>
                      <label className="text-sm font-medium">
                        Monto Recibido: <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={`Mínimo ${formatCurrency(total)}`}
                        value={montoRecibido}
                        onChange={e => {
                          const v = e.target.value;
                          if (v === "") {
                            setMontoRecibido("");
                          } else {
                            setMontoRecibido(v);
                          }
                        }}
                        className={`mt-1 ${montoRecibido && Number(montoRecibido) < total ? 'border-red-400' : ''}`}
                      />
                    </div>
                  )}

                  {metodoPago === 'efectivo' && montoRecibido && Number(montoRecibido) >= total && (
                    <div className="flex justify-between font-bold bg-green-50 p-3 rounded-lg border-2 border-green-200">
                      <span className="text-green-700">Cambio:</span>
                      <span className="text-green-600 text-lg">{formatCurrency(cambio)}</span>
                    </div>
                  )}

                  {metodoPago === 'efectivo' && montoRecibido && Number(montoRecibido) < total && (
                    <div className="text-red-600 text-sm font-medium text-center bg-red-50 border border-red-200 p-2 rounded">
                      Faltan {formatCurrency(total - Number(montoRecibido))}
                    </div>
                  )}

                  <Button className="w-full" onClick={finalizarVenta} disabled={procesando}>
                    {procesando ? (
                      <><Loader2 size={16} className="mr-2 animate-spin" />Procesando...</>
                    ) : (
                      <><Printer size={16} className="mr-2" />Cobrar e Imprimir Ticket</>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
