// src/pages/MisDispositivos.js
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";

export default function MisDispositivos() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await api.get("/cliente/dispositivos");
        if (alive) setRows(Array.isArray(r.data) ? r.data : []);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, []);

  const vacio = !loading && rows.length === 0;

  return (
    <div className="container py-4">
      <h3 className="mb-3">Mis dispositivos (eólicos)</h3>

      {loading && <div className="alert alert-info">Cargando…</div>}
      {vacio && <div className="alert alert-warning">Aún no tienes dispositivos asignados.</div>}

      {!loading && rows.length > 0 && (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>ID</th>
                <th>Código</th>
                <th>Dueño</th>
                <th>Activo</th>
                <th>Habilitado</th>
                <th>Creado</th>
                <th style={{width:120}}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id_eolico}>
                  <td>{r.id_eolico}</td>
                  <td><code>{r.codigo}</code></td>
                  <td>{r.duenio || "—"}</td>
                  <td>
                    <span className={`badge ${r.activo ? "bg-success" : "bg-secondary"}`}>
                      {r.activo ? "Sí" : "No"}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${r.habilitado ? "bg-success" : "bg-danger"}`}>
                      {r.habilitado ? "Sí" : "No"}
                    </span>
                  </td>
                  <td>{new Date(r.fecha_creacion).toLocaleString()}</td>
                  <td className="text-end">
                    <Link to={`/mis-dispositivos/${r.codigo}`} className="btn btn-sm btn-primary">
                      Ver lecturas
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
