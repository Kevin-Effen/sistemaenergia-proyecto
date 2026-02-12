// src/pages/AlertasPage.js
import React from "react";
import AlertasDashboard from "../components/AlertasDashboard";
import { Card } from "react-bootstrap";

function AlertasPage() {
  const rol = (localStorage.getItem("rol") || "").toLowerCase();
  
  const titulo = rol === 'administrador' 
    ? "📊 Alertas del Sistema - Vista Global"
    : "🔔 Mis Alertas - Equipos Asignados";
  
  const descripcion = rol === 'administrador'
    ? "Monitoreo de todos los equipos eólicos del sistema"
    : "Notificaciones y alertas de tus equipos asignados";

  const icono = rol === 'administrador' 
    ? "bi-exclamation-triangle-fill text-danger"
    : "bi-bell-fill text-warning";

  return (
    <div className="container-fluid p-4">
      {/* Encabezado contextual */}
      <Card className="mb-4 shadow-sm">
        <Card.Body className="py-3">
          <div className="d-flex align-items-center">
            <i className={`bi ${icono} fs-1 me-3`}></i>
            <div>
              <h2 className="mb-1">{titulo}</h2>
              <p className="text-muted mb-0">
                <i className="bi bi-info-circle me-1"></i>
                {descripcion}
              </p>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Componente de alertas */}
      <AlertasDashboard />
    </div>
  );
}

export default AlertasPage;
