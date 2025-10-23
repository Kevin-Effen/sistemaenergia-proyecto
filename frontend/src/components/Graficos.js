// src/components/Graficos.jsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Line, Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  ArcElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import api from "../api/axios";
import { generarPDF } from "../components/ReportePDF";
import { useDevice } from "../context/DeviceContext";
import "animate.css";
import "../styles/graficos-profesional.css";

ChartJS.register(
  LineElement,
  BarElement,
  ArcElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Tooltip,
  Legend
);

/* ===== Helper: obtener PNG en alta resolución del chart ===== */
const toBase64HiDPI = (chartRef, scale = 3) => {
  const chart = chartRef?.current;
  if (!chart) return null;

  const oldDpr = chart.options.devicePixelRatio;
  chart.options.devicePixelRatio = scale;
  chart.resize();
  const img = chart.toBase64Image("image/png", 1.0);
  chart.options.devicePixelRatio = oldDpr;
  chart.resize();
  return img;
};

// helpers de sesión
function getRol() {
  return (localStorage.getItem("rol") || "").toLowerCase();
}
function getUsuarioLS() {
  try {
    return JSON.parse(localStorage.getItem("usuario") || "null");
  } catch {
    return null;
  }
}

// normalizador para búsqueda (quita acentos y pasa a minúsculas)
const norm = (s) =>
  (s ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

function Graficos() {
  const lineRef = useRef(null);
  const barRef = useRef(null);
  const pieRef = useRef(null);

  // ---- Context global de dispositivos ----
  const { dispositivoSeleccionado } = useDevice();

  const [datos, setDatos] = useState([]);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  // switch para tiempo real (simulado)
  const [tiempoReal, setTiempoReal] = useState(false); // simula stream en vivo

  // === soporte para admin buscar un usuario ===
  const rol = getRol();
  const soyAdmin = rol === "administrador";
  const me = getUsuarioLS();

  const [usuarios, setUsuarios] = useState([]); // lista para el buscador
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState(null); // {id_usuario, usuario, nombres, ...}

  const MAX_PUNTOS = 30;
  const INTERVALO_MS = 2000;

  // Cargar usuarios para el buscador (solo admin). Descarga una vez y filtra local.
  const cargarUsuarios = useCallback(async () => {
    if (!soyAdmin) return;
    try {
      setCargandoUsuarios(true);
      const res = await api.get("/usuarios");
      setUsuarios(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setUsuarios([]);
    } finally {
      setCargandoUsuarios(false);
    }
  }, [soyAdmin]);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  const usuariosFiltrados = useMemo(() => {
    const q = norm(busqueda);
    if (!q) return usuarios.slice(0, 20);
    return usuarios
      .filter((u) => {
        const campos = [
          u.id_usuario,
          u.usuario,
          u.nombres,
          u.primer_apellido,
          u.segundo_apellido,
          u.nombre_rol,
          u.ci,
        ].map((x) => norm(x));
        return campos.some((c) => c.includes(q));
      })
      .slice(0, 20);
  }, [busqueda, usuarios]);

  // ===== Cargar datos desde el backend, según usuario seleccionado (admin) =====
  const cargar = useCallback(async () => {
    try {
      setCargando(true);
      setError("");

      // Si hay dispositivo seleccionado, usar endpoint específico
      if (dispositivoSeleccionado) {
        const res = await api.get(`/cliente/lecturas?codigo=${encodeURIComponent(dispositivoSeleccionado)}&limit=100`);
        const arr = Array.isArray(res.data) ? res.data : [];
        setDatos(
          arr.map((d, i) => ({
            fecha_lectura:
              d.fecha_lectura || new Date(Date.now() - (arr.length - i) * 3600e3).toISOString(),
            voltaje: Number(d.voltaje) || 0,
            bateria: Number(d.bateria) || 0,
            consumo: Number(d.consumo) || 0,
            codigo: d.codigo,
          }))
        );
        setCargando(false);
        return;
      }

      // si soy admin y hay un usuario seleccionado, pedir sus datos
      const userId = soyAdmin && seleccionado?.id_usuario ? seleccionado.id_usuario : undefined;
      const url = userId ? `/resumen?userId=${encodeURIComponent(userId)}` : "/resumen";
      const res = await api.get(url);
      const arr = Array.isArray(res.data) ? res.data : [];
      setDatos(
        arr.map((d, i) => ({
          fecha_lectura:
            d.fecha_lectura || new Date(Date.now() - (arr.length - i) * 3600e3).toISOString(),
          voltaje: Number(d.voltaje) || 0,
          bateria: Number(d.bateria) || 0,
          consumo: Number(d.consumo) || 0,
        }))
      );
    } catch (e) {
      setError("No se pudo cargar los datos.");
      setDatos([]);
    } finally {
      setCargando(false);
    }
  }, [soyAdmin, seleccionado, dispositivoSeleccionado]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  /* ===== Simulación “tiempo real” ===== */
  useEffect(() => {
    if (!tiempoReal) return;
    const id = setInterval(() => {
      setDatos((prev) => {
        const now = new Date();
        const anterior = prev.at(-1) || { bateria: 80, voltaje: 12.5, consumo: 50 };
        const nuevo = {
          fecha_lectura: now.toISOString(),
          voltaje: +(anterior.voltaje + (Math.random() * 0.3 - 0.15)).toFixed(2),
          bateria: Math.max(
            0,
            Math.min(100, +(anterior.bateria + (Math.random() * 1.2 - 0.6)).toFixed(0))
          ),
          consumo: +(anterior.consumo + (Math.random() * 3 - 1.5)).toFixed(0),
        };
        const arr = [...prev, nuevo];
        return arr.length > MAX_PUNTOS ? arr.slice(-MAX_PUNTOS) : arr;
      });
    }, INTERVALO_MS);

    return () => clearInterval(id);
  }, [tiempoReal]);

  /* ===== Preparación de series ===== */
  const serieOrdenada = datos
    .slice()
    .sort((a, b) => new Date(a.fecha_lectura) - new Date(b.fecha_lectura));

  const etiquetas = serieOrdenada.map((d) =>
    new Date(d.fecha_lectura).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );

  const voltajes = serieOrdenada.map((d) => Number(d.voltaje) || 0);
  const baterias = serieOrdenada.map((d) => Number(d.bateria) || 0);
  const consumos = serieOrdenada.map((d) => Number(d.consumo) || 0);

  /* ===== Config Chart.js ===== */
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500, easing: "easeOutQuart" },
    interaction: { mode: "nearest", intersect: false },
    plugins: { legend: { position: "bottom" }, tooltip: { mode: "index", intersect: false } },
    scales: { y: { beginAtZero: true } },
  };

  const lineData = {
    labels: etiquetas,
    datasets: [
      {
        label: "Voltaje (V)",
        data: voltajes,
        borderColor: "#28a745",
        backgroundColor: "rgba(40,167,69,0.2)",
        tension: 0.3,
        fill: true,
      },
      {
        label: "Batería (%)",
        data: baterias,
        borderColor: "#007bff",
        backgroundColor: "rgba(0,123,255,0.2)",
        tension: 0.3,
        fill: true,
      },
      {
        label: "Consumo (W)",
        data: consumos,
        borderColor: "#fd7e14",
        backgroundColor: "rgba(253,126,20,0.2)",
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const barData = {
    labels: etiquetas,
    datasets: [
      { label: "Nivel de Batería (%)", data: baterias, backgroundColor: "#007bff", borderRadius: 6 },
    ],
  };

  const pieData = {
    labels: etiquetas.length ? etiquetas : ["Sin datos"],
    datasets: [
      {
        label: "Consumo energético (W)",
        data: consumos.length ? consumos : [1],
        backgroundColor: ["#4caf50", "#2196f3", "#ff9800", "#f44336", "#9c27b0"],
        hoverOffset: 20,
      },
    ],
  };

  /* ===== Exportación PDF nítida ===== */
  const exportarPDF = async (ref, titulo, filas, columnas, nombreArchivo) => {
    const img = toBase64HiDPI(ref, 3); // 3x DPI
    if (!img) return;
    let nombreUsuario = "—";
    try {
      if (soyAdmin && seleccionado) {
        nombreUsuario = seleccionado.usuario || seleccionado.nombres || "—";
      } else {
        nombreUsuario = me?.usuario || "—";
      }
    } catch {}
    await generarPDF({
      titulo,
      usuario: nombreUsuario,
      descripcion: tiempoReal
        ? "Tiempo real"
        : soyAdmin && seleccionado
        ? `Datos del usuario ID ${seleccionado.id_usuario}`
        : "Datos del servidor",
      tabla: filas,
      head: columnas,
      graficoBase64: img,
      nombreArchivo: nombreArchivo || "reporte_monitor",
    });
  };

  // Texto "Mostrando…"
  const tituloContexto = useMemo(() => {
    let texto = "";
    if (soyAdmin && seleccionado) {
      const nom =
        [seleccionado.nombres, seleccionado.primer_apellido, seleccionado.segundo_apellido]
          .filter(Boolean)
          .join(" ") || seleccionado.usuario;
      texto = `Mostrando: ${nom} (ID ${seleccionado.id_usuario})`;
    } else {
      texto = me?.usuario ? `Mostrando: ${me.usuario}` : "Mostrando: usuario actual";
    }
    
    // Agregar dispositivo si está seleccionado
    if (dispositivoSeleccionado) {
      texto += ` | Dispositivo: ${dispositivoSeleccionado}`;
    }
    
    return texto;
  }, [soyAdmin, seleccionado, me, dispositivoSeleccionado]);

  return (
    <div className="graficos-container-modern">
      {/* Header Premium */}
      <div className="graficos-header-premium animate__animated animate__fadeInDown">
        <div className="header-content-wrapper">
          <div className="header-left">
            <div className="icon-wrapper">
              <i className="fas fa-chart-line"></i>
            </div>
            <div className="title-section">
              <h2 className="main-title">Monitoreo del Sistema Eólico</h2>
              <p className="subtitle-info">{tituloContexto}</p>
            </div>
          </div>

          <div className="header-actions">
            <button className="btn-reload" onClick={cargar} title="Recargar datos">
              <i className="fas fa-sync-alt"></i>
              <span className="btn-text">Recargar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Buscador de usuarios (solo admin) */}
      {soyAdmin && (
        <div className="admin-search-card animate__animated animate__fadeIn">
          <div className="admin-badge-header">
            <span className="admin-badge">
              <i className="fas fa-user-shield"></i> Modo Administrador
            </span>
            {cargandoUsuarios && (
              <span className="loading-indicator">
                <i className="fas fa-spinner fa-spin"></i> Cargando usuarios...
              </span>
            )}
          </div>

          <div className="search-bar-container">
            <div className="search-input-wrapper">
              <i className="fas fa-search search-icon"></i>
              <input
                type="search"
                className="search-input-modern"
                placeholder="Buscar por nombre, correo, CI o usuario..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button 
                  className="clear-search-btn"
                  onClick={() => setBusqueda("")}
                  title="Limpiar búsqueda"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
            
            {seleccionado && (
              <button
                className="btn-clear-selection"
                onClick={() => {
                  setBusqueda("");
                  setSeleccionado(null);
                  cargar();
                }}
              >
                <i className="fas fa-user-times"></i>
                <span>Limpiar selección</span>
              </button>
            )}
          </div>

          {/* Dropdown de resultados */}
          {busqueda && usuariosFiltrados.length > 0 && (
            <div className="search-results-dropdown animate__animated animate__fadeInDown animate__faster">
              {usuariosFiltrados.map((u) => {
                const nombreCompleto = [u.nombres, u.primer_apellido, u.segundo_apellido]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <div
                    key={u.id_usuario}
                    className="result-item"
                    onClick={() => {
                      setSeleccionado(u);
                      setBusqueda(`${nombreCompleto || u.usuario} (${u.usuario || "sin correo"})`);
                      setTimeout(() => cargar(), 0);
                    }}
                  >
                    <div className="result-main">
                      <div className="result-name">
                        <i className="fas fa-user-circle"></i>
                        {nombreCompleto || "Sin nombre"}
                      </div>
                      <span className={`role-badge role-${(u.nombre_rol || '').toLowerCase()}`}>
                        {u.nombre_rol || "—"}
                      </span>
                    </div>
                    <div className="result-details">
                      <span><i className="fas fa-envelope"></i> {u.usuario || "—"}</span>
                      <span><i className="fas fa-id-card"></i> CI: {u.ci || "—"}</span>
                      <span><i className="fas fa-hashtag"></i> ID: {u.id_usuario}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {seleccionado && (
            <div className="selected-user-badge animate__animated animate__bounceIn">
              <i className="fas fa-check-circle"></i>
              <span>Viendo datos de: <strong>{seleccionado.nombres || seleccionado.usuario}</strong> (ID: {seleccionado.id_usuario})</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="alert-error-modern animate__animated animate__shake">
          <i className="fas fa-exclamation-triangle"></i>
          <span>{error}</span>
        </div>
      )}
      
      {cargando && (
        <div className="loading-state">
          <div className="spinner-modern"></div>
          <p>Cargando datos del sistema...</p>
        </div>
      )}
      
      {!cargando && datos.length === 0 && !error && (
        <div className="empty-state">
          <i className="fas fa-chart-bar"></i>
          <h3>No hay datos disponibles</h3>
          <p>Comienza a monitorear tu sistema para ver las gráficas aquí</p>
        </div>
      )}

      {datos.length > 0 && (
        <div className="charts-grid animate__animated animate__fadeIn">
          {/* Gráfico Principal - Tendencias */}
          <div className="chart-card chart-card-full animate__animated animate__fadeInUp">
            <div className="chart-header chart-header-success">
              <div className="chart-title-section">
                <i className="fas fa-chart-line"></i>
                <h3>Tendencias de Voltaje, Batería y Consumo</h3>
              </div>
              <div className="chart-stats">
                <div className="stat-item">
                  <span className="stat-label">Voltaje</span>
                  <span className="stat-value" style={{color: '#28a745'}}>
                    {voltajes[voltajes.length - 1]?.toFixed(2) || 0}V
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Batería</span>
                  <span className="stat-value" style={{color: '#007bff'}}>
                    {baterias[baterias.length - 1] || 0}%
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Consumo</span>
                  <span className="stat-value" style={{color: '#fd7e14'}}>
                    {consumos[consumos.length - 1] || 0}W
                  </span>
                </div>
              </div>
            </div>
            <div className="chart-body">
              <Line ref={lineRef} data={lineData} options={options} />
            </div>
            <div className="chart-footer">
              <button
                className="btn-export btn-export-success"
                onClick={() =>
                  exportarPDF(
                    lineRef,
                    "Gráfico de Tendencias Eléctricas",
                    serieOrdenada.map((d) => [
                      new Date(d.fecha_lectura).toLocaleString(),
                      d.voltaje,
                      d.bateria,
                      d.consumo,
                    ]),
                    ["Fecha/Hora", "Voltaje (V)", "Batería (%)", "Consumo (W)"],
                    "reporte_tendencias"
                  )
                }
              >
                <i className="fas fa-file-pdf"></i>
                Exportar PDF
              </button>
            </div>
          </div>

          {/* Grid de gráficos secundarios */}
          <div className="chart-card chart-card-half animate__animated animate__fadeInUp animate__delay-1s">
            <div className="chart-header chart-header-primary">
              <div className="chart-title-section">
                <i className="fas fa-battery-three-quarters"></i>
                <h3>Nivel de Batería</h3>
              </div>
              <div className="chart-badge">
                <span className={`status-badge ${baterias[baterias.length - 1] > 70 ? 'status-good' : baterias[baterias.length - 1] > 30 ? 'status-warning' : 'status-danger'}`}>
                  {baterias[baterias.length - 1] > 70 ? 'Óptimo' : baterias[baterias.length - 1] > 30 ? 'Moderado' : 'Bajo'}
                </span>
              </div>
            </div>
            <div className="chart-body chart-body-medium">
              <Bar ref={barRef} data={barData} options={options} />
            </div>
            <div className="chart-footer">
              <button
                className="btn-export btn-export-primary"
                onClick={() =>
                  exportarPDF(
                    barRef,
                    "Gráfico de Nivel de Batería",
                    serieOrdenada.map((d) => [
                      new Date(d.fecha_lectura).toLocaleString(),
                      d.bateria,
                    ]),
                    ["Fecha/Hora", "Batería (%)"],
                    "reporte_bateria"
                  )
                }
              >
                <i className="fas fa-file-pdf"></i>
                Exportar PDF
              </button>
            </div>
          </div>

          <div className="chart-card chart-card-half animate__animated animate__fadeInUp animate__delay-1s">
            <div className="chart-header chart-header-warning">
              <div className="chart-title-section">
                <i className="fas fa-bolt"></i>
                <h3>Distribución de Consumo</h3>
              </div>
              <div className="chart-badge">
                <span className="consumption-total">
                  <i className="fas fa-plug"></i>
                  {consumos.reduce((a, b) => a + b, 0)} W total
                </span>
              </div>
            </div>
            <div className="chart-body chart-body-medium">
              <Pie ref={pieRef} data={pieData} options={options} />
            </div>
            <div className="chart-footer">
              <button
                className="btn-export btn-export-warning"
                onClick={() =>
                  exportarPDF(
                    pieRef,
                    "Gráfico de Consumo Energético",
                    serieOrdenada.map((d) => [
                      new Date(d.fecha_lectura).toLocaleString(),
                      d.consumo,
                    ]),
                    ["Fecha/Hora", "Consumo (W)"],
                    "reporte_consumo"
                  )
                }
              >
                <i className="fas fa-file-pdf"></i>
                Exportar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Graficos;
