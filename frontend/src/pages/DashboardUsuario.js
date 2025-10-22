// src/pages/DashboardUsuario.js
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useDevice } from "../context/DeviceContext";

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

import {
  Card,
  Modal,
  Button,
  Row,
  Col,
  Form,
  Badge,
  Alert,
} from "react-bootstrap";


// Importar CSS para diseño móvil profesional
import "../styles/dashboard-mobile.css";

ChartJS.register(
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

/* =========================
   Utilidades
========================= */

function generarAlertasDesdeLecturas(lecturas) {
  const UMBRAL_BATERIA = 20;
  const UMBRAL_VOLTAJE_BAJO = 10;
  return lecturas
    .filter(
      (d) => d.bateria < UMBRAL_BATERIA || d.voltaje < UMBRAL_VOLTAJE_BAJO
    )
    .slice(-5) // últimas 5
    .map((d) => ({
      ...d,
      mensaje:
        d.bateria < UMBRAL_BATERIA
          ? "Batería baja"
          : d.voltaje < UMBRAL_VOLTAJE_BAJO
          ? "Voltaje bajo"
          : "Alerta",
    }))
    .reverse();
}

const fmtNum = (n, dec = 0, suf = "") =>
  Number.isFinite(Number(n)) ? `${Number(n).toFixed(dec)}${suf}` : "—";

/* =========================
   Hook personalizado para detectar tamaño de pantalla
========================= */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}

/* =========================
   Componente principal
========================= */

