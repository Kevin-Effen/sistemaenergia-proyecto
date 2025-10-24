// src/components/Navbar.js
import React, { useState, useEffect } from "react";
import {
  Navbar,
  Nav,
  Container,
  NavDropdown,
  Offcanvas,
  Button,
  Modal,
  Spinner,
  Badge,
} from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";
import logger from "../utils/logger";
import "animate.css";
import "../styles/navbar-simple.css";

function NavBarComponent({ usuario: usuarioProp, onLogout }) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [bgIndex, setBgIndex] = useState(0);
  const [me, setMe] = useState(null);                   // /me-detalle
  const [loadingMe, setLoadingMe] = useState(true);
  const [showPerfil, setShowPerfil] = useState(false);  // Modal "Mi perfil"
  const [alertasCount, setAlertasCount] = useState(0);  // Contador de alertas

  const paisajes = ["/paisaje1.jpg", "/paisaje3.png", "/paisaje2.jpg"];
  const location = useLocation();
  const isLoginPage = location.pathname === "/" || location.pathname === "/login";

  const rolLS = (localStorage.getItem("rol") || "").toLowerCase();

  useEffect(() => {
    const interval = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % paisajes.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Cargar detalle del usuario
  useEffect(() => {
    let cancel = false;
    const cargar = async () => {
      try {
        setLoadingMe(true);
        const res = await api.get("/me-detalle");
        if (!cancel) {
          setMe(res.data);
          setLoadingMe(false);
        }
      } catch (e) {
        logger.error("Error cargando /me-detalle:", e);
        if (!cancel) {
          // Si hay error, usar datos de localStorage como fallback
          setLoadingMe(false);
          if (e?.response?.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("rol");
            localStorage.removeItem("usuario");
            navigate("/", { replace: true });
          }
        }
      }
    };
    if (!isLoginPage && localStorage.getItem("token")) {
      cargar();
    } else {
      setLoadingMe(false);
    }
    return () => { cancel = true; };
  }, [isLoginPage, navigate]);

  // Cargar contador de alertas
  useEffect(() => {
    let cancel = false;
    const cargarAlertas = async () => {
      try {
        const res = await api.get("/alertas");
        if (!cancel && Array.isArray(res.data)) {
          setAlertasCount(res.data.length);
        }
      } catch (e) {
        // Silenciar error, no es crítico
      }
    };
    if (!isLoginPage && localStorage.getItem("token")) {
      cargarAlertas();
      // Actualizar cada 30 segundos
      const interval = setInterval(cargarAlertas, 30000);
      return () => {
        cancel = true;
        clearInterval(interval);
      };
    }
    return () => { cancel = true; };
  }, [isLoginPage]);

  // Fallbacks
  let datosUsuarioLS = {};
  try { datosUsuarioLS = JSON.parse(localStorage.getItem("usuario") || "{}"); } catch { datosUsuarioLS = {}; }

  const rol = (me?.rol || datosUsuarioLS?.rol || rolLS || "").toLowerCase();
  
  // Nombre a mostrar: prioriza los datos cargados, luego localStorage
  const displayName =
    usuarioProp ||
    me?.nombre_completo ||
    datosUsuarioLS?.nombre ||
    datosUsuarioLS?.usuario ||
    me?.login ||
    datosUsuarioLS?.login ||
    "Usuario";
  
  // Solo mostrar "Cargando..." si realmente está cargando Y no hay datos en localStorage
  const shouldShowLoading = loadingMe && !datosUsuarioLS?.nombre && !datosUsuarioLS?.usuario;

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
    return (first + last).toUpperCase() || "U";
  };

  const handleClose = () => setShowMenu(false);
  const handleShow = () => setShowMenu(true);
  const openPerfil = () => setShowPerfil(true);
  const closePerfil = () => setShowPerfil(false);

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem("token");
      localStorage.removeItem("rol");
      localStorage.removeItem("usuario");
      window.dispatchEvent(new Event("auth-changed"));
      navigate("/", { replace: true });
    }
  };

  const fmtFecha = (f) => {
    try {
      if (!f) return "—";
      const d = new Date(f);
      if (isNaN(d.getTime())) return String(f).split("T")[0] || "—";
      return d.toLocaleDateString();
    } catch { return "—"; }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text || "");
    } catch { /* no-op */ }
  };

  return (
    <>
      {/* Header Profesional con Navbar Centrado */}
      <header className="header-profesional-v2 shadow-lg animate__animated animate__fadeInDown">
        <Container fluid>
          {/* Logo y Título */}
          <div className="header-brand-section">
            <div className="logo-circle">
              <i className="bi bi-wind"></i>
            </div>
            <div className="brand-text">
              <h1 className="brand-title">Sistema Eólico</h1>
              <p className="brand-subtitle">Monitoreo Inteligente</p>
            </div>
          </div>

          {/* Navegación Centrada (Desktop) */}
          {!isLoginPage && (
            <nav className="navbar-center d-none d-lg-flex">
              <Nav className="nav-links-center">
                <Nav.Link 
                  as={Link} 
                  to="/dashboard" 
                  className={`nav-item-modern ${location.pathname === '/dashboard' ? 'active' : ''}`}
                >
                  <i className="bi bi-house-door-fill"></i>
                  <span>Principal</span>
                </Nav.Link>
                
                <Nav.Link 
                  as={Link} 
                  to="/graficos" 
                  className={`nav-item-modern ${location.pathname === '/graficos' ? 'active' : ''}`}
                >
                  <i className="bi bi-graph-up"></i>
                  <span>Gráficos</span>
                </Nav.Link>

                {rol === "usuario" && (
                  <Nav.Link 
                    as={Link} 
                    to="/contactos" 
                    className={`nav-item-modern ${location.pathname === '/contactos' ? 'active' : ''}`}
                  >
                    <i className="bi bi-people-fill"></i>
                    <span>Contactos</span>
                  </Nav.Link>
                )}

                {rol === "administrador" && (
                  <>
                    <Nav.Link 
                      as={Link} 
                      to="/usuarios" 
                      className={`nav-item-modern ${location.pathname === '/usuarios' ? 'active' : ''}`}
                    >
                      <i className="bi bi-person-badge-fill"></i>
                      <span>Usuarios</span>
                    </Nav.Link>
                    
                    <Nav.Link 
                      as={Link} 
                      to="/eolicos" 
                      className={`nav-item-modern ${location.pathname === '/eolicos' ? 'active' : ''}`}
                    >
                      <i className="bi bi-clipboard-check-fill"></i>
                      <span>Alquiler</span>
                    </Nav.Link>
                    
                    <Nav.Link 
                      as={Link} 
                      to="/reportes" 
                      className={`nav-item-modern ${location.pathname === '/reportes' ? 'active' : ''}`}
                    >
                      <i className="bi bi-file-earmark-pdf-fill"></i>
                      <span>Reportes</span>
                    </Nav.Link>
                  </>
                )}

                <Nav.Link 
                  as={Link} 
                  to="/alertas" 
                  className={`nav-item-modern ${location.pathname === '/alertas' ? 'active' : ''}`}
                >
                  <i className="bi bi-bell-fill"></i>
                  <span>{rol === "administrador" ? "Alertas" : "Mis Alertas"}</span>
                  {alertasCount > 0 && (
                    <Badge bg="danger" className="alert-badge">
                      {alertasCount}
                    </Badge>
                  )}
                </Nav.Link>
              </Nav>
            </nav>
          )}

          {/* Usuario (Desktop) */}
          {!isLoginPage && (
            <div className="header-user-section d-none d-lg-flex">
              <NavDropdown
                align="end"
                title={
                  <div className="user-dropdown-modern">
                    <div className="user-avatar-modern">
                      {getInitials(displayName)}
                    </div>
                    <div className="user-details">
                      <span className="user-name-modern">{shouldShowLoading ? "Cargando..." : displayName}</span>
                      <span className="user-role-modern">{rol === "administrador" ? "Admin" : "Usuario"}</span>
                    </div>
                    <i className="bi bi-chevron-down"></i>
                  </div>
                }
                id="user-nav-dropdown"
              >
                <NavDropdown.Item onClick={openPerfil}>
                  <i className="bi bi-person-circle me-2"></i>
                  Mi perfil
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogoutClick}>
                  <i className="bi bi-box-arrow-right me-2"></i>
                  Cerrar sesión
                </NavDropdown.Item>
              </NavDropdown>
            </div>
          )}

          {/* Botón hamburguesa (Mobile) */}
          {!isLoginPage && (
            <Button
              variant="light"
              onClick={handleShow}
              className="btn-hamburguesa d-lg-none"
              aria-label="Abrir menú"
            >
              <i className="bi bi-list"></i>
            </Button>
          )}
        </Container>
      </header>

      {/* Menú lateral (mobile) */}
      {!isLoginPage && (
        <Offcanvas show={showMenu} onHide={handleClose} placement="end" style={{ width: "240px" }}>
          <Offcanvas.Header closeButton>
            <Offcanvas.Title>Menú</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body>
            <Nav className="flex-column">
              <Nav.Link as={Link} to="/dashboard" onClick={handleClose} className="nav-item-hover">
                Principal
              </Nav.Link>
              <Nav.Link as={Link} to="/graficos" onClick={handleClose} className="nav-item-hover">
                Gráficos
              </Nav.Link>

              {rol === "usuario" && (
                <Nav.Link as={Link} to="/contactos" onClick={handleClose} className="nav-item-hover">
                  Contactos
                </Nav.Link>
              )}

              {rol === "administrador" && (
                <>
                  <Nav.Link as={Link} to="/usuarios" onClick={handleClose} className="nav-item-hover">
                    Usuarios
                  </Nav.Link>
                  <Nav.Link as={Link} to="/eolicos" onClick={handleClose} className="nav-item-hover">
                    Alquiler
                  </Nav.Link>
                  <Nav.Link as={Link} to="/reportes" onClick={handleClose} className="nav-item-hover">
                    Reportes PDF
                  </Nav.Link>
                  <Nav.Link 
                    as={Link} 
                    to="/alertas" 
                    onClick={handleClose} 
                    className="nav-item-hover d-flex align-items-center justify-content-between"
                  >
                    <span>
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      Alertas Globales
                    </span>
                    {alertasCount > 0 && (
                      <Badge bg="danger" className="animate__animated animate__pulse animate__infinite">
                        {alertasCount}
                      </Badge>
                    )}
                  </Nav.Link>
                </>
              )}

              {rol === "usuario" && (
                <Nav.Link 
                  as={Link} 
                  to="/alertas" 
                  onClick={handleClose} 
                  className="nav-item-hover d-flex align-items-center justify-content-between"
                >
                  <span>
                    <i className="bi bi-bell-fill me-2"></i>
                    Mis Alertas
                  </span>
                  {alertasCount > 0 && (
                    <Badge bg="warning" text="dark" className="animate__animated animate__pulse animate__infinite">
                      {alertasCount}
                    </Badge>
                  )}
                </Nav.Link>
              )}

              <NavDropdown
                title={
                  <span className="d-inline-flex align-items-center">
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg,#22c55e,#16a34a)",
                        color: "white",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        marginRight: 8,
                      }}
                    >
                      {getInitials(displayName)}
                    </span>
                    {shouldShowLoading ? "Cargando..." : displayName}
                  </span>
                }
                id="user-nav-dropdown"
                className="mt-2"
              >
                <NavDropdown.Item
                  onClick={() => {
                    handleClose();
                    openPerfil();
                  }}
                >
                  Mi perfil
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item
                  onClick={() => {
                    handleClose();
                    handleLogoutClick();
                  }}
                >
                  Cerrar sesión
                </NavDropdown.Item>
              </NavDropdown>
            </Nav>
          </Offcanvas.Body>
        </Offcanvas>
      )}

      {/* Modal Mi Perfil (fullscreen en móviles) */}
      <Modal
        show={showPerfil}
        onHide={closePerfil}
        centered
        dialogClassName="modal-fullscreen-sm-down"
      >
        <div className="position-relative">
          {/* Cover */}
          <div
            style={{
              height: 140,
              background:
                "linear-gradient(135deg, rgba(34,197,94,0.9), rgba(16,185,129,0.9)), url('/paisaje2.jpg') center/cover",
              borderTopLeftRadius: ".3rem",
              borderTopRightRadius: ".3rem",
            }}
          />
          {/* Avatar */}
          <div
            style={{
              position: "absolute",
              top: 90,
              left: 24,
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#22c55e,#16a34a)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              boxShadow: "0 6px 18px rgba(0,0,0,.2)",
              border: "3px solid white",
            }}
          >
            {getInitials(displayName)}
          </div>
        </div>

        <Modal.Header closeButton className="pt-4" />

        <Modal.Body>
          {/* Header info */}
          <div className="d-flex flex-wrap align-items-end gap-2 ps-2" style={{ marginTop: -32 }}>
            <div className="me-auto" style={{ minWidth: 0 }}>
              <div className="fw-bold" style={{ fontSize: 18 }}>
                {shouldShowLoading ? (
                  <span className="text-muted">
                    <Spinner animation="grow" size="sm" /> Cargando…
                  </span>
                ) : (
                  me?.nombre_completo || displayName
                )}
              </div>
              {/* login puede ser largo: permitir quiebre */}
              <div
                className="text-muted small text-break"
                style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
              >
                {me?.login || "—"}
              </div>
            </div>
            {rol && (
              <Badge bg={rol === "administrador" ? "danger" : "success"} pill>
                {rol.charAt(0).toUpperCase() + rol.slice(1)}
              </Badge>
            )}
          </div>

          {/* Datos */}
          <div className="row g-3 mt-2">
            <div className="col-12 col-md-6">
              <div className="border rounded px-3 py-2 h-100">
                <div className="d-flex justify-content-between align-items-center" style={{ gap: 8 }}>
                  {/* minWidth:0 para que funcione el truncado/quiebre dentro de flex */}
                  <div style={{ minWidth: 0 }}>
                    <div className="text-muted small">Usuario (login)</div>
                    <div
                      className="fw-semibold text-break"
                      style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                    >
                      {me?.login || "—"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => copy(me?.login)}
                    title="Copiar"
                  >
                    Copiar
                  </Button>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-6">
              <div className="border rounded px-3 py-2 h-100">
                <div className="d-flex justify-content-between align-items-center" style={{ gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="text-muted small">Email</div>
                    <div
                      className="fw-semibold text-break"
                      style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                    >
                      {me?.email || "—"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => copy(me?.email)}
                    title="Copiar"
                  >
                    Copiar
                  </Button>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-6">
              <div className="border rounded px-3 py-2 h-100">
                <div className="text-muted small">Fecha de nacimiento</div>
                <div className="fw-semibold">{fmtFecha(me?.fecha_nacimiento)}</div>
              </div>
            </div>

            <div className="col-12 col-md-6">
              <div className="border rounded px-3 py-2 h-100">
                <div className="text-muted small">Teléfono</div>
                <div className="fw-semibold">{me?.telefono || "—"}</div>
              </div>
            </div>

            <div className="col-12">
              <div className="border rounded px-3 py-2 h-100">
                <div className="text-muted small">Dirección</div>
                <div
                  className="fw-semibold text-break"
                  style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}
                >
                  {me?.direccion || "—"}
                </div>
              </div>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer className="d-flex justify-content-between">
          <div className="text-muted small">
            {me?.email ? "Tus datos se muestran solo a ti." : ""}
          </div>
          <Button variant="secondary" onClick={closePerfil}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      <style>{`
        /* ========== HEADER PROFESIONAL ========== */
        .header-profesional {
          background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 50%, #1e293b 100%);
          color: white;
          position: sticky;
          top: 0;
          z-index: 1030;
          border-bottom: 3px solid #22c55e;
        }

        .header-top {
          padding: 1rem 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .logo-wind {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          width: 60px;
          height: 60px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
          animation: rotateWind 8s linear infinite;
        }

        @keyframes rotateWind {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(10deg); }
        }

        .header-title-wrapper {
          flex: 1;
          min-width: 200px;
        }

        .header-title {
          font-size: clamp(1.25rem, 3vw, 2rem);
          font-weight: 700;
          color: white;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          letter-spacing: -0.5px;
        }

        .header-subtitle {
          font-size: clamp(0.75rem, 1.5vw, 0.95rem);
          color: rgba(255, 255, 255, 0.85);
          font-weight: 400;
          margin-top: 0.25rem;
        }

        /* User Avatar Dropdown */
        .user-dropdown-trigger {
          padding: 0.5rem 1rem;
          border-radius: 50px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .user-dropdown-trigger:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-1px);
        }

        .user-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 600;
          margin-right: 0.75rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .user-info {
          display: flex;
          flex-direction: column;
          text-align: left;
        }

        .user-name {
          font-size: 0.95rem;
          font-weight: 600;
          color: white;
          line-height: 1.2;
        }

        .user-role {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.75);
          line-height: 1.2;
        }

        /* Navegación */
        .navbar-navegacion {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding: 0.75rem 0;
          margin-top: 0.5rem;
        }

        .nav-profesional {
          display: flex;
          align-items: center;
        }

        .nav-link-profesional {
          color: rgba(255, 255, 255, 0.9) !important;
          padding: 0.5rem 1rem !important;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 500;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          white-space: nowrap;
        }

        .nav-link-profesional:hover {
          background: rgba(255, 255, 255, 0.15);
          color: white !important;
          transform: translateY(-2px);
        }

        .nav-link-profesional.active {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e !important;
        }

        /* Badge con animación */
        .badge-pulse {
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }

        /* Botón hamburguesa mejorado */
        .boton-hamburguesa {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 1050;
          background: rgba(255, 255, 255, 0.95) !important;
          border: none !important;
          border-radius: 12px !important;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          color: #1e3a8a !important;
        }

        .boton-hamburguesa:hover {
          background: white !important;
          transform: scale(1.05);
        }

        /* Responsive */
        @media (max-width: 991px) {
          .header-top {
            padding: 0.75rem 0;
          }

          .logo-wind {
            width: 50px;
            height: 50px;
            font-size: 1.75rem;
          }

          .header-title {
            font-size: 1.25rem;
          }

          .header-subtitle {
            font-size: 0.75rem;
          }
        }

        @media (max-width: 576px) {
          .header-title {
            font-size: 1rem;
          }

          .header-subtitle {
            display: none;
          }

          .logo-wind {
            width: 45px;
            height: 45px;
          }
        }

        /* Ajustes del modal en pantallas pequeñas */
        @media (max-width: 576px) {
          .modal-fullscreen-sm-down .modal-body { 
            padding-top: .5rem; 
          }
        }

        /* Dropdown personalizado */
        .user-dropdown .dropdown-menu {
          border: none;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          border-radius: 12px;
          margin-top: 0.5rem;
          padding: 0.5rem;
        }

        .user-dropdown .dropdown-item {
          border-radius: 8px;
          padding: 0.6rem 1rem;
          transition: all 0.2s;
        }

        .user-dropdown .dropdown-item:hover {
          background: #f3f4f6;
        }

        /* ========================================
           NUEVO NAVBAR PROFESIONAL V2
           ======================================== */
        
        .header-profesional-v2 {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          position: sticky;
          top: 0;
          z-index: 1000;
          border-bottom: 2px solid rgba(255, 255, 255, 0.2);
        }

        .header-profesional-v2 .container-fluid {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 2rem;
          padding: 1rem 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }

        /* Logo y Brand */
        .header-brand-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .logo-circle {
          width: 55px;
          height: 55px;
          background: linear-gradient(135deg, #ffffff 0%, #e0f2fe 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          transition: transform 0.3s ease;
        }

        .logo-circle:hover {
          transform: rotate(360deg) scale(1.05);
        }

        .logo-circle i {
          font-size: 2rem;
          background: linear-gradient(135deg, #1e40af, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .brand-text {
          display: flex;
          flex-direction: column;
        }

        .brand-title {
          color: white;
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
          line-height: 1.2;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }

        .brand-subtitle {
          color: rgba(255, 255, 255, 0.9);
          font-size: 0.85rem;
          margin: 0;
          font-weight: 400;
        }

        /* Navegación Centrada */
        .navbar-center {
          justify-content: center;
        }

        .nav-links-center {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          padding: 0.5rem;
          border-radius: 50px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }

        .nav-item-modern {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1.2rem;
          border-radius: 25px;
          color: white !important;
          font-weight: 500;
          font-size: 0.95rem;
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          border: 2px solid transparent;
        }

        .nav-item-modern i {
          font-size: 1.1rem;
          transition: transform 0.3s ease;
        }

        .nav-item-modern:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
          color: white !important;
        }

        .nav-item-modern:hover i {
          transform: scale(1.2);
        }

        /* Item activo con efecto especial */
        .nav-item-modern.active {
          background: linear-gradient(135deg, #ffffff 0%, #e0f2fe 100%);
          color: #1e40af !important;
          font-weight: 600;
          border: 2px solid white;
          box-shadow: 0 4px 15px rgba(255, 255, 255, 0.3), 
                      0 0 20px rgba(255, 255, 255, 0.2);
          animation: activeGlow 2s ease-in-out infinite;
        }

        .nav-item-modern.active i {
          color: #1e40af;
          animation: iconBounce 1s ease infinite;
        }

        @keyframes activeGlow {
          0%, 100% { box-shadow: 0 4px 15px rgba(255, 255, 255, 0.3), 0 0 20px rgba(255, 255, 255, 0.2); }
          50% { box-shadow: 0 6px 20px rgba(255, 255, 255, 0.5), 0 0 30px rgba(255, 255, 255, 0.4); }
        }

        @keyframes iconBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }

        /* Badge de alertas */
        .alert-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          font-size: 0.7rem;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          animation: pulseBadge 1.5s ease-in-out infinite;
        }

        @keyframes pulseBadge {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }

        /* Usuario Dropdown Modern */
        .header-user-section {
          display: flex;
          align-items: center;
        }

        .user-dropdown-modern {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 1rem;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 50px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .user-dropdown-modern:hover {
          background: rgba(255, 255, 255, 0.25);
          border-color: white;
          transform: scale(1.02);
        }

        .user-avatar-modern {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 1.1rem;
          border: 3px solid white;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        }

        .user-details {
          display: flex;
          flex-direction: column;
          line-height: 1.2;
        }

        .user-name-modern {
          color: white;
          font-weight: 600;
          font-size: 0.95rem;
        }

        .user-role-modern {
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.8rem;
        }

        .user-dropdown-modern i {
          color: white;
          font-size: 0.9rem;
        }

        /* Botón hamburguesa mobile */
        .btn-hamburguesa {
          width: 45px;
          height: 45px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.2) !important;
          border: 2px solid white !important;
          color: white !important;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .btn-hamburguesa:hover {
          background: white !important;
          color: #1e40af !important;
          transform: scale(1.1);
        }

        .btn-hamburguesa i {
          font-size: 1.5rem;
        }

        /* Responsive */
        @media (max-width: 991px) {
          .header-profesional-v2 .container-fluid {
            grid-template-columns: 1fr auto;
            gap: 1rem;
            padding: 1rem;
          }

          .brand-title {
            font-size: 1.2rem;
          }

          .brand-subtitle {
            font-size: 0.75rem;
          }

          .logo-circle {
            width: 45px;
            height: 45px;
          }

          .logo-circle i {
            font-size: 1.5rem;
          }
        }

        @media (max-width: 576px) {
          .brand-title {
            font-size: 1rem;
          }

          .brand-subtitle {
            display: none;
          }

          .logo-circle {
            width: 40px;
            height: 40px;
          }

          .header-brand-section {
            gap: 0.5rem;
          }
        }
      `}</style>
    </>
  );
}

export default NavBarComponent;
