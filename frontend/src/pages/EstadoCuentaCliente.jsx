import { useEffect, useState } from "react";
import api from "../services/api";

export default function EstadoCuentaCliente({ clienteId }) {
  const [ventas, setVentas] = useState([]);
  const [abono, setAbono] = useState("");
  const [ventaSel, setVentaSel] = useState(null);

  useEffect(() => {
    if (clienteId) {
      api.get(`/clientes/${clienteId}/estado-cuenta`).then(r => setVentas(r.data));
    }
  }, [clienteId]);

  const abonar = async (ventaId) => {
    if (!abono || isNaN(abono) || abono <= 0) return;
    await api.post(`/clientes/ventas/${ventaId}/abono`, { monto: parseFloat(abono) });
    setAbono("");
    setVentaSel(null);
    api.get(`/clientes/${clienteId}/estado-cuenta`).then(r => setVentas(r.data));
  };

  return (
    <div>
      <h3>Estado de cuenta</h3>
      <ul>
        {ventas.map(v => (
          <li key={v.id}>
            Venta #{v.id} - Total: ${v.total} - Saldo: ${v.saldo}
            <ul>
              {v.abonos.map(a => <li key={a.id}>Abono: ${a.monto} ({a.fecha})</li>)}
            </ul>
            {v.saldo > 0 && (
              <div>
                <input type="number" value={ventaSel === v.id ? abono : ""} onChange={e => { setVentaSel(v.id); setAbono(e.target.value); }} placeholder="Abonar" />
                <button onClick={() => abonar(v.id)}>Abonar</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