export default function DashboardUsuario() {
  const navigate = useNavigate();
  const isMobile = useIsMobile(); // Hook para detectar móvil
  
  // ---- Ref para evitar auto-selección si ya hay dispositivo en Context ----
  const hasInitialized = useRef(false);

  // ---- Contexto global para dispositivos ----
  const { 
    dispositivoSeleccionado, 
    setDispositivoSeleccionado,
    dispositivos,
    setDispositivos 
  } = useDevice();

  // ---- Estado UI ----
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // ---- Cargando dispositivos ----
  const [cargandoDispositivos, setCargandoDispositivos] = useState(true);

  // ---- Datos ----
  const [lecturas, setLecturas] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [perfil, setPerfil] = useState(null); // { nombre_completo, email, telefono, direccion, ... }

  // ---- KPIs (último valor) ----
  const ultima = lecturas.length ? lecturas[lecturas.length - 1] : null;
  const penultima = lecturas.length > 1 ? lecturas[lecturas.length - 2] : null;

  const voltaje = ultima?.voltaje ?? null;
  const bateria = ultima?.bateria ?? null;
  const consumo = ultima?.consumo ?? null;

  const delta = (a, b) =>
    a == null || b == null ? null : Number(a) - Number(b);

  const dVolt = delta(voltaje, penultima?.voltaje);
  const dBat = delta(bateria, penultima?.bateria);
  const dCon = delta(consumo, penultima?.consumo);

  const arrow = (d) => (d == null ? "" : d > 0 ? "▲" : d < 0 ? "▼" : "■");

  // ---- Guard de sesión/rol + carga de perfil real y dispositivos ----
  useEffect(() => {
    const token = localStorage.getItem("token");
    const rol = (localStorage.getItem("rol") || "").toLowerCase();

    if (!token) {
      navigate("/", { replace: true });
      return;
    }
    if (rol === "administrador") {
      navigate("/admin", { replace: true });
      return;
    }
    if (rol !== "usuario") {
      navigate("/", { replace: true });
      return;
    }

    // Traemos el PERFIL REAL y DISPOSITIVOS del backend
    (async () => {
      try {
        // Cargar perfil
        const r = await api.get("/me-detalle");
        const p = r?.data || {};
        setPerfil({
          nombre_completo:
            p.nombre_completo ||
            [p.nombres, p.primer_apellido, p.segundo_apellido]
              .filter(Boolean)
              .join(" ")
              .trim() ||
            "Usuario",
          email: p.email || "",
          telefono: p.telefono || "",
          direccion: p.direccion || "",
        });

        // Cargar dispositivos asignados
        const dispRes = await api.get("/cliente/dispositivos");
        const disps = Array.isArray(dispRes.data) ? dispRes.data : [];
        setDispositivos(disps);
        
        // Seleccionar automáticamente el primer dispositivo SOLO si:
        // 1. Hay dispositivos disponibles
        // 2. No hay uno ya seleccionado en el Context (verificar localStorage directamente)
        // 3. Es la primera carga (no es re-entrada desde otra página)
        const currentSelection = localStorage.getItem('dispositivoSeleccionado');
        if (disps.length > 0 && !currentSelection && !hasInitialized.current) {
          setDispositivoSeleccionado(disps[0].codigo);
          hasInitialized.current = true;
        }
      } catch (e) {
        console.error("Error cargando perfil/dispositivos:", e);
        setPerfil({ nombre_completo: "Usuario", email: "", telefono: "", direccion: "" });
        setDispositivos([]);
      } finally {
        setCargandoDispositivos(false);
      }
    })();
  }, [navigate, setDispositivos, setDispositivoSeleccionado]);

  // ---- Carga de datos desde el backend ----
  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      // Si no hay dispositivo seleccionado, no podemos cargar datos
      if (!dispositivoSeleccionado) {
        setLecturas([]);
        setAlertas([]);
        setError("Selecciona un dispositivo para ver los datos");
        setCargando(false);
        return;
      }

      // Cargar lecturas del dispositivo seleccionado desde el backend
      const rLect = await api.get("/cliente/lecturas", {
        params: { codigo: dispositivoSeleccionado, limit: 50 }
      });
      
      const lect = Array.isArray(rLect.data) ? rLect.data : [];
      
      // Las lecturas vienen DESC, las ordenamos ASC para el gráfico
      const ordenadas = lect
        .slice()
        .sort(
          (a, b) => new Date(a.fecha_lectura) - new Date(b.fecha_lectura)
        );
      
      setLecturas(ordenadas);
      setAlertas(generarAlertasDesdeLecturas(ordenadas));
    } catch (e) {
      if (e?.response?.status === 401) {
        localStorage.clear();
        navigate("/", { replace: true });
        return;
      }
      console.error(e);
      setError("No se pudieron obtener las lecturas del dispositivo.");
      setLecturas([]);
      setAlertas([]);
    } finally {
      setCargando(false);
    }
  }, [dispositivoSeleccionado, navigate]);

  useEffect(() => {
    cargar();
    // Auto-refresco cada 30 segundos
    const id = setInterval(() => {
      cargar();
    }, 30000);
    return () => clearInterval(id);
  }, [cargar]);

  // ---- Modal de alerta cuando batería < 20 % (si llega un valor crítico nuevo) ----
  const [showAlerta, setShowAlerta] = useState(false);
  const [mensajeAlerta, setMensajeAlerta] = useState("");
  useEffect(() => {
    if (ultima?.bateria != null && ultima.bateria < 20) {
      setMensajeAlerta("⚠️ ¡Alerta! Nivel de batería bajo.");
      setShowAlerta(true);
    }
  }, [ultima?.bateria]);

  // ---- Gráfico (líneas) ----
  const etiquetas = useMemo(
    () =>
      lecturas.map((d) =>
        d?.fecha_lectura
          ? new Date(d.fecha_lectura).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : ""
      ),
    [lecturas]
  );

  const lineData = useMemo(
    () => ({
      labels: etiquetas,
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
    [lecturas, etiquetas]
  );

  // Opciones del gráfico - Optimizado para móvil con hook seguro
  const opcionesGrafico = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { 
          position: isMobile ? "top" : "bottom",
          labels: {
            boxWidth: isMobile ? 12 : 15,
            font: {
              size: isMobile ? 10 : 12
            },
            padding: isMobile ? 8 : 10,
            usePointStyle: true
          }
        },
        tooltip: { 
          mode: "index", 
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: isMobile ? 11 : 13
          },
          bodyFont: {
            size: isMobile ? 10 : 12
          },
          callbacks: {
            title: function(context) {
              return context[0].label;
            },
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              label += context.parsed.y.toFixed(2);
              return label;
            }
          }
        },
        title: {
          display: false  // Ocultamos el título para ahorrar espacio en móvil
        },
      },
      interaction: { 
        mode: "nearest", 
        intersect: false,
        axis: 'x'
      },
      animation: { 
        duration: isMobile ? 200 : 300, 
        easing: "easeOutQuart" 
      },
      scales: {
        y: { 
          beginAtZero: false,
          ticks: {
            font: {
              size: isMobile ? 9 : 11
            },
            maxTicksLimit: isMobile ? 6 : 8
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: { 
          ticks: { 
            maxRotation: 0, 
            autoSkip: true,
            maxTicksLimit: isMobile ? 6 : 10,
            font: {
              size: isMobile ? 9 : 11
            }
          },
          grid: {
            display: false
          }
        },
      },
    }),
    [isMobile]
  );

  const ultimaFecha =
    lecturas.length && lecturas[lecturas.length - 1]?.fecha_lectura
      ? new Date(lecturas[lecturas.length - 1].fecha_lectura).toLocaleString()
      : "—";

  // Correo de soporte (funciona con mailto:)
  const SOPORTE_EMAIL = "soporte@energia.com";
  const soporteHref = `mailto:${SOPORTE_EMAIL}?subject=${encodeURIComponent(
    "Soporte técnico — Sistema Eólico"
  )}&body=${encodeURIComponent(
    "Hola equipo de soporte,\n\nNecesito ayuda con mi equipo eólico.\n\nGracias."
  )}`;

  return (
    <div className="container py-4">
      {/* Hero / encabezado - Optimizado y compacto */}
      <div className="dashboard-hero fade-in" style={{ padding: '1rem 1.5rem' }}>
        <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-3">
          <div className="d-flex flex-column gap-0">
            <h3 className="mb-0 d-inline" style={{ fontWeight: 700, fontSize: '1.5rem' }}>
              👋 Hola, {perfil?.nombre_completo ? perfil.nombre_completo.split(" ")[0] : "Usuario"}
            </h3>
            <small className="text-muted" style={{ fontSize: '0.875rem' }}>
              Panel de monitoreo en tiempo real
            </small>
          </div>

          <div className="d-flex align-items-center gap-2 mt-2 mt-md-0">
            <Button
              variant="outline-primary"
              onClick={cargar}
              disabled={cargando}
              className="btn-refresh"
              style={{ 
                borderRadius: '8px',
                fontWeight: 500,
                minHeight: '38px',
                whiteSpace: 'nowrap'
              }}
            >
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style={{ display: cargando ? 'inline-block' : 'none' }}></span>
              <i className="bi bi-arrow-clockwise me-2" style={{ display: cargando ? 'none' : 'inline' }}></i>
              {cargando ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <Alert 
          variant="danger" 
          dismissible 
          onClose={() => setError("")} 
          className="fade-in"
          key="error-alert"
        >
          <Alert.Heading style={{ fontSize: '1rem' }}>
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            Error
          </Alert.Heading>
          <p className="mb-0" style={{ fontSize: '0.9rem' }}>{error}</p>
        </Alert>
      )}

      {/* Selector de dispositivos - Optimizado para móvil */}
      <Card className="device-selector-card border-0 fade-in">
        <Card.Body>
          <div className="device-selector-label">
            <i className="bi bi-hdd-network me-2"></i>
            Dispositivo a monitorear
          </div>
          
          {cargandoDispositivos ? (
            <div className="text-center py-3">
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              <span className="text-muted">Cargando dispositivos...</span>
            </div>
          ) : dispositivos.length === 0 ? (
            <Alert variant="info" className="mb-0">
              <i className="bi bi-info-circle me-2"></i>
              No tienes dispositivos asignados
            </Alert>
          ) : (
            <div>
              <Form.Select
                value={dispositivoSeleccionado || ""}
                onChange={(e) => setDispositivoSeleccionado(e.target.value)}
                className="w-100"
                style={{ 
                  minHeight: '44px',
                  fontSize: '0.95rem',
                  borderRadius: '8px'
                }}
              >
                {dispositivos.map((disp) => (
                  <option key={disp.codigo} value={disp.codigo}>
                    {disp.codigo} {disp.habilitado ? "• Activo ✓" : "• Inactivo ✗"}
                  </option>
                ))}
              </Form.Select>
              
              {dispositivoSeleccionado && (
                <div className="mt-2 text-center" key={`badge-${dispositivoSeleccionado}`}>
                  <Badge bg="success" className="device-selector-badge">
                    <i className="bi bi-broadcast me-1"></i>
                    Monitoreando: {dispositivoSeleccionado}
                  </Badge>
                </div>
              )}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* KPIs - Optimizado para móvil con diseño profesional */}
      <Row className="g-3 mb-4">
        <Col xs={12} md={4}>
          <Card className="kpi-card border-0 fade-in">
            <Card.Body className="kpi-card-body">
              <div className="flex-grow-1">
                <div className="kpi-label">
                  <i className="bi bi-lightning-charge me-1"></i>
                  Voltaje
                </div>
                <div className="kpi-value text-primary">
                  {fmtNum(voltaje, 2, " V")}
                </div>
                <div
                  className={`kpi-change ${
                    dVolt == null
                      ? "text-muted"
                      : dVolt >= 0
                      ? "text-success"
                      : "text-danger"
                  }`}
                >
                  {arrow(dVolt)} {dVolt == null ? "—" : fmtNum(dVolt, 2, " V")} vs. anterior
                </div>
              </div>
              <div className="kpi-icon text-primary">🔌</div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4}>
          <Card className="kpi-card border-0 fade-in">
            <Card.Body className="kpi-card-body">
              <div className="flex-grow-1">
                <div className="kpi-label">
                  <i className="bi bi-battery-charging me-1"></i>
                  Batería
                </div>
                <div className="kpi-value text-success">
                  {fmtNum(bateria, 0, " %")}
                </div>
                {bateria != null && bateria < 20 && (
                  <Badge bg="warning" text="dark" className="mt-1">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    Nivel bajo
                  </Badge>
                )}
                <div
                  className={`kpi-change ${
                    dBat == null
                      ? "text-muted"
                      : dBat >= 0
                      ? "text-success"
                      : "text-danger"
                  }`}
                >
                  {arrow(dBat)} {dBat == null ? "—" : fmtNum(dBat, 0, " %")} vs. anterior
                </div>
              </div>
              <div className="kpi-icon text-success">🔋</div>
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4}>
          <Card className="kpi-card border-0 fade-in">
            <Card.Body className="kpi-card-body">
              <div className="flex-grow-1">
                <div className="kpi-label">
                  <i className="bi bi-speedometer me-1"></i>
                  Consumo
                </div>
                <div className="kpi-value text-warning">
                  {fmtNum(consumo, 1, " W")}
                </div>
                <div
                  className={`kpi-change ${
                    dCon == null
                      ? "text-muted"
                      : dCon >= 0
                      ? "text-danger"
                      : "text-success"
                  }`}
                >
                  {arrow(dCon)} {dCon == null ? "—" : fmtNum(dCon, 1, " W")} vs. anterior
                </div>
              </div>
              <div className="kpi-icon text-warning">⚡</div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal de alerta por batería baja */}
      <Modal show={showAlerta} onHide={() => setShowAlerta(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Alerta del sistema</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-0">{mensajeAlerta}</p>
          <small className="text-muted">
            Revisa tu equipo y contacta soporte si corresponde.
          </small>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAlerta(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Gráfico principal - Optimizado para móvil */}
      <Card className="chart-card border-0 fade-in">
        <Card.Body>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h5 className="mb-0" style={{ fontWeight: 700 }}>
              <i className="bi bi-graph-up me-2"></i>
              Monitoreo en tiempo real
            </h5>
          </div>
          
          {cargando ? (
            <div className="loading-container d-flex flex-column align-items-center justify-content-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p className="text-muted mt-3 mb-0">Cargando datos...</p>
            </div>
          ) : lecturas.length === 0 ? (
            <Alert variant="info" className="text-center">
              <i className="bi bi-info-circle me-2"></i>
              No hay datos disponibles para mostrar
            </Alert>
          ) : (
            <>
              <div className="chart-container">
                <Line data={lineData} options={opcionesGrafico} />
              </div>
              <div className="text-center text-md-end mt-3">
                <small className="text-muted d-flex align-items-center justify-content-center justify-content-md-end gap-2">
                  <i className="bi bi-clock-history"></i>
                  Última actualización: {ultimaFecha}
                </small>
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Alertas recientes - Optimizado para móvil */}
      <Card className="alerts-card border-0 fade-in">
        <Card.Body>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h5 className="mb-0" style={{ fontWeight: 700 }}>
              <i className="bi bi-bell me-2"></i>
              Alertas recientes
            </h5>
            <Badge bg="secondary" pill>
              {alertas.length || 0}
            </Badge>
          </div>
          
          {alertas.length === 0 ? (
            <Alert variant="success" className="mb-0">
              <i className="bi bi-check-circle me-2"></i>
              Todo funciona correctamente. No hay alertas pendientes.
            </Alert>
          ) : (
            <div className="d-flex flex-column gap-2">
              {alertas.slice(0, 5).map((a, i) => (
                <div key={i} className="alert-item">
                  <div className="alert-item-header">
                    <div className="alert-item-title">
                      <i className="bi bi-exclamation-triangle-fill text-warning me-2"></i>
                      {a?.mensaje || "Alerta del sistema"}
                    </div>
                    <Badge bg="warning" text="dark" style={{ fontSize: '0.75rem' }}>
                      Atención
                    </Badge>
                  </div>
                  
                  <div className="alert-item-date">
                    <i className="bi bi-clock me-1"></i>
                    {a?.fecha_lectura
                      ? new Date(a.fecha_lectura).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : "Sin fecha"}
                  </div>
                  
                  <div className="alert-item-details">
                    <div className="d-flex flex-wrap gap-3 mt-2">
                      <span>⚡ {fmtNum(a?.voltaje, 2, " V")}</span>
                      <span>🔋 {fmtNum(a?.bateria, 0, " %")}</span>
                      <span>📊 {fmtNum(a?.consumo, 1, " W")}</span>
                    </div>
                  </div>
                </div>
              ))}
              {alertas.length > 5 && (
                <div className="text-center mt-2">
                  <small className="text-muted">
                    Mostrando 5 de {alertas.length} alertas
                  </small>
                </div>
              )}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Perfil (básico) - Optimizado para móvil */}
      <Card className="profile-card border-0 fade-in">
        <Card.Body>
          <h5 className="mb-3" style={{ fontWeight: 700 }}>
            <i className="bi bi-person-circle me-2"></i>
            Mi perfil
          </h5>
          {perfil ? (
            <Row>
              <Col xs={12} md={6} className="mb-3 mb-md-0">
                <div className="mb-2">
                  <small className="text-muted d-block mb-1">
                    <i className="bi bi-person me-1"></i>
                    Nombre completo
                  </small>
                  <strong>{perfil.nombre_completo || "—"}</strong>
                </div>
                <div className="mb-2">
                  <small className="text-muted d-block mb-1">
                    <i className="bi bi-envelope me-1"></i>
                    Correo electrónico
                  </small>
                  <strong>{perfil.email || "—"}</strong>
                </div>
              </Col>
              <Col xs={12} md={6}>
                <div className="mb-2">
                  <small className="text-muted d-block mb-1">
                    <i className="bi bi-telephone me-1"></i>
                    Teléfono
                  </small>
                  <strong>{perfil.telefono || "—"}</strong>
                </div>
                <div className="mb-2">
                  <small className="text-muted d-block mb-1">
                    <i className="bi bi-geo-alt me-1"></i>
                    Dirección
                  </small>
                  <strong>{perfil.direccion || "—"}</strong>
                </div>
              </Col>
            </Row>
          ) : (
            <div className="text-center py-3">
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              <span className="text-muted">Cargando perfil...</span>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Consejos y soporte - Optimizado para móvil */}
      <Row className="g-3 mb-4">
        <Col xs={12} md={6}>
          <Card className="info-card border-0 fade-in">
            <Card.Body>
              <h5 className="mb-3" style={{ fontWeight: 700 }}>
                <i className="bi bi-lightbulb me-2"></i>
                Consejos de ahorro
              </h5>
              <ul className="mb-0" style={{ paddingLeft: '1.25rem' }}>
                <li className="mb-2">
                  <strong>Apaga dispositivos</strong> cuando no los uses para reducir consumo.
                </li>
                <li className="mb-2">
                  <strong>Equipos eficientes</strong> en horarios de baja demanda.
                </li>
                <li className="mb-0">
                  <strong>Mantenimiento preventivo</strong> para máximo rendimiento.
                </li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card className="info-card border-0 fade-in">
            <Card.Body>
              <h5 className="mb-3" style={{ fontWeight: 700 }}>
                <i className="bi bi-headset me-2"></i>
                Soporte técnico
              </h5>
              <div className="mb-3">
                <small className="text-muted d-block mb-1">
                  <i className="bi bi-envelope-at me-1"></i>
                  Correo electrónico
                </small>
                <a 
                  href={soporteHref} 
                  className="text-decoration-none fw-bold"
                  style={{ 
                    color: '#007bff',
                    fontSize: '0.95rem'
                  }}
                >
                  {SOPORTE_EMAIL}
                </a>
              </div>
              <div>
                <small className="text-muted d-block mb-1">
                  <i className="bi bi-telephone-forward me-1"></i>
                  Teléfono
                </small>
                <a 
                  href="tel:123456789" 
                  className="text-decoration-none fw-bold"
                  style={{ 
                    color: '#007bff',
                    fontSize: '0.95rem'
                  }}
                >
                  123-456-789
                </a>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
