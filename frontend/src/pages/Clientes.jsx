import { useEffect, useState } from "react";
import api from "../services/api";

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
    email: "",
    tipo: "cliente",
    notas: "",
    alergias: "",
    observaciones: "",
    ultima_visita: "",
  });
  const [editing, setEditing] = useState(null);

  const fetchClientes = async () => {
    const { data } = await api.get("/clientes");
    setClientes(data);
  };

  useEffect(() => { fetchClientes(); }, []);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    const payload = {
      ...form,
      ultima_visita: form.ultima_visita || null,
    };
    if (editing) {
      await api.put(`/clientes/${editing}`, payload);
    } else {
      await api.post("/clientes", payload);
    }
    setForm({
      nombre: "",
      telefono: "",
      direccion: "",
      email: "",
      tipo: "cliente",
      notas: "",
      alergias: "",
      observaciones: "",
      ultima_visita: "",
    });
    setEditing(null);
    fetchClientes();
  };

  const handleEdit = c => {
    setForm({
      ...c,
      ultima_visita: c.ultima_visita ? String(c.ultima_visita).slice(0, 10) : "",
    });
    setEditing(c.id);
  };

  const handleDelete = async id => {
    if (window.confirm("¿Eliminar cliente?")) {
      await api.delete(`/clientes/${id}`);
      fetchClientes();
    }
  };

  return (
    <div>
      <h2>Clientes</h2>
      <form onSubmit={handleSubmit}>
        <input name="nombre" value={form.nombre} onChange={handleChange} required placeholder="Nombre" />
        <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Teléfono" />
        <input name="direccion" value={form.direccion} onChange={handleChange} placeholder="Dirección" />
        <input name="email" value={form.email} onChange={handleChange} placeholder="Email" />
        <select name="tipo" value={form.tipo} onChange={handleChange}>
          <option value="cliente">Cliente</option>
          <option value="paciente">Paciente (uñas/servicios)</option>
        </select>
        <input name="ultima_visita" type="date" value={form.ultima_visita || ""} onChange={handleChange} />
        <input name="alergias" value={form.alergias} onChange={handleChange} placeholder="Alergias (opcional)" />
        <input name="notas" value={form.notas} onChange={handleChange} placeholder="Notas (preferencias, tono, diseño...)" />
        <input name="observaciones" value={form.observaciones} onChange={handleChange} placeholder="Observaciones" />
        <button type="submit">{editing ? "Actualizar" : "Agregar"}</button>
        {editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setForm({
                nombre: "",
                telefono: "",
                direccion: "",
                email: "",
                tipo: "cliente",
                notas: "",
                alergias: "",
                observaciones: "",
                ultima_visita: "",
              });
            }}
          >
            Cancelar
          </button>
        )}
      </form>
      <ul>
        {clientes.map(c => (
          <li key={c.id}>
            {c.nombre} ({c.telefono}) - {c.tipo === 'paciente' ? 'Paciente' : 'Cliente'}
            <button onClick={() => handleEdit(c)}>Editar</button>
            <button onClick={() => handleDelete(c.id)}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
