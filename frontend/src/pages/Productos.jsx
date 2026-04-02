import React, { useEffect, useState, useCallback, useTransition, useRef } from 'react';
import { useBlocker } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../components/ui/Table';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import BarcodeScanner from '../components/ui/BarcodeScanner';
import { useToast } from '../contexts/ToastContext';
import { productosService, categoriasService } from '../services/api';
import { formatCurrency } from '../utils/helpers';
import { Plus, Search, Edit, Trash, QrCode, ImagePlus, X, Download, Loader2, ScanBarcode } from 'lucide-react';

const EMPTY_FORM = {
  nombre: '',
  categoria_id: '',
  tipo: 'producto',
  precio_compra: '',
  precio_venta: '',
  stock: '',
  stock_minimo: '5',
  descripcion: '',
  codigo_barras: '',
};

function isFormDirty(formData) {
  return !!(
    formData.nombre ||
    formData.categoria_id ||
    formData.precio_compra ||
    formData.precio_venta ||
    formData.stock
  );
}

export default function Productos() {
  const { addToast } = useToast();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(null);
  const [qrImage, setQrImage] = useState('');
  const [qrCodigo, setQrCodigo] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanTarget, setScanTarget] = useState('search'); // 'search' | 'form'
  const [scannerGunMode, setScannerGunMode] = useState(true);
  const [, startTransition] = useTransition();
  const gunBufferRef = useRef('');
  const lastKeyTsRef = useRef(0);

  // Block navigation when modal is open and user has typed something
  const isDirty = showModal && isFormDirty(formData);
  const blocker = useBlocker(isDirty);

  const loadProductos = useCallback(async (search, tipo) => {
    try {
      const params = { busqueda: search };
      if (tipo && tipo !== 'todos') params.tipo = tipo;
      const response = await productosService.getAll(params);
      startTransition(() => {
        setProductos(response.data.productos ?? []);
      });
    } catch {
      addToast('Error al cargar los productos', 'error');
    }
  }, [addToast]);

  useEffect(() => {
    loadProductos('', filtroTipo);
    loadCategorias();
  }, [loadProductos, filtroTipo]);

  useEffect(() => {
    const timer = setTimeout(() => loadProductos(busqueda, filtroTipo), 300);
    return () => clearTimeout(timer);
  }, [busqueda, filtroTipo, loadProductos]);

  useEffect(() => {
    if (!scannerGunMode) return;

    const onKeyDown = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      const isTypingField = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable;
      if (isTypingField) return;

      const now = Date.now();
      if (now - lastKeyTsRef.current > 120) gunBufferRef.current = '';
      lastKeyTsRef.current = now;

      if (e.key === 'Enter') {
        const code = gunBufferRef.current.trim();
        gunBufferRef.current = '';
        if (code.length >= 4) {
          setBusqueda(code);
          addToast(`Código escaneado: ${code}`, 'success');
        }
        return;
      }

      if (e.key.length === 1) gunBufferRef.current += e.key;
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [scannerGunMode, addToast]);

  const loadCategorias = async () => {
    try {
      const response = await categoriasService.getAll();
      setCategorias(response.data.categorias ?? []);
    } catch {
      addToast('Error al cargar categorías', 'error');
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    if (!formData.categoria_id) errors.categoria_id = 'Selecciona una categoría';
    if (!formData.tipo) errors.tipo = 'Selecciona un tipo';
    if (formData.precio_compra === '' || Number(formData.precio_compra) < 0)
      errors.precio_compra = 'Ingresa un precio de compra válido';
    if (formData.precio_venta === '' || Number(formData.precio_venta) < 0)
      errors.precio_venta = 'Ingresa un precio de venta válido';
    if (
      !errors.precio_venta &&
      !errors.precio_compra &&
      Number(formData.precio_venta) < Number(formData.precio_compra)
    )
      errors.precio_venta = 'El precio de venta no puede ser menor al de compra';
    if (formData.tipo !== 'servicio' && (formData.stock === '' || Number(formData.stock) < 0))
      errors.stock = 'Ingresa un stock válido (mínimo 0)';
    if (formData.tipo !== 'servicio' && (formData.stock_minimo === '' || Number(formData.stock_minimo) < 0))
      errors.stock_minimo = 'Ingresa un stock mínimo válido';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      addToast('Corrige los campos marcados antes de continuar', 'warning');
      return;
    }
    setFormErrors({});
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        stock: formData.tipo === 'servicio' ? 0 : formData.stock,
        stock_minimo: formData.tipo === 'servicio' ? 0 : formData.stock_minimo,
      };

      if (editingId) {
        await productosService.update(editingId, payload);
        addToast('Producto actualizado correctamente', 'success');
      } else {
        await productosService.create(payload);
        addToast('Producto creado correctamente', 'success');
      }
      loadProductos(busqueda, filtroTipo);
      resetForm();
    } catch (error) {
      addToast(error.response?.data?.error || 'Error al guardar el producto', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await productosService.delete(deleteConfirm.id);
      addToast(`Producto "${deleteConfirm.nombre}" eliminado`, 'success');
      loadProductos(busqueda, filtroTipo);
    } catch (error) {
      addToast(error.response?.data?.error || 'Error al eliminar el producto', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleEdit = (producto) => {
    setFormData({
      nombre: producto.nombre,
      categoria_id: producto.categoria_id,
      tipo: producto.tipo || 'producto',
      precio_compra: producto.precio_compra,
      precio_venta: producto.precio_venta,
      stock: producto.stock,
      stock_minimo: producto.stock_minimo,
      descripcion: producto.descripcion || '',
      codigo_barras: producto.codigo_barras || '',
    });
    setFormErrors({});
    setEditingId(producto.id);
    setShowModal(true);
  };

  const handleShowQR = async (producto) => {
    try {
      const response = await productosService.generateQR(producto.id);
      setQrImage(response.data.qrImage);
      setQrCodigo(response.data.codigo_qr);
      setShowQrModal(producto);
    } catch {
      addToast('Error al generar el código QR', 'error');
    }
  };

  const handleDownloadQR = () => {
    if (!qrImage) return;
    const link = document.createElement('a');
    link.download = `QR-${showQrModal.nombre}.png`;
    link.href = qrImage;
    link.click();
  };

  const handleImageUpload = async (productoId, file) => {
    if (file.size > 5 * 1024 * 1024) {
      addToast('La imagen no puede superar los 5 MB', 'warning');
      return;
    }
    try {
      await productosService.uploadImage(productoId, file);
      addToast('Imagen actualizada correctamente', 'success');
      loadProductos(busqueda, filtroTipo);
    } catch {
      addToast('Error al subir la imagen', 'error');
    }
  };

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setEditingId(null);
    setShowModal(false);
  };

  const handleBarcodeScan = (code) => {
    setShowScanner(false);
    if (scanTarget === 'form') {
      setFormData((p) => ({ ...p, codigo_barras: code }));
      addToast(`Código "${code}" capturado`, 'success');
    } else {
      setBusqueda(code);
    }
  };

  const fieldProps = (name) => ({
    value: formData[name],
    onChange: (e) => {
      setFormData((p) => ({ ...p, [name]: e.target.value }));
      if (formErrors[name]) setFormErrors((p) => ({ ...p, [name]: undefined }));
    },
  });

  return (
    <div className="space-y-6">
      {/* Unsaved-changes navigation warning */}
      <ConfirmDialog
        isOpen={blocker.state === 'blocked'}
        title="¿Salir sin guardar?"
        message="Tienes cambios sin guardar en el formulario. Si sales ahora perderás la información ingresada."
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
        confirmLabel="Salir de todos modos"
        cancelLabel="Quedarme aquí"
        danger
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Eliminar producto"
        message={`¿Está seguro de eliminar "${deleteConfirm?.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
        confirmLabel="Sí, eliminar"
        danger
      />

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScan}
      />

      {/* Toolbar */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={20} />
            <Input
              placeholder="Buscar productos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => { setScanTarget('search'); setShowScanner(true); }}
            title="Escanear código de barras"
          >
            <ScanBarcode size={20} />
          </Button>
          <Button
            variant={scannerGunMode ? 'default' : 'outline'}
            onClick={() => setScannerGunMode((s) => !s)}
            title="Modo escáner pistola (USB/Bluetooth HID)"
          >
            Pistola {scannerGunMode ? 'ON' : 'OFF'}
          </Button>
        </div>
        <Button
          onClick={() => {
            setFormData(EMPTY_FORM);
            setFormErrors({});
            setEditingId(null);
            setShowModal(true);
          }}
        >
          <Plus size={20} className="mr-2" />
          Nuevo Producto
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant={filtroTipo === 'todos' ? 'default' : 'outline'} onClick={() => setFiltroTipo('todos')}>
          Todos
        </Button>
        <Button variant={filtroTipo === 'producto' ? 'default' : 'outline'} onClick={() => setFiltroTipo('producto')}>
          Productos de venta
        </Button>
        <Button variant={filtroTipo === 'insumo' ? 'default' : 'outline'} onClick={() => setFiltroTipo('insumo')}>
          Insumos
        </Button>
        <Button variant={filtroTipo === 'servicio' ? 'default' : 'outline'} onClick={() => setFiltroTipo('servicio')}>
          Servicios
        </Button>
      </div>

      {/* Products table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imagen</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Cód. Barras</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>P. Compra</TableHead>
                <TableHead>P. Venta</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                    No se encontraron productos
                  </TableCell>
                </TableRow>
              ) : (
                productos.map((producto) => (
                  <TableRow key={producto.id}>
                    <TableCell>
                      <div className="w-12 h-12 rounded border overflow-hidden bg-gray-100 flex items-center justify-center">
                        {producto.imagen ? (
                          <img
                            src={productosService.getImageUrl(producto.imagen)}
                            alt={producto.nombre}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImagePlus size={18} className="text-gray-400" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{producto.codigo_qr}</TableCell>
                    <TableCell className="font-mono text-xs">{producto.codigo_barras || '—'}</TableCell>
                    <TableCell className="font-medium">{producto.nombre}</TableCell>
                    <TableCell className="capitalize">{producto.tipo || 'producto'}</TableCell>
                    <TableCell>{producto.categoria_nombre}</TableCell>
                    <TableCell>{formatCurrency(producto.precio_compra)}</TableCell>
                    <TableCell>{formatCurrency(producto.precio_venta)}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded text-sm font-medium ${
                          producto.tipo === 'servicio'
                            ? 'bg-blue-100 text-blue-800'
                            : producto.stock <= producto.stock_minimo
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {producto.tipo === 'servicio' ? 'N/A' : producto.stock}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleShowQR(producto)} title="Ver QR">
                          <QrCode size={16} />
                        </Button>
                        <label
                          title="Subir imagen"
                          className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 w-9 hover:bg-accent hover:text-accent-foreground cursor-pointer"
                        >
                          <ImagePlus size={16} />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files[0]) handleImageUpload(producto.id, e.target.files[0]);
                              e.target.value = '';
                            }}
                          />
                        </label>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(producto)} title="Editar">
                          <Edit size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteConfirm({ id: producto.id, nombre: producto.nombre })}
                          title="Eliminar"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Nuevo / Editar Producto */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{editingId ? 'Editar Producto' : 'Nuevo Producto'}</CardTitle>
              <Button size="sm" variant="ghost" onClick={resetForm} disabled={submitting}>
                <X size={18} />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="grid grid-cols-2 gap-4">
                  {/* Nombre - full width */}
                  <div className="col-span-2">
                    <label className="text-sm font-medium">
                      Nombre <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Nombre del producto"
                      className={formErrors.nombre ? 'border-red-400 focus:ring-red-400' : ''}
                      {...fieldProps('nombre')}
                    />
                    {formErrors.nombre && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.nombre}</p>
                    )}
                  </div>

                  {/* Código de Barras */}
                  <div className="col-span-2">
                    <label className="text-sm font-medium">Código de Barras</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="EAN-13, UPC-A, etc. (opcional)"
                        {...fieldProps('codigo_barras')}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setScanTarget('form'); setShowScanner(true); }}
                        title="Escanear código de barras"
                      >
                        <ScanBarcode size={18} />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Escanea o escribe el código de barras del producto comercial
                    </p>
                  </div>

                  {/* Categoría */}
                  <div>
                    <label className="text-sm font-medium">
                      Categoría <span className="text-red-500">*</span>
                    </label>
                    <select
                      className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                        formErrors.categoria_id ? 'border-red-400' : 'border-input'
                      }`}
                      value={formData.categoria_id}
                      onChange={(e) => {
                        setFormData((p) => ({ ...p, categoria_id: e.target.value }));
                        if (formErrors.categoria_id)
                          setFormErrors((p) => ({ ...p, categoria_id: undefined }));
                      }}
                    >
                      <option value="">Seleccionar categoría</option>
                      {categorias.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.nombre}
                        </option>
                      ))}
                    </select>
                    {formErrors.categoria_id && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.categoria_id}</p>
                    )}
                  </div>

                  {/* Tipo */}
                  <div>
                    <label className="text-sm font-medium">
                      Tipo <span className="text-red-500">*</span>
                    </label>
                    <select
                      className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                        formErrors.tipo ? 'border-red-400' : 'border-input'
                      }`}
                      value={formData.tipo}
                      onChange={(e) => {
                        const tipo = e.target.value;
                        setFormData((p) => ({
                          ...p,
                          tipo,
                          stock: tipo === 'servicio' ? '0' : p.stock,
                          stock_minimo: tipo === 'servicio' ? '0' : p.stock_minimo,
                        }));
                        if (formErrors.tipo) setFormErrors((p) => ({ ...p, tipo: undefined }));
                      }}
                    >
                      <option value="producto">Producto de venta</option>
                      <option value="insumo">Insumo</option>
                      <option value="servicio">Servicio</option>
                    </select>
                    {formErrors.tipo && <p className="text-xs text-red-500 mt-1">{formErrors.tipo}</p>}
                  </div>

                  {/* Precio Compra */}
                  <div>
                    <label className="text-sm font-medium">
                      Precio Compra <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className={formErrors.precio_compra ? 'border-red-400' : ''}
                      {...fieldProps('precio_compra')}
                    />
                    {formErrors.precio_compra && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.precio_compra}</p>
                    )}
                  </div>

                  {/* Precio Venta */}
                  <div>
                    <label className="text-sm font-medium">
                      Precio Venta <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className={formErrors.precio_venta ? 'border-red-400' : ''}
                      {...fieldProps('precio_venta')}
                    />
                    {formErrors.precio_venta && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.precio_venta}</p>
                    )}
                  </div>

                  {/* Stock */}
                  <div>
                    <label className="text-sm font-medium">
                      Stock Actual <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      className={formErrors.stock ? 'border-red-400' : ''}
                      disabled={formData.tipo === 'servicio'}
                      {...fieldProps('stock')}
                    />
                    {formErrors.stock && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.stock}</p>
                    )}
                  </div>

                  {/* Stock Mínimo */}
                  <div>
                    <label className="text-sm font-medium">
                      Stock Mínimo <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="5"
                      className={formErrors.stock_minimo ? 'border-red-400' : ''}
                      disabled={formData.tipo === 'servicio'}
                      {...fieldProps('stock_minimo')}
                    />
                    {formErrors.stock_minimo && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.stock_minimo}</p>
                    )}
                  </div>
                </div>

                {/* Descripción */}
                <div>
                  <label className="text-sm font-medium">Descripción</label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="Descripción opcional del producto"
                    value={formData.descripcion}
                    onChange={(e) => setFormData((p) => ({ ...p, descripcion: e.target.value }))}
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" onClick={resetForm} disabled={submitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        {editingId ? 'Actualizando...' : 'Creando...'}
                      </>
                    ) : (
                      editingId ? 'Actualizar' : 'Crear Producto'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal QR */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Código QR</CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowQrModal(null); setQrImage(''); }}
              >
                <X size={18} />
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <p className="font-semibold text-center">{showQrModal.nombre}</p>
              <p className="text-sm text-muted-foreground">{qrCodigo}</p>
              {qrImage && <img src={qrImage} alt="QR Code" className="w-48 h-48" />}
              <p className="text-lg font-bold text-primary">
                {formatCurrency(showQrModal.precio_venta)}
              </p>
              <Button onClick={handleDownloadQR} className="w-full">
                <Download size={16} className="mr-2" />
                Descargar QR
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
