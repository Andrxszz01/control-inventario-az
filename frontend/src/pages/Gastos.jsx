import React, { useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';
import { gastosService } from '../services/api';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Plus, Trash, Loader2, X } from 'lucide-react';

const CATEGORIAS = ['Renta', 'Proveedores', 'Transporte', 'Servicios', 'Otros'];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const EMPTY_FORM = { descripcion: '', monto: '', categoria: '', fecha: todayStr() };

function isModalDirty(formData) {
  return !!(formData.descripcion || formData.monto || formData.categoria);
}

export default function Gastos() {
  const { addToast } = useToast();
  const [gastos, setGastos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Block navigation when form is open with data
  const isDirty = showModal && isModalDirty(formData);
  const blocker = useBlocker(isDirty);

  useEffect(() => { loadGastos(); }, []);

  const loadGastos = async () => {
    try {
      const response = await gastosService.getAll();
      setGastos(response.data.gastos ?? []);
    } catch {
      addToast('Error al cargar los gastos', 'error');
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.descripcion.trim()) errors.descripcion = 'La descripción es obligatoria';
    if (!formData.monto || Number(formData.monto) <= 0) errors.monto = 'Ingresa un monto válido mayor a 0';
    if (!formData.categoria) errors.categoria = 'Selecciona una categoría';
    if (!formData.fecha) errors.fecha = 'Selecciona una fecha';
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
      await gastosService.create(formData);
      addToast('Gasto registrado correctamente', 'success');
      loadGastos();
      closeModal();
    } catch (error) {
      addToast(error.response?.data?.error || 'Error al registrar el gasto', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    try {
      await gastosService.delete(deleteConfirm.id);
      addToast('Gasto eliminado', 'success');
      loadGastos();
    } catch (error) {
      addToast(error.response?.data?.error || 'Error al eliminar el gasto', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const openModal = () => {
    setFormData({ ...EMPTY_FORM, fecha: todayStr() });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setFormData({ ...EMPTY_FORM, fecha: todayStr() });
    setFormErrors({});
    setShowModal(false);
  };

  const fieldProps = (name) => ({
    value: formData[name],
    onChange: (e) => {
      setFormData((p) => ({ ...p, [name]: e.target.value }));
      if (formErrors[name]) setFormErrors((p) => ({ ...p, [name]: undefined }));
    },
  });

  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);

  return (
    <div className="space-y-6">
      {/* Unsaved-changes nav warning */}
      <ConfirmDialog
        isOpen={blocker.state === 'blocked'}
        title="¿Salir sin guardar?"
        message="Tienes datos ingresados en el formulario. Si sales ahora se perderán."
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
        confirmLabel="Salir de todos modos"
        cancelLabel="Quedarme aquí"
        danger
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Eliminar gasto"
        message={`¿Está seguro de eliminar "${deleteConfirm?.descripcion}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
        confirmLabel="Sí, eliminar"
        danger
      />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Control de Gastos</h2>
          <p className="text-muted-foreground mt-0.5">
            Total registrado: <span className="font-semibold text-red-600">{formatCurrency(totalGastos)}</span>
          </p>
        </div>
        <Button onClick={openModal}>
          <Plus size={20} className="mr-2" />
          Nuevo Gasto
        </Button>
      </div>

      {/* List */}
      {gastos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hay gastos registrados aún
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {gastos.map((gasto) => (
            <Card key={gasto.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{gasto.descripcion}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-muted-foreground">
                      <span className="bg-accent px-2 py-0.5 rounded text-xs font-medium">{gasto.categoria}</span>
                      <span>{formatDate(gasto.fecha)}</span>
                      <span>Por: {gasto.registrado_por}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-xl font-bold text-red-600">
                      -{formatCurrency(gasto.monto)}
                    </span>
                    <Button
                      size="sm" variant="ghost"
                      className="text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setDeleteConfirm({ id: gasto.id, descripcion: gasto.descripcion })}
                    >
                      <Trash size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Registrar Gasto</CardTitle>
              <Button size="sm" variant="ghost" onClick={closeModal} disabled={submitting}>
                <X size={18} />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Descripción */}
                <div>
                  <label className="text-sm font-medium">
                    Descripción <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Descripción del gasto"
                    className={`mt-1 ${formErrors.descripcion ? 'border-red-400' : ''}`}
                    {...fieldProps('descripcion')}
                  />
                  {formErrors.descripcion && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.descripcion}</p>
                  )}
                </div>

                {/* Monto */}
                <div>
                  <label className="text-sm font-medium">
                    Monto <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number" step="0.01" min="0.01" placeholder="0.00"
                    className={`mt-1 ${formErrors.monto ? 'border-red-400' : ''}`}
                    {...fieldProps('monto')}
                  />
                  {formErrors.monto && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.monto}</p>
                  )}
                </div>

                {/* Categoría */}
                <div>
                  <label className="text-sm font-medium">
                    Categoría <span className="text-red-500">*</span>
                  </label>
                  <select
                    className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                      formErrors.categoria ? 'border-red-400' : 'border-input'
                    }`}
                    value={formData.categoria}
                    onChange={(e) => {
                      setFormData((p) => ({ ...p, categoria: e.target.value }));
                      if (formErrors.categoria) setFormErrors((p) => ({ ...p, categoria: undefined }));
                    }}
                  >
                    <option value="">Seleccionar categoría</option>
                    {CATEGORIAS.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  {formErrors.categoria && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.categoria}</p>
                  )}
                </div>

                {/* Fecha */}
                <div>
                  <label className="text-sm font-medium">
                    Fecha <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    className={`mt-1 ${formErrors.fecha ? 'border-red-400' : ''}`}
                    {...fieldProps('fecha')}
                  />
                  {formErrors.fecha && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.fecha}</p>
                  )}
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" onClick={closeModal} disabled={submitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <><Loader2 size={16} className="mr-2 animate-spin" />Registrando...</>
                    ) : (
                      'Registrar Gasto'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
