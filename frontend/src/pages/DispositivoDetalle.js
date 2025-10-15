// src/pages/DispositivoDetalle.js
import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";

// (usamos chart.js como en tus dashboards)
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend, Filler
} from "chart.js";
ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend, Filler);

export default function DispositivoDetalle() {
  const { codigo } = useParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get(`/cliente/lecturas`, { params: { codigo, limit: 200 }});
        if (alive) setRows(Array.isArray(r.data) ? r.data : []);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, [codigo]);

  const datos = useMemo(() => {
    const xs = rows.slice().reverse();
    return {
      labels: xs.map(x => new Date(x.fecha_lectura).toLocaleTimeString()),
      datasets: [
        { label: "Voltaje (V)", data: xs.map(x => x.voltaje), tension: 0.4, fill: false },
        { label: "Batería (%)", data: xs.map(x => x.bateria), tension: 0.4, fill: true },
        { label: "Consumo (W)", data: xs.map(x => x.consumo), tension: 0.4, fill: false },
      ]
    };
  }, [rows]);

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Dispositivo <code>{codigo}</code></h3>
        <Link className="btn btn-outline-secondary" to="/mis-dispositivos">← Volver</Link>
      </div>

      {loading && <div className="alert alert-info">Cargando…</div>}

      {!loading && rows.length === 0 && (
        <div className="alert alert-warning">Sin lecturas recientes para este dispositivo.</div>
      )}

      {!loading && rows.length > 0 && (
        <>
          <div className="card mb-4">
            <div className="card-body">
              <Line data={datos} options={{
                responsive: true,
                plugins: { legend: { position: "top" }, title: { display: false } },
                scales: { x: { display: true } }
              }} />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha</th>
                  <th>Voltaje (V)</th>
                  <th>Batería (%)</th>
                  <th>Consumo (W)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id_lectura}>
                    <td>{r.id_lectura}</td>
                    <td>{new Date(r.fecha_lectura).toLocaleString()}</td>
                    <td>{Number(r.voltaje).toFixed(2)}</td>
                    <td>{Number(r.bateria).toFixed(1)}</td>
                    <td>{Number(r.consumo).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
