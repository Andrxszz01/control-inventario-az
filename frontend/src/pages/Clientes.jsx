import { useEffect, useState } from "react";
import api from "../services/api";

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState({ nombre: "", telefono: "", direccion: "", email: "" });
  const [editing, setEditing] = useState(null);

  const fetchClientes = async () => {
    const { data } = await api.get("/clientes");
    setClientes(data);
  };

  useEffect(() => { fetchClientes(); }, []);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    if (editing) {
      await api.put(`/clientes/${editing}`, form);
    } else {
      await api.post("/clientes", form);
    }
    setForm({ nombre: "", telefono: "", direccion: "", email: "" });
    setEditing(null);
    fetchClientes();
  };

  const handleEdit = c => {
    setForm(c);
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
        <button type="submit">{editing ? "Actualizar" : "Agregar"}</button>
        {editing && <button type="button" onClick={() => { setEditing(null); setForm({ nombre: "", telefono: "", direccion: "", email: "" }); }}>Cancelar</button>}
      </form>
      <ul>
        {clientes.map(c => (
          <li key={c.id}>
            {c.nombre} ({c.telefono})
            <button onClick={() => handleEdit(c)}>Editar</button>
            <button onClick={() => handleDelete(c.id)}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
