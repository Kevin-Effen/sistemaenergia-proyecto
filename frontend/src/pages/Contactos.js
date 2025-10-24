// src/pages/Contactos.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  Card,
  Button,
  Alert,
  Row,
  Col,
  Accordion,
  Badge,
  Table,
  Container,
  Form,
} from "react-bootstrap";
import {
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaCopy,
  FaCheck,
  FaDownload,
  FaHeartbeat,
  FaTrashAlt,
  FaWhatsapp,
  FaQuestionCircle,
  FaStickyNote,
  FaHistory,
  FaBook,
  FaRocket,
  FaShieldAlt,
  FaClock,
  FaUsers,
} from "react-icons/fa";
import api from "../api/axios";
import "animate.css";

// ============================
// Datos de soporte
// ============================
const SOPORTE_EMAIL = "countableuncountable@gmail.com";
const SOPORTE_CEL = "+59172641958";
const SOPORTE_WHATSAPP = "59172641958";
const SOPORTE_DIR = "Calle Manuel Virreira #0077, Cochabamba, Bolivia";

// ============================
// FAQS
// ============================
const FAQS = [
  {
    q: "¿Cómo veo mis lecturas y gráficas?",
    a: "Entra a tu Dashboard de usuario para visualizar lecturas y tendencias.",
  },
  {
    q: "¿Qué significa 'Batería baja'?",
    a: "Indica batería por debajo del 20%. Revisa conexiones o programa una carga.",
  },
  {
    q: "¿Puedo exportar mis datos?",
    a: "Sí, desde el dashboard puedes exportar CSV y el administrador puede generar PDF.",
  },
  {
    q: "¿No puedo iniciar sesión?",
    a: "Usa 'Olvidaste tu contraseña' o contacta a soporte.",
  },
];

