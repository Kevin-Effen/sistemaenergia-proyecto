import { Button, Card, Row, Col, Form, Badge, Spinner } from 'react-bootstrap';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend, Filler } from 'chart.js';
import api from '../api/axios';
ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend, Filler);

function Graficos() {
  const [filtroFecha, setFiltroFecha] = React.useState("hoy");
  const [usuario, setUsuario] = React.useState("admin123@gmail.com");
  const [dispositivo, setDispositivo] = React.useState("0001");
  const [cargando, setCargando] = React.useState(false);
  const [lecturas, setLecturas] = React.useState([]);
  const [error, setError] = React.useState("");

  // Cargar lecturas filtradas por usuario/dispositivo
  const cargarDatos = async () => {
    setCargando(true);
    setError("");
    try {
      // Endpoint real: /cliente/lecturas?codigo=XXX
      const res = await api.get("/cliente/lecturas", {
        params: { codigo: dispositivo, limit: 100 }
      });
      const arr = Array.isArray(res.data) ? res.data : [];
      setLecturas(arr.slice().sort((a, b) => new Date(a.fecha_lectura) - new Date(b.fecha_lectura)));
    } catch (e) {
      setError("No se pudieron obtener las lecturas del dispositivo.");
      setLecturas([]);
    } finally {
      setCargando(false);
    }
  };

  React.useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line
  }, [dispositivo]);

  // Preparar datos para el gráfico
  const labels = lecturas.map(d =>
    d?.fecha_lectura ? new Date(d.fecha_lectura).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""
  );
  const data = {
    labels,
    datasets: [
      {
        label: "Voltaje (V)",
        data: lecturas.map(d => Number(d.voltaje) || 0),
        borderColor: "#1976d2",
        backgroundColor: "rgba(33,150,243,0.12)",
        fill: true,
        tension: 0.35,
        pointRadius: 3,
      },
      {
        label: "Batería (%)",
        data: lecturas.map(d => Number(d.bateria) || 0),
        borderColor: "#43a047",
        backgroundColor: "rgba(67,160,71,0.12)",
        fill: true,
        tension: 0.35,
        pointRadius: 3,
      },
      {
        label: "Consumo (W)",
        data: lecturas.map(d => Number(d.consumo) || 0),
        borderColor: "#ffa000",
        backgroundColor: "rgba(255,160,0,0.12)",
        fill: true,
        tension: 0.35,
        pointRadius: 3,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
      tooltip: { mode: "index", intersect: false },
      title: { display: true, text: "Tendencias del sistema eólico" },
    },
    interaction: { mode: "nearest", intersect: false },
    animation: { duration: 400, easing: "easeOutQuart" },
    scales: {
      y: { beginAtZero: false },
      x: { ticks: { maxRotation: 0, autoSkip: true } },
    },
  };

  // Exportar gráfico (simulado)
  const exportarGrafico = () => {
    alert("Funcionalidad de exportación próximamente disponible.");
  };

  return (
    <div className="container-fluid py-4" style={{ maxWidth: 1400, margin: "0 auto" }}>
      <Card className="mb-4 shadow-sm border-0 bg-white" style={{ borderRadius: 18, boxShadow: "0 2px 16px #1976d233" }}>
        <Card.Body>
          <div className="row align-items-center g-3">
            <div className="col-12 col-md-7 d-flex align-items-center gap-3">
              <i className="bi bi-graph-up-arrow" style={{ fontSize: 48, color: "#1976d2" }}></i>
              <div>
                <h2 className="mb-1 fw-bold text-primary" style={{ fontSize: 32 }}>Gráficos del Sistema Eólico</h2>
                <div className="text-muted" style={{ fontSize: 20 }}>Monitoreo visual y análisis de tendencias</div>
              </div>
            </div>
            <div className="col-12 col-md-5 d-flex justify-content-md-end align-items-center gap-3 mt-3 mt-md-0">
              <Button variant="success" onClick={recargarDatos} disabled={cargando} style={{ fontWeight: 500, fontSize: 18, padding: "10px 28px" }}>
                {cargando ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="bi bi-arrow-repeat me-2"></i>}
                Recargar datos
              </Button>
              <Button variant="outline-primary" onClick={exportarGrafico} style={{ fontWeight: 500, fontSize: 18, padding: "10px 28px" }}>
                <i className="bi bi-download me-2"></i>
                Exportar gráfico
              </Button>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card className="shadow-sm border-0 mb-4 bg-white" style={{ borderRadius: 18, boxShadow: "0 2px 16px #1976d233", minHeight: 420 }}>
        <Card.Body>
          <Row className="g-3 mb-4">
            <Col xs={12} md={4}>
              <Form.Group>
                <Form.Label>Dispositivo</Form.Label>
                <Form.Control type="text" value={dispositivo} onChange={e => setDispositivo(e.target.value)} />
              </Form.Group>
            </Col>
          </Row>
          <div style={{ height: 340, position: "relative" }}>
            {error && <div className="alert alert-danger mb-3">{error}</div>}
            <Line data={data} options={options} />
            {cargando && (
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
                <Spinner animation="border" variant="primary" style={{ width: 60, height: 60 }} />
              </div>
            )}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

export default Graficos;