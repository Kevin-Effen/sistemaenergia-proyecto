// src/App.js
import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";

import Login from "./pages/Login";
import DashboardAdmin from "./pages/DashboardAdmin";
import DashboardUsuario from "./pages/DashboardUsuario";
import Usuarios from "./pages/Usuarios";
import Contactos from "./pages/Contactos";
import AlertasPage from "./pages/AlertasPage";
import Graficos from "./components/Graficos";
import Reportes from "./pages/Reportes";
import Mensajes from "./pages/Mensajes";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import UsuarioDetalle from "./pages/UsuarioDetalle";
import MonitoreoAdmin from "./pages/MonitoreoAdmin";
import Eolicos from "./pages/Eolicos"; // módulo Alquiler/Asignación

import Layout from "./components/Layout";
import Footer from "./components/Footer";
import MisDispositivos from "./pages/MisDispositivos";
import DispositivoDetalle from "./pages/DispositivoDetalle";

// ===== Helpers de sesión/rol
function getToken() {
  return localStorage.getItem("token") || null;
}
function getRol() {
  // lee 'rol' o 'role' y normaliza
  const r =
    (localStorage.getItem("rol") ??
      localStorage.getItem("role") ??
      "").trim().toLowerCase();
  return r;
}

// ===== Guards
function PrivateRoute() {
  const token = getToken();
  if (!token) return <Navigate to="/" replace />;
  return <Outlet />;
}

function AdminOnly() {
  const rol = getRol();
  // si no es admin, lo mandamos a dashboard (como hacías)
  if (rol !== "administrador") return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

// Decide qué dashboard mostrar según rol
function DashboardWrapper() {
  const rol = getRol();
  if (rol === "administrador") return <DashboardAdmin />;
  if (rol === "usuario") return <DashboardUsuario />;
  // si por alguna razón no hay rol, forzamos login
  return <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1 }}>
          <Routes>
            {/* Públicas */}
            <Route path="/" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />

            {/* Protegidas */}
            <Route element={<PrivateRoute />}>
              <Route element={<Layout />}>
                {/* Dashboard según rol */}
                <Route path="/dashboard" element={<DashboardWrapper />} />

                {/* ==== SOLO ADMIN (agrupado) ==== */}
                <Route element={<AdminOnly />}>
                  <Route path="/usuarios" element={<Usuarios />} />
                  <Route path="/usuarios/:id" element={<UsuarioDetalle />} />
                  {/* Alquiler/Asignación */}
                  <Route path="/alquiler" element={<Eolicos />} />
                  <Route path="/eolicos" element={<Eolicos />} />
                  {/* Herramientas admin extra */}
                  <Route path="/admin/monitoreo" element={<MonitoreoAdmin />} />
                </Route>

                {/* ==== Autenticados (cualquier rol) ==== */}
                <Route path="/contactos" element={<Contactos />} />
                <Route path="/mensajes" element={<Mensajes />} />
                <Route path="/alertas" element={<AlertasPage />} />
                <Route path="/graficos" element={<Graficos />} />
                <Route path="/reportes" element={<Reportes />} />
                <Route path="/mis-dispositivos" element={<MisDispositivos />} />
                <Route path="/mis-dispositivos/:codigo" element={<DispositivoDetalle />} />
              </Route>
            </Route>

            {/* Fallback: si hay token manda a dashboard, si no a login */}
            <Route
              path="*"
              element={getToken() ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace />}
            />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
