// src/pages/DashboardAdmin.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

import { Card, Row, Col, Button, Badge, Spinner, Form, Table } from "react-bootstrap";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend, Filler);

// ---- Umbrales (ajústalos a tu gusto) ----
const UMBRAL = {
  VOLTAJE_ALTO: 15,   // V
  BATERIA_BAJA: 20,   // %
  CONSUMO_ALTO: 80,   // W
};


// ---- Utilidades (formato) ----
const fmt = (n, dec = 2, suf = "") =>
  Number.isFinite(Number(n)) ? `${Number(n).toFixed(dec)}${suf}` : "—";

export default function DashboardAdmin() {
  const navigate = useNavigate();

  // ---- Guard de rol (solo admin) ----
  useEffect(() => {
    const token = localStorage.getItem("token");
    const rol = (localStorage.getItem("rol") || "").toLowerCase();
    if (!token) return navigate("/", { replace: true });
    if (rol !== "administrador") return navigate("/usuario", { replace: true });
  }, [navigate]);

  // ---- Estado ----
  // Eliminado: estado y lógica de datos demo
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [lecturas, setLecturas] = useState([]); // serie para gráfico (ASC)
  const [alertas, setAlertas] = useState([]);   // últimas alertas

  // NUEVO: usuarios con info de eólico
  const [usuariosEolicos, setUsuariosEolicos] = useState([]);
  const [cargandoEolicos, setCargandoEolicos] = useState(true);

  const lineRef = useRef(null);

  // ---- Carga de datos ----
  const cargar = useCallback(async () => {
    setError("");
    setCargando(true);
    setCargandoEolicos(true);
    try {
      // Solo datos reales
      const [r1, r2, r3] = await Promise.all([
        api.get("/resumen"),
        api.get("/alertas"),
        api.get("/usuarios"), // ← trae eolico_codigo y eolico_habilitado (ver backend)
      ]);

      const serie = (Array.isArray(r1.data) ? r1.data : []).slice().sort(
        (a, b) => new Date(a.fecha_lectura) - new Date(b.fecha_lectura)
      );
      setLecturas(serie);
      setAlertas(Array.isArray(r2.data) ? r2.data : []);
      setUsuariosEolicos(Array.isArray(r3.data) ? r3.data : []);
    } catch (e) {
      if (e?.response?.status === 401) {
        localStorage.clear();
        navigate("/", { replace: true });
        return;
      }
      console.error(e);
      setError("Error al cargar datos del backend.");
      setLecturas([]);
      setAlertas([]);
      setUsuariosEolicos([]);
    } finally {
      setCargando(false);
      setCargandoEolicos(false);
    }
  }, [navigate]);

  useEffect(() => {
    cargar();
    // Auto-refresco solo para datos reales cada 30s
    const ms = 30000;
    const id = setInterval(() => {
      cargar();
    }, ms);
    return () => clearInterval(id);
  }, [cargar]);

  // ---- Derivados ----
  const ultima = lecturas.length ? lecturas[lecturas.length - 1] : null;
  const ultimaFecha = ultima?.fecha_lectura
    ? new Date(ultima.fecha_lectura).toLocaleString()
    : "—";


  // Filtro y conteo de alertas
  const [filtroAlerta, setFiltroAlerta] = useState("todas");
  const voltajeAltoCount = lecturas.filter((d) => Number(d.voltaje) > UMBRAL.VOLTAJE_ALTO).length;
  const bateriaBajaCount = lecturas.filter((d) => Number(d.bateria) < UMBRAL.BATERIA_BAJA).length;
  const consumoAltoCount = lecturas.filter((d) => Number(d.consumo) > UMBRAL.CONSUMO_ALTO).length;
  const hayAlerta =
    (filtroAlerta === "todas" && (voltajeAltoCount > 0 || bateriaBajaCount > 0 || consumoAltoCount > 0)) ||
    (filtroAlerta === "voltaje" && voltajeAltoCount > 0) ||
    (filtroAlerta === "bateria" && bateriaBajaCount > 0) ||
    (filtroAlerta === "consumo" && consumoAltoCount > 0);

  const labels = useMemo(
    () =>
      lecturas.map((d) =>
        d?.fecha_lectura
          ? new Date(d.fecha_lectura).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : ""
      ),
    [lecturas]
  );

  const lineData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Voltaje (V)",
          data: lecturas.map((d) => Number(d.voltaje) || 0),
          borderColor: "#28a745",
          backgroundColor: "rgba(40,167,69,0.18)",
          fill: true,
          tension: 0.35,
          pointRadius: 2,
        },
        {
          label: "Batería (%)",
          data: lecturas.map((d) => Number(d.bateria) || 0),
          borderColor: "#007bff",
          backgroundColor: "rgba(0,123,255,0.16)",
          fill: true,
          tension: 0.35,
          pointRadius: 2,
        },
        {
          label: "Consumo (W)",
          data: lecturas.map((d) => Number(d.consumo) || 0),
          borderColor: "#fd7e14",
          backgroundColor: "rgba(253,126,20,0.16)",
          fill: true,
          tension: 0.35,
          pointRadius: 2,
        },
      ],
    }),
    [labels, lecturas]
  );

  const opcionesGrafico = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom" },
        tooltip: { mode: "index", intersect: false },
        title: { display: true, text: "Tendencias globales (últimas lecturas)" },
    },
      interaction: { mode: "nearest", intersect: false },
  animation: { duration: 300, easing: "easeOutQuart" },
      scales: {
        y: { beginAtZero: false },
        x: { ticks: { maxRotation: 0, autoSkip: true } },
      },
    }),
  []
  );

  // ---- KPIs EÓLICOS (derivados de usuariosEolicos) ----
  const kpisEol = useMemo(() => {
    const totalUsuarios = usuariosEolicos.length;
    const asignados = usuariosEolicos.filter((u) => !!u.eolico_codigo);
    const totalAsignados = asignados.length;
    const activados = asignados.filter((u) => Number(u.eolico_habilitado) === 1).length;
    const desactivados = totalAsignados - activados;
    return {
      totalUsuarios,
      totalAsignados,
      activados,
      desactivados,
    };
  }, [usuariosEolicos]);

  // Orden para tabla de resumen eólico (solo algunos)
  const topUsuariosEolicos = useMemo(() => {
    // primero los que tienen código
    const arr = [...usuariosEolicos].sort((a, b) => {
      const ax = a.eolico_codigo ? 0 : 1;
      const bx = b.eolico_codigo ? 0 : 1;
      if (ax !== bx) return ax - bx;
      // los activados primero
      return (b.eolico_habilitado || 0) - (a.eolico_habilitado || 0);
    });
    return arr.slice(0, 8);
  }, [usuariosEolicos]);

  return (
  <div className="container-fluid py-4" style={{ maxWidth: 1400, margin: "0 auto" }}>

      {/* Encabezado */}
      <div
        className="rounded-4 p-4 mb-4 shadow-sm bg-white"
        style={{
          background: "linear-gradient(90deg, #e3f2fd 0%, #e9fbe5 100%)",
          border: "1px solid #e0e0e0",
          boxShadow: "0 4px 24px rgba(33,150,243,0.08)",
        }}
      >
        <div className="row align-items-center g-3">
          <div className="col-12 col-md-7 d-flex align-items-center gap-3">
            <img src="/logo-azul.svg" alt="Logo" style={{ width: 56, height: 56, borderRadius: 16, boxShadow: "0 2px 8px #b3e5fc" }} />
            <div>
              <h2 className="mb-1 fw-bold" style={{ color: "#1976d2", fontSize: 32 }}>Panel Administrador</h2>
              <div className="text-muted" style={{ fontSize: 20 }}>Visión global del sistema eólico</div>
            </div>
          </div>
          <div className="col-12 col-md-5 d-flex justify-content-md-end align-items-center gap-3 mt-3 mt-md-0">
            <Button variant="primary" onClick={cargar} disabled={cargando || cargandoEolicos} style={{ fontWeight: 500, fontSize: 18, padding: "10px 28px" }}>
              {(cargando || cargandoEolicos) ? "Cargando…" : "Actualizar ahora"}
            </Button>
          </div>
        </div>
      </div>

  {error && <div className="alert alert-danger rounded-3 shadow-sm mb-3" style={{ fontSize: 18 }}>{error}</div>}


      {/* Estado del sistema con detalles y filtro */}
      <div
        className={`mb-4 p-3 border rounded-4 shadow-sm ${hayAlerta ? "bg-danger text-white" : "bg-success text-white"}`}
        style={{ fontSize: 18, border: hayAlerta ? "2px solid #d32f2f" : "2px solid #388e3c", boxShadow: hayAlerta ? "0 2px 12px #d32f2f33" : "0 2px 12px #388e3c33" }}
      >
        <div className="row align-items-center g-3">
          <div className="col-12 col-md-8">
            <strong style={{ fontSize: 22 }}>
              {hayAlerta ? "🚨 Sistema en alerta" : "✅ Sistema estable"}
            </strong>
            {/* Detalles de alerta */}
            {hayAlerta && (
              <ul className="mb-0 mt-2" style={{ listStyle: "none", paddingLeft: 0, fontSize: 17 }}>
                {(filtroAlerta === "todas" || filtroAlerta === "voltaje") && voltajeAltoCount > 0 && (
                  <li>🔌 Voltaje alto: <b>{voltajeAltoCount}</b> registro(s) fuera de rango</li>
                )}
                {(filtroAlerta === "todas" || filtroAlerta === "bateria") && bateriaBajaCount > 0 && (
                  <li>🔋 Batería baja: <b>{bateriaBajaCount}</b> registro(s) fuera de rango</li>
                )}
                {(filtroAlerta === "todas" || filtroAlerta === "consumo") && consumoAltoCount > 0 && (
                  <li>⚡ Consumo alto: <b>{consumoAltoCount}</b> registro(s) fuera de rango</li>
                )}
              </ul>
            )}
          </div>
          <div className="col-12 col-md-4 d-flex flex-column flex-md-row align-items-md-center gap-2 mt-3 mt-md-0 justify-content-md-end">
            <Form.Select
              size="sm"
              value={filtroAlerta}
              onChange={e => setFiltroAlerta(e.target.value)}
              style={{ minWidth: 170, fontSize: 16, fontWeight: 500 }}
            >
              <option value="todas">Todas las alertas</option>
              <option value="voltaje">Solo voltaje</option>
              <option value="bateria">Solo batería</option>
              <option value="consumo">Solo consumo</option>
            </Form.Select>
            <Button
              variant={hayAlerta ? "light" : "outline-primary"}
              size="sm"
              onClick={() => window.location.href = '/alertas'}
              style={{ fontWeight: 500, fontSize: 16 }}
            >
              Ver en alertas
            </Button>
            <small style={{ fontSize: 16 }}>Última actualización: {ultimaFecha}</small>
          </div>
        </div>
      </div>



      {/* === NUEVO BLOQUE: Estado de sistemas eólicos === */}
  <Card className="shadow-sm border-0 mb-4 bg-white" style={{ borderRadius: 18, boxShadow: "0 2px 16px #1976d233" }}>
        <Card.Body>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h5 className="mb-0 fw-bold" style={{ color: "#1976d2" }}>Sistemas eólicos — estado general</h5>
            {cargandoEolicos && <span className="text-muted small">Cargando…</span>}
          </div>

          {/* KPIs eólicos */}
          <Row className="g-3">
            <Col xs={6} md={3}>
              <Card className="border-0 bg-light h-100" style={{ borderRadius: 14 }}>
                <Card.Body>
                  <div className="text-muted small">Usuarios totales</div>
                  <div className="fs-3 fw-bold">{kpisEol.totalUsuarios}</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={3}>
              <Card className="border-0 h-100" style={{ background: "rgba(108,117,125,.08)", borderRadius: 14 }}>
                <Card.Body>
                  <div className="text-muted small">Con eólico asignado</div>
                  <div className="fs-3 fw-bold">{kpisEol.totalAsignados}</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={3}>
              <Card className="border-0 h-100" style={{ background: "rgba(40,167,69,.08)", borderRadius: 14 }}>
                <Card.Body>
                  <div className="text-muted small">Activados</div>
                  <div className="fs-3 fw-bold text-success">{kpisEol.activados}</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} md={3}>
              <Card className="border-0 h-100" style={{ background: "rgba(220,53,69,.08)", borderRadius: 14 }}>
                <Card.Body>
                  <div className="text-muted small">Desactivados</div>
                  <div className="fs-3 fw-bold text-danger">{kpisEol.desactivados}</div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Tabla breve */}
          <div className="mt-4">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <strong>Resumen rápido (8)</strong>
              <Button
                size="sm"
                variant="outline-primary"
                onClick={() => navigate("/alquiler")}
              >
                Gestionar alquiler / activación
              </Button>
            </div>
            {topUsuariosEolicos.length === 0 ? (
              <p className="text-muted m-0">Sin datos para mostrar.</p>
            ) : (
              <div className="table-responsive">
                <Table bordered hover size="sm" className="align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Usuario</th>
                      <th>Nombre</th>
                      <th>Código eólico</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUsuariosEolicos.map((u, idx) => (
                      <tr key={u.id_usuario}>
                        <td>{idx + 1}</td>
                        <td>{u.usuario}</td>
                        <td>{[u.nombres, u.primer_apellido].filter(Boolean).join(" ") || "—"}</td>
                        <td>{u.eolico_codigo || <span className="text-muted">No asignado</span>}</td>
                        <td>
                          {u.eolico_codigo ? (
                            <Badge bg={u.eolico_habilitado ? "success" : "danger"}>
                              {u.eolico_habilitado ? "Activado" : "Desactivado"}
                            </Badge>
                          ) : (
                            <Badge bg="secondary">No asignado</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </div>
        </Card.Body>
      </Card>
      {/* === FIN BLOQUE NUEVO === */}

      {/* Gráfico principal */}
  <Card className="shadow-sm mb-4 border-0 bg-white" style={{ minHeight: 420, borderRadius: 18, boxShadow: "0 2px 16px #1976d233" }}>
        <Card.Body>
          {cargando ? (
            <div className="d-flex align-items-center justify-content-center" style={{ minHeight: 320 }}>
              <Spinner animation="border" variant="primary" style={{ width: 60, height: 60 }} />
            </div>
          ) : lecturas.length === 0 ? (
            <p className="text-center text-muted m-0" style={{ fontSize: 20 }}>No hay lecturas para mostrar.</p>
          ) : (
            <div style={{ height: 340 }}>
              <Line ref={lineRef} data={lineData} options={opcionesGrafico} />
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Alertas recientes */}
  <Card className="shadow-sm border-0 mb-4 bg-white" style={{ borderRadius: 18, boxShadow: "0 2px 16px #1976d233" }}>
        <Card.Body>
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h5 className="mb-0 fw-bold" style={{ color: "#d32f2f" }}>Últimas alertas</h5>
            <span className="text-muted small">
              {alertas.length ? `Mostrando ${Math.min(alertas.length, 8)} de ${alertas.length}` : "—"}
            </span>
          </div>
          {alertas.length === 0 ? (
            <p className="text-muted m-0">Sin alertas recientes.</p>
          ) : (
            <ul className="list-group">
              {alertas.slice(0, 8).map((a, i) => (
                <li key={i} className="list-group-item d-flex flex-column flex-md-row justify-content-between align-items-md-center" style={{ fontSize: 17 }}>
                  <div className="d-flex flex-column flex-md-row align-items-md-center gap-2">
                    <strong className="me-2" style={{ color: "#1976d2" }}>{a?.login || "usuario"}</strong>
                    <Badge bg="secondary" className="me-2">
                      {a?.rol || "usuario"}
                    </Badge>
                    <span className="text-muted">
                      • {a?.fecha_lectura ? new Date(a.fecha_lectura).toLocaleString() : "Sin fecha"}
                    </span>
                  </div>
                  <div className="small mt-2 mt-md-0">
                    <span className="me-2">🔌 {fmt(a?.voltaje, 2, " V")}</span>
                    <span className="me-2">🔋 {fmt(a?.bateria, 0, " %")}</span>
                    <span className="me-2">⚡ {fmt(a?.consumo, 1, " W")}</span>
                  </div>
                  <Badge bg="warning" text="dark" className="ms-md-3">Atención</Badge>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 d-flex flex-column flex-md-row gap-2">
            <Button variant="primary" size="lg" style={{ fontWeight: 500 }} onClick={() => navigate("/alertas")}>Ver todas las alertas</Button>
            <Button variant="success" size="lg" style={{ fontWeight: 500 }} onClick={() => navigate("/graficos")}>Ver gráficos detallados</Button>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
