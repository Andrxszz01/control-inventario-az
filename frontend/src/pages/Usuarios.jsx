import React, { useState, useEffect } from 'react';
import { authService } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { Users as UsersIcon, Edit2, X, Save, Shield, User, Search, Loader2, Trash2 } from 'lucide-react';

export default function Usuarios() {
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await authService.getUsers();
      setUsers(res.data.users ?? []);
    } catch {
      addToast('Error al cargar usuarios', 'error');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (user) => {
    setEditingUser(user.id);
    setEditForm({
      username: user.username,
      telefono: user.telefono || '',
      rol: user.rol,
      activo: user.activo,
      password: '',
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditForm({});
  };

  const saveEdit = async () => {
    setSubmitting(true);
    try {
      const data = { ...editForm };
      if (!data.password) delete data.password;
      await authService.updateUser(editingUser, data);
      addToast('Usuario actualizado correctamente', 'success');
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      addToast(err.response?.data?.error || 'Error al actualizar', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (user) => {
    try {
      await authService.updateUser(user.id, { activo: user.activo ? 0 : 1 });
      addToast(`Usuario ${user.activo ? 'desactivado' : 'activado'}`, 'success');
      loadUsers();
    } catch (err) {
      addToast(err.response?.data?.error || 'Error al actualizar', 'error');
    }
  };

  const deleteUser = async (user) => {
    const confirmed = window.confirm(`¿Eliminar usuario ${user.username}? Esta accion es permanente.`);
    if (!confirmed) return;

    try {
      await authService.deleteUser(user.id);
      addToast('Usuario eliminado correctamente', 'success');
      loadUsers();
    } catch (err) {
      addToast(err.response?.data?.error || 'Error al eliminar usuario', 'error');
    }
  };

  const resetStore = async () => {
    const firstConfirm = window.confirm(
      'Esto borrara TODAS las ventas, gastos, caja y dejara el inventario en 0. Esta accion no se puede deshacer.\n\n¿Deseas continuar?'
    );
    if (!firstConfirm) return;

    const confirmationText = window.prompt('Escribe RESETEAR para confirmar:');
    if (confirmationText !== 'RESETEAR') {
      addToast('Operacion cancelada. Texto de confirmacion incorrecto.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      await authService.resetStore();
      addToast('Tienda reseteada correctamente', 'success');
      setTimeout(() => {
        window.location.hash = '/dashboard';
        window.location.reload();
      }, 300);
    } catch (err) {
      addToast(err.response?.data?.error || 'Error al resetear la tienda', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    (u.telefono || '').includes(search) ||
    u.rol.toLowerCase().includes(search.toLowerCase())
  );

  const totalUsers = users.length;
  const totalAdmin = users.filter(u => u.rol === 'administrador').length;
  const totalEmpleados = users.filter(u => u.rol === 'empleado').length;
  const totalActivos = users.filter(u => u.activo).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <UsersIcon size={20} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Usuarios</p>
              <p className="text-2xl font-bold">{totalUsers}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
              <Shield size={20} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Administradores</p>
              <p className="text-2xl font-bold">{totalAdmin}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
              <User size={20} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Empleados</p>
              <p className="text-2xl font-bold">{totalEmpleados}</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
              <UsersIcon size={20} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Activos</p>
              <p className="text-2xl font-bold">{totalActivos}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold flex-1">Gestión de Usuarios</h2>
          <button
            onClick={resetStore}
            disabled={submitting}
            className="h-9 px-3 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
            title="Resetear tienda"
          >
            Reset tienda
          </button>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por usuario, teléfono o rol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 size={20} className="animate-spin mr-2" /> Cargando usuarios...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Usuario</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Teléfono</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Rol</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left py-3 px-3 font-medium text-muted-foreground">Registro</th>
                  <th className="text-right py-3 px-3 font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border/50 hover:bg-accent/50">
                    {editingUser === user.id ? (
                      <>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={editForm.username}
                            onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                            className="w-full h-8 px-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="tel"
                            value={editForm.telefono}
                            onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
                            className="w-full h-8 px-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={editForm.rol}
                            onChange={(e) => setEditForm({ ...editForm, rol: e.target.value })}
                            className="w-full h-8 px-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                          >
                            <option value="empleado">Empleado</option>
                            <option value="administrador">Administrador</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="password"
                            value={editForm.password}
                            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                            placeholder="Nueva contraseña (opcional)"
                            className="w-full h-8 px-2 bg-background border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                          />
                        </td>
                        <td className="py-2 px-3"></td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={saveEdit} disabled={submitting} className="p-1.5 text-green-600 hover:bg-green-50 rounded disabled:opacity-50" title="Guardar">
                              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            </button>
                            <button onClick={cancelEdit} disabled={submitting} className="p-1.5 text-gray-500 hover:bg-gray-50 rounded disabled:opacity-50" title="Cancelar">
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-semibold">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{user.username}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground">
                          {user.telefono || '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.rol === 'administrador'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {user.rol === 'administrador' ? <Shield size={12} /> : <User size={12} />}
                            {user.rol === 'administrador' ? 'Admin' : 'Empleado'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <button
                            onClick={() => toggleActive(user)}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                              user.activo
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            {user.activo ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground text-xs">
                          {new Date(user.fecha_creacion).toLocaleDateString('es-MX')}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEdit(user)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => deleteUser(user)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-muted-foreground">
                      No se encontraron usuarios
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
