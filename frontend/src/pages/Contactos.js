// src/pages/Contactos.jsx
import React, { useEffect, useState } from "react";
import {
  Card,
  Button,
  Row,
  Col,
  Table,
  Badge,
  Accordion,
} from "react-bootstrap";
import {
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaCopy,
  FaCheck,
  FaTrashAlt,
} from "react-icons/fa";
import api from "../api/axios";

// Datos de soporte
const SOPORTE_EMAIL = "countableuncountable@gmail.com";
const SOPORTE_CEL = "+59172641958";
const SOPORTE_DIR = "Calle Manuel Virreira #0077, Cochabamba, Bolivia";

// Archivo PDF
const MANUAL_URL = "/manual_usuario.pdf";

// FAQS
const FAQS = [
  { q: "¿Cómo veo mis lecturas y gráficas?", a: "Entra a tu Dashboard de usuario." },
  { q: "¿Qué significa 'Batería baja'?", a: "Que tu batería está bajo el 20%." },
  { q: "¿Puedo exportar mis datos?", a: "Sí, el administrador puede generar reportes CSV y PDF." },
  { q: "¿No puedo iniciar sesión?", a: "Usa 'Olvidaste tu contraseña' en la pantalla de acceso." },
];

// Formato fecha
const fmtFecha = (iso) => (iso ? new Date(iso).toLocaleString() : "—");

export default function Contactos() {
  const [copied, setCopied] = useState({ email: false, cel: false });

  const [nota, setNota] = useState("");
  const [notas, setNotas] = useState([]);
  const [hist, setHist] = useState([]);

  // Cargar notas e historial desde localStorage
  useEffect(() => {
    try {
      const guardadas = JSON.parse(localStorage.getItem("mis_notas_soporte") || "[]");
      if (Array.isArray(guardadas)) setNotas(guardadas);
    } catch {}
    try {
      const h = JSON.parse(localStorage.getItem("soporte_historial") || "[]");
      if (Array.isArray(h)) setHist(h);
    } catch {}
  }, []);

  // Guardar en historial
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
    <div style={{ backgroundColor: "#f8f9fa", minHeight: "100vh", padding: "40px 20px" }}>
      <div className="container" style={{ maxWidth: 1024 }}>
        <h2 className="text-center mb-4 text-primary">🛠️ Centro de Ayuda — Sistema Eólico</h2>

        {/* Contacto de soporte */}
        <Card className="mb-4 shadow-sm border-0">
          <Card.Body>
            <h5 className="mb-3">Contacto de soporte</h5>
            <ul className="list-unstyled mb-0">
              <li className="mb-2">
                <FaPhoneAlt className="me-2 text-success" /> <strong>Teléfono:</strong> {SOPORTE_CEL}{" "}
                <Button size="sm" variant="outline-secondary" className="ms-2" onClick={() => copyToClipboard(SOPORTE_CEL, "cel")}>
                  {copied.cel ? <FaCheck className="me-1" /> : <FaCopy className="me-1" />} Copiar
                </Button>
              </li>
              <li className="mb-2">
                <FaEnvelope className="me-2 text-danger" /> <strong>Email:</strong> {SOPORTE_EMAIL}{" "}
                <Button size="sm" variant="outline-secondary" className="ms-2" onClick={() => copyToClipboard(SOPORTE_EMAIL, "email")}>
                  {copied.email ? <FaCheck className="me-1" /> : <FaCopy className="me-1" />} Copiar
                </Button>
              </li>
              <li>
                <FaMapMarkerAlt className="me-2 text-primary" /> <strong>Dirección:</strong> {SOPORTE_DIR}
              </li>
            </ul>
          </Card.Body>
        </Card>

       

        {/* FAQ */}
        {FAQS.length > 0 && (
          <Card className="mb-4 shadow-sm border-0">
            <Card.Body>
              <h5 className="mb-3">Preguntas frecuentes</h5>
              <Accordion alwaysOpen>
                {FAQS.map((f, idx) => (
                  <Accordion.Item eventKey={String(idx)} key={idx}>
                    <Accordion.Header>{f.q}</Accordion.Header>
                    <Accordion.Body>{f.a}</Accordion.Body>
                  </Accordion.Item>
                ))}
              </Accordion>
            </Card.Body>
          </Card>
        )}

        {/* Notas + Historial */}
        <Row className="g-3">
          {/* Notas */}
          <Col md={6}>
            <Card className="shadow-sm border-0 h-100">
              <Card.Body>
                <h5 className="mb-3">Mis notas (solo este navegador)</h5>
                <textarea
                  className="form-control"
                  rows={6}
                  placeholder="Escribe aquí recordatorios..."
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                />
                <div className="d-flex justify-content-end mt-2">
                  <Button variant="primary" onClick={agregarNota} disabled={!nota.trim()}>
                    Guardar nota
                  </Button>
                </div>

                {notas.length > 0 && (
                  <Table bordered hover size="sm" className="align-middle mt-3">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Fecha</th>
                        <th>Nota</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {notas.map((n, i) => (
                        <tr key={n.id}>
                          <td>{i + 1}</td>
                          <td>{fmtFecha(n.fecha)}</td>
                          <td className="text-muted">{n.txt.length > 80 ? n.txt.slice(0, 80) + "…" : n.txt}</td>
                          <td>
                            <Button size="sm" variant="outline-danger" onClick={() => borrarNota(n.id)}>
                              <FaTrashAlt />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}

                {notas.length === 0 && <p className="text-muted mt-3 mb-0">Aún no guardaste notas.</p>}
              </Card.Body>
            </Card>
          </Col>

          {/* Historial */}
          <Col md={6}>
            <Card className="shadow-sm border-0 h-100">
              <Card.Body>
                <h5 className="mb-3">Historial de acciones</h5>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => {
                    localStorage.removeItem("soporte_historial");
                    setHist([]);
                  }}
                  className="mb-2"
                >
                  Limpiar
                </Button>

                {hist.length > 0 && (
                  <Table bordered hover size="sm" className="align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>#</th>
                        <th>Fecha</th>
                        <th>Acción</th>
                        <th>Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hist.map((h, i) => (
                        <tr key={h.id}>
                          <td>{i + 1}</td>
                          <td>{fmtFecha(h.fecha)}</td>
                          <td>
                            <Badge
                              bg={
                                h.tipo === "copiar"
                                  ? "secondary"
                                  : h.tipo === "descargar"
                                  ? "primary"
                                  : "info"
                              }
                            >
                              {h.tipo}
                            </Badge>
                          </td>
                          <td>{h.detalle}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}

                {hist.length === 0 && <p className="text-muted mb-0">Sin acciones aún.</p>}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}