// ============================
// Utilidades
// ============================
const fmtFecha = (iso) =>
  iso
    ? new Date(iso).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export default function Contactos() {
  const isMounted = useRef(true);
  const [copied, setCopied] = useState({ email: false, cel: false });
  const [probando, setProbando] = useState(false);
  const [estadoAPI, setEstadoAPI] = useState(null); // "ok" | "fail" | null
  const [estadoMsg, setEstadoMsg] = useState("");

  const [nota, setNota] = useState("");
  const [notas, setNotas] = useState([]);
  const [hist, setHist] = useState([]);
  const [descargando, setDescargando] = useState(false);

  // Cargar notas e historial desde localStorage
  useEffect(() => {
    isMounted.current = true;
    
    try {
      const guardadas = JSON.parse(
        localStorage.getItem("mis_notas_soporte") || "[]"
      );
      if (Array.isArray(guardadas)) setNotas(guardadas);
    } catch {}
    try {
      const h = JSON.parse(localStorage.getItem("soporte_historial") || "[]");
      if (Array.isArray(h)) setHist(h);
    } catch {}

    return () => {
      isMounted.current = false;
    };
  }, []);

  // Guardar en historial (máx. 30)
  const pushHist = (tipo, detalle) => {
    const item = { id: Date.now(), tipo, detalle, fecha: new Date().toISOString() };
    const next = [item, ...hist].slice(0, 30);
    setHist(next);
    localStorage.setItem("soporte_historial", JSON.stringify(next));
  };

  // Copiar email / teléfono
  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied((c) => ({ ...c, [field]: true }));
      pushHist("copiar", field === "email" ? "Email de soporte" : "Teléfono de soporte");
      setTimeout(() => setCopied((c) => ({ ...c, [field]: false })), 1500);
    } catch {}
  };

  // Descargar manual estático
  const onDescargarManual = () => {
    setDescargando(true);
    try {
      // Crear un enlace temporal para descargar el PDF estático
      const link = document.createElement("a");
      link.href = "/Manual_de_Usuario.pdf";
      link.download = "Manual_de_Usuario_-_Sistema_de_Energia_Eolica.pdf";
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      pushHist("descargar", "Manual del usuario");
    } catch (err) {
      console.error("❌ Error al descargar manual:", err);
      alert("No se pudo descargar el manual.");
    } finally {
      setDescargando(false);
    }
  };

  // Probar conexión al backend
  const onProbarConexion = async () => {
    setProbando(true);
    setEstadoAPI(null);
    setEstadoMsg("");
    try {
      const r = await api.get("/me-detalle");
      if (!isMounted.current) return;
      
      const nombres = r?.data?.nombres || "Usuario";
      const apellido = r?.data?.primer_apellido || "";
      const nombreCompleto = `${nombres} ${apellido}`.trim();
      setEstadoAPI("ok");
      setEstadoMsg(`✅ Conectado exitosamente. Usuario: ${nombreCompleto}`);
      pushHist("probar", "Conexión OK");
    } catch (error) {
      if (!isMounted.current) return;
      
      setEstadoAPI("fail");
      setEstadoMsg("❌ No se pudo conectar. Verifica que el backend esté corriendo.");
      pushHist("probar", "Conexión FALLÓ");
    } finally {
      if (isMounted.current) {
        setProbando(false);
      }
    }
  };

  // Notas
  const agregarNota = () => {
    const n = (nota || "").trim();
    if (!n) return;
    const item = { id: Date.now(), txt: n, fecha: new Date().toISOString() };
    const next = [item, ...notas].slice(0, 100);
    setNotas(next);
    localStorage.setItem("mis_notas_soporte", JSON.stringify(next));
    setNota("");
  };

  const borrarNota = (id) => {
    const next = notas.filter((x) => x.id !== id);
    setNotas(next);
    localStorage.setItem("mis_notas_soporte", JSON.stringify(next));
  };

  return (
    <div style={{ 
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", 
      minHeight: "100vh",
      paddingBottom: "40px"
    }}>
      {/* Hero Header con diseño profesional */}
      <div 
        className="animate__animated animate__fadeInDown" 
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "50px 20px",
          marginBottom: "40px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Decoración de fondo */}
        <div style={{
          position: "absolute",
          top: "-50%",
          right: "-10%",
          width: "500px",
          height: "500px",
          background: "rgba(255,255,255,0.1)",
          borderRadius: "50%",
          filter: "blur(60px)"
        }} />
        
        <Container style={{ maxWidth: 1200, position: "relative", zIndex: 1 }}>
          {/* Card blanco interno para el contenido */}
          <Card 
            className="border-0 shadow-lg"
            style={{ 
              borderRadius: "20px",
              background: "rgba(255, 255, 255, 0.98)"
            }}
          >
            <Card.Body className="p-5">
              <div className="text-center">
                <div className="mb-3">
                  <div 
                    className="d-inline-flex align-items-center justify-content-center mb-3"
                    style={{
                      width: "80px",
                      height: "80px",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      borderRadius: "20px",
                      boxShadow: "0 8px 20px rgba(102, 126, 234, 0.4)"
                    }}
                  >
                    <FaRocket size={40} style={{ color: "#fff" }} />
                  </div>
                </div>
                <h1 className="display-5 fw-bold mb-3" style={{ color: "#1f2937" }}>
                  Centro de Ayuda y Soporte
                </h1>
                <p className="lead mb-4" style={{ fontSize: "1.1rem", color: "#6b7280" }}>
                  Estamos aquí para ti las 24 horas. Tu satisfacción es nuestra prioridad
                </p>
                
                {/* Badges de beneficios */}
                <div className="d-flex flex-wrap justify-content-center gap-3">
                  <Badge 
                    className="px-4 py-2"
                    style={{ 
                      fontSize: "0.9rem",
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "#fff",
                      fontWeight: 500
                    }}
                  >
                    <FaClock className="me-2" />
                    Respuesta inmediata
                  </Badge>
                  <Badge 
                    className="px-4 py-2"
                    style={{ 
                      fontSize: "0.9rem",
                      background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                      color: "#fff",
                      fontWeight: 500
                    }}
                  >
                    <FaShieldAlt className="me-2" />
                    Soporte certificado
                  </Badge>
                  <Badge 
                    className="px-4 py-2"
                    style={{ 
                      fontSize: "0.9rem",
                      background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                      color: "#fff",
                      fontWeight: 500
                    }}
                  >
                    <FaUsers className="me-2" />
                    Equipo experto
                  </Badge>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Container>
      </div>

      <Container style={{ maxWidth: 1200 }}>
        {/* Tarjetas de contacto con diseño premium */}
        <Row className="g-4 mb-5 animate__animated animate__fadeInUp">
          <Col lg={4} md={6}>
            <Card 
              className="h-100 border-0 shadow-lg hover-lift"
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-10px)";
                e.currentTarget.style.boxShadow = "0 20px 40px rgba(16, 185, 129, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.15)";
              }}
            >
              <Card.Body className="text-center text-white p-4">
                <div className="mb-3">
                  <FaPhoneAlt size={50} style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" }} />
                </div>
                <h4 className="fw-bold mb-3">Teléfono / WhatsApp</h4>
                <p className="h5 mb-4" style={{ fontWeight: 500 }}>{SOPORTE_CEL}</p>
                <div className="d-flex flex-column gap-2">
                  <Button
                    variant="light"
                    className="fw-semibold"
                    onClick={() => copyToClipboard(SOPORTE_CEL, "cel")}
                    style={{ borderRadius: "10px" }}
                  >
                    {copied.cel ? (
                      <><FaCheck className="me-2" /> ¡Copiado!</>
                    ) : (
                      <><FaCopy className="me-2" /> Copiar número</>
                    )}
                  </Button>
                  <a
                    href={`https://wa.me/${SOPORTE_WHATSAPP}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-success fw-semibold"
                    style={{ 
                      borderRadius: "10px",
                      background: "#25D366",
                      border: "none",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.2)"
                    }}
                  >
                    <FaWhatsapp className="me-2" /> Abrir WhatsApp
                  </a>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4} md={6}>
            <Card 
              className="h-100 border-0 shadow-lg"
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                transition: "transform 0.3s ease, box-shadow 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-10px)";
                e.currentTarget.style.boxShadow = "0 20px 40px rgba(59, 130, 246, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.15)";
              }}
            >
              <Card.Body className="text-center text-white p-4">
                <div className="mb-3">
                  <FaEnvelope size={50} style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" }} />
                </div>
                <h4 className="fw-bold mb-3">Correo Electrónico</h4>
                <p className="mb-4" style={{ fontSize: "0.95rem", fontWeight: 500 }}>{SOPORTE_EMAIL}</p>
                <div className="d-flex flex-column gap-2">
                  <Button
                    variant="light"
                    className="fw-semibold"
                    onClick={() => copyToClipboard(SOPORTE_EMAIL, "email")}
                    style={{ borderRadius: "10px" }}
                  >
                    {copied.email ? (
                      <><FaCheck className="me-2" /> ¡Copiado!</>
                    ) : (
                      <><FaCopy className="me-2" /> Copiar email</>
                    )}
                  </Button>
                  <a 
                    href={`mailto:${SOPORTE_EMAIL}`} 
                    className="btn btn-light fw-semibold"
                    style={{ borderRadius: "10px" }}
                  >
                    <FaEnvelope className="me-2" /> Enviar correo
                  </a>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4} md={6}>
            <Card 
              className="h-100 border-0 shadow-lg"
              style={{
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                transition: "transform 0.3s ease, box-shadow 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-10px)";
                e.currentTarget.style.boxShadow = "0 20px 40px rgba(239, 68, 68, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 10px 30px rgba(0,0,0,0.15)";
              }}
            >
              <Card.Body className="text-center text-white p-4">
                <div className="mb-3">
                  <FaMapMarkerAlt size={50} style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.1))" }} />
                </div>
                <h4 className="fw-bold mb-3">Nuestra Ubicación</h4>
                <p className="mb-4" style={{ fontSize: "0.95rem", fontWeight: 500 }}>
                  {SOPORTE_DIR}
                </p>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SOPORTE_DIR)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-light fw-semibold w-100"
                  style={{ borderRadius: "10px" }}
                >
                  <FaMapMarkerAlt className="me-2" /> Ver en mapa
                </a>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Recursos y herramientas */}
        <Row className="g-4 mb-5">
          <Col md={6}>
            <Card className="h-100 border-0 shadow-lg" style={{ borderRadius: "15px" }}>
              <Card.Body className="p-4">
                <div className="d-flex align-items-center mb-3">
                  <div 
                    className="me-3 d-flex align-items-center justify-content-center"
                    style={{
                      width: "60px",
                      height: "60px",
                      background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                      borderRadius: "15px",
                      boxShadow: "0 4px 10px rgba(245, 158, 11, 0.3)"
                    }}
                  >
                    <FaBook size={28} className="text-white" />
                  </div>
                  <div>
                    <h4 className="mb-1 fw-bold">Manual del Usuario</h4>
                    <p className="text-muted mb-0 small">Guía completa del sistema</p>
                  </div>
                </div>
                <p className="text-muted mb-4">
                  Descarga tu manual personalizado con instrucciones paso a paso para aprovechar al máximo todas las funcionalidades.
                </p>
                <Button 
                  onClick={onDescargarManual} 
                  disabled={descargando}
                  className="w-100 fw-semibold py-2"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    border: "none",
                    borderRadius: "10px",
                    boxShadow: "0 4px 10px rgba(245, 158, 11, 0.3)"
                  }}
                >
                  {descargando ? (
                    <span>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      <span>Generando PDF...</span>
                    </span>
                  ) : (
                    <span>
                      <FaDownload className="me-2" />
                      <span>Descargar Manual</span>
                    </span>
                  )}
                </Button>
              </Card.Body>
            </Card>
          </Col>

          <Col md={6}>
            <Card className="h-100 border-0 shadow-lg" style={{ borderRadius: "15px" }}>
              <Card.Body className="p-4">
                <div className="d-flex align-items-center mb-3">
                  <div 
                    className="me-3 d-flex align-items-center justify-content-center"
                    style={{
                      width: "60px",
                      height: "60px",
                      background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                      borderRadius: "15px",
                      boxShadow: "0 4px 10px rgba(139, 92, 246, 0.3)"
                    }}
                  >
                    <FaHeartbeat size={28} className="text-white" />
                  </div>
                  <div>
                    <h4 className="mb-1 fw-bold">Estado del Sistema</h4>
                    <p className="text-muted mb-0 small">Verificar conectividad</p>
                  </div>
                </div>
                <p className="text-muted mb-3">
                  Comprueba en tiempo real el estado de conexión con nuestros servidores.
                </p>
                <Button 
                  variant="outline-secondary" 
                  onClick={onProbarConexion} 
                  disabled={probando}
                  className="w-100 fw-semibold py-2 mb-3"
                  style={{ borderRadius: "10px" }}
                >
                  {probando ? (
                    <span>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      <span>Verificando...</span>
                    </span>
                  ) : (
                    <span>
                      <FaHeartbeat className="me-2" />
                      <span>Probar Conexión</span>
                    </span>
                  )}
                </Button>
                {estadoAPI && (
                  <Alert 
                    variant={estadoAPI === "ok" ? "success" : "danger"}
                    className="mb-0 animate__animated animate__fadeIn"
                    style={{ borderRadius: "10px" }}
                  >
                    {estadoMsg}
                  </Alert>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* FAQ - Preguntas Frecuentes */}
        {FAQS.length > 0 && (
          <Card className="border-0 shadow-lg mb-5" style={{ borderRadius: "15px" }}>
            <Card.Body className="p-4">
              <div className="d-flex align-items-center mb-4">
                <div 
                  className="me-3 d-flex align-items-center justify-content-center"
                  style={{
                    width: "60px",
                    height: "60px",
                    background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
                    borderRadius: "15px",
                    boxShadow: "0 4px 10px rgba(6, 182, 212, 0.3)"
                  }}
                >
                  <FaQuestionCircle size={28} className="text-white" />
                </div>
                <div>
                  <h4 className="mb-1 fw-bold">Preguntas Frecuentes</h4>
                  <p className="text-muted mb-0 small">Encuentra respuestas rápidas</p>
                </div>
              </div>
              <Accordion alwaysOpen>
                {FAQS.map((f, idx) => (
                  <Accordion.Item 
                    eventKey={String(idx)} 
                    key={idx}
                    style={{ 
                      border: "none",
                      marginBottom: "10px",
                      borderRadius: "10px",
                      overflow: "hidden",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
                    }}
                  >
                    <Accordion.Header style={{ borderRadius: "10px" }}>
                      <strong>{f.q}</strong>
                    </Accordion.Header>
                    <Accordion.Body style={{ background: "#f8f9fa" }}>
                      {f.a}
                    </Accordion.Body>
                  </Accordion.Item>
                ))}
              </Accordion>
            </Card.Body>
          </Card>
        )}

        {/* Notas e Historial */}
        <Row className="g-4 mb-5">
          {/* Notas */}
          <Col lg={6}>
            <Card className="border-0 shadow-lg h-100" style={{ borderRadius: "15px" }}>
              <Card.Body className="p-4">
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <div className="d-flex align-items-center">
                    <div 
                      className="me-3 d-flex align-items-center justify-content-center"
                      style={{
                        width: "50px",
                        height: "50px",
                        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                        borderRadius: "12px",
                        boxShadow: "0 4px 10px rgba(245, 158, 11, 0.3)"
                      }}
                    >
                      <FaStickyNote size={24} className="text-white" />
                    </div>
                    <div>
                      <h5 className="mb-0 fw-bold">Mis Notas</h5>
                      <p className="text-muted mb-0 small">Recordatorios personales</p>
                    </div>
                  </div>
                  <Badge bg="primary" pill style={{ fontSize: "1rem", padding: "8px 12px" }}>
                    {notas.length}
                  </Badge>
                </div>

                <Form.Group className="mb-3">
                  <Form.Control
                    as="textarea"
                    rows={4}
                    placeholder="Escribe tus notas o recordatorios aquí..."
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    style={{ 
                      borderRadius: "10px",
                      border: "2px solid #e5e7eb",
                      resize: "none"
                    }}
                  />
                </Form.Group>
                
                <Button 
                  onClick={agregarNota} 
                  disabled={!nota.trim()}
                  className="w-100 fw-semibold py-2 mb-3"
                  style={{
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    border: "none",
                    borderRadius: "10px"
                  }}
                >
                  <FaCheck className="me-2" />
                  Guardar Nota
                </Button>

                {notas.length > 0 ? (
                  <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                    {notas.map((n, i) => (
                      <div 
                        key={n.id}
                        className="mb-2 p-3 animate__animated animate__fadeIn"
                        style={{
                          background: "#f8f9fa",
                          borderRadius: "10px",
                          border: "1px solid #e5e7eb"
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <Badge bg="secondary" className="mb-2 small">
                              {fmtFecha(n.fecha)}
                            </Badge>
                            <p className="mb-0 text-dark">
                              {n.txt}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => borrarNota(n.id)}
                            title="Eliminar nota"
                            style={{ borderRadius: "8px" }}
                          >
                            <FaTrashAlt />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert variant="info" className="text-center" style={{ borderRadius: "10px" }}>
                    <FaStickyNote className="me-2" />
                    Aún no has guardado ninguna nota
                  </Alert>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* Historial */}
          <Col lg={6}>
            <Card className="border-0 shadow-lg h-100" style={{ borderRadius: "15px" }}>
              <Card.Body className="p-4">
                <div className="d-flex align-items-center justify-content-between mb-4">
                  <div className="d-flex align-items-center">
                    <div 
                      className="me-3 d-flex align-items-center justify-content-center"
                      style={{
                        width: "50px",
                        height: "50px",
                        background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                        borderRadius: "12px",
                        boxShadow: "0 4px 10px rgba(139, 92, 246, 0.3)"
                      }}
                    >
                      <FaHistory size={24} className="text-white" />
                    </div>
                    <div>
                      <h5 className="mb-0 fw-bold">Historial</h5>
                      <p className="text-muted mb-0 small">Tus actividades recientes</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => {
                      localStorage.removeItem("soporte_historial");
                      setHist([]);
                    }}
                    style={{ borderRadius: "8px" }}
                  >
                    Limpiar
                  </Button>
                </div>

                {hist.length > 0 ? (
                  <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                    {hist.map((h, i) => (
                      <div 
                        key={h.id}
                        className="mb-2 p-3 animate__animated animate__fadeIn"
                        style={{
                          background: "#f8f9fa",
                          borderRadius: "10px",
                          border: "1px solid #e5e7eb"
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <Badge
                            bg={
                              h.tipo === "copiar"
                                ? "secondary"
                                : h.tipo === "descargar"
                                ? "primary"
                                : "info"
                            }
                            style={{ fontSize: "0.75rem" }}
                          >
                            {h.tipo.toUpperCase()}
                          </Badge>
                          <small className="text-muted">{fmtFecha(h.fecha)}</small>
                        </div>
                        <p className="mb-0 text-dark small">{h.detalle}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert variant="info" className="text-center" style={{ borderRadius: "10px" }}>
                    <FaHistory className="me-2" />
                    Sin actividades registradas
                  </Alert>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Footer informativo */}
        <Alert 
          variant="light" 
          className="text-center border-0 shadow-lg mb-0 animate__animated animate__fadeIn"
          style={{ 
            borderRadius: "15px",
            background: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(249,250,251,0.9) 100%)",
            padding: "30px"
          }}
        >
          <h5 className="fw-bold mb-3">¿Necesitas más ayuda?</h5>
          <p className="text-muted mb-0">
            Nuestro equipo de soporte está disponible para asistirte. Contáctanos por cualquiera de los medios mostrados arriba.
          </p>
        </Alert>
      </Container>
    </div>
  );
}
