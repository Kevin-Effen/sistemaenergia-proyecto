// src/pages/Eolicos.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";
import * as bootstrap from 'bootstrap';

/* =========== Utils =========== */
const norm = (s) =>
  (s ?? "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

const money = (v) =>
  Number(v || 0).toLocaleString("es-BO", {
    style: "currency",
    currency: "BOB",
    minimumFractionDigits: 2,
  });

/* =========== Modal genérico =========== */
function Modal({ open, title, children, onClose, footer }) {
  if (!open) return null;
  return (
    <>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true">
        <div className="modal-dialog modal-dialog-centered modal-lg modal-fullscreen-sm-down">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" onClick={onClose} aria-label="Cerrar" />
            </div>
            <div className="modal-body">{children}</div>
            <div className="modal-footer flex-wrap gap-2">
              {footer}
              <button className="btn btn-outline-secondary" onClick={onClose}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </>
  );
}

/* =========== Página =========== */
export default function Eolicos() {
  const navigate = useNavigate();
  const location = useLocation();

  /* Guard de rol */
  useEffect(() => {
    const token = localStorage.getItem("token");
    const rol = (localStorage.getItem("rol") || "").toLowerCase();
    if (!token) navigate("/", { replace: true });
    if (rol !== "administrador") navigate("/dashboard", { replace: true });
  }, [navigate]);

  /* Estado */
  const [lista, setLista] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  // búsqueda
  const [q, setQ] = useState("");

  // row busy
  const [rowLoading, setRowLoading] = useState({}); // {[id_eolico]: 'asignar'|'desasignar'|'toggle'|'costos'|'pdf'|'cuotas-*'}

  // modal nuevo
  const [openNuevo, setOpenNuevo] = useState(false);
  const [nuevo, setNuevo] = useState({
    codigo: "",
    tarifa_mes: "",
    costo_instalacion: "",
    deposito: "",
    costo_operativo_dia: "",
  });
  const [creando, setCreando] = useState(false);

  // modal costos
  const [openCostos, setOpenCostos] = useState(false);
  const [equipoEdit, setEquipoEdit] = useState(null);
  const [costos, setCostos] = useState({
    tarifa_mes: "",
    costo_instalacion: "",
    deposito: "",
    costo_operativo_dia: "",
  });
  const [aplicarAlquiler, setAplicarAlquiler] = useState(true); // ✅ nuevo estado

  // === Modal de Alquiler Mejorado ===
  const [openModalAlquiler, setOpenModalAlquiler] = useState(false);
  const [equipoAlquiler, setEquipoAlquiler] = useState(null);
  const [alquilerForm, setAlquilerForm] = useState({
    usuario_id: "",
    costo_instalacion: 300, // Default en bolivianos
    tarifa_mensual: 50,      // Default en bolivianos
    deposito: 0,
    fecha_inicio: new Date().toISOString().slice(0, 10),
    generar_cuotas: true,    // Generar automáticamente cuotas
  });
  const [procesandoAlquiler, setProcesandoAlquiler] = useState(false);

  // === Modal Registrar Pago ===
  const [openModalPago, setOpenModalPago] = useState(false);
  const [equipoPago, setEquipoPago] = useState(null);
  const [pagoForm, setPagoForm] = useState({
    monto: "",
    metodo_pago: "efectivo", // efectivo, transferencia, qr
    observaciones: "",
  });
  const [procesandoPago, setProcesandoPago] = useState(false);

  // === Modal Cambiar Usuario ===
  const [openModalCambioUsuario, setOpenModalCambioUsuario] = useState(false);
  const [equipoCambio, setEquipoCambio] = useState(null);
  const [nuevoUsuarioId, setNuevoUsuarioId] = useState("");

  // === Cuotas ===
  // Modal “Generar plan de cuotas”
  const [openPlan, setOpenPlan] = useState(false);
  const [equipoPlan, setEquipoPlan] = useState(null);
  const [guardandoPlan, setGuardandoPlan] = useState(false);
  const hoyISO = new Date().toISOString().slice(0, 10);
  const [planForm, setPlanForm] = useState({
    concepto: "tarifa", // 'tarifa'|'instalacion'|'deposito'|'operativo'|'otro'
    numero_cuotas: 6,
    periodicidad: "mensual", // 'mensual'|'semanal'|'diaria'
    primera_fecha: hoyISO,
    monto_total: "", // vacío = el backend lo infiere si corresponde
    descripcion: "",
  });

  // Modal “Lista de cuotas”
  const [openListaCuotas, setOpenListaCuotas] = useState(false);
  const [loadingCuotas, setLoadingCuotas] = useState(false);
  const [alquilerInfo, setAlquilerInfo] = useState(null); // { id_alquiler, eolico_id, codigo, login, nombres... }
  const [listaCuotas, setListaCuotas] = useState([]);
  const [pagandoId, setPagandoId] = useState(0);

  // ?userId=###
  const params = new URLSearchParams(location.search);
  const userIdParam = Number(params.get("userId") || 0);

  /* Cargar datos */
  const cargarTodo = async () => {
    try {
      setCargando(true);
      setError("");
      const [rEol, rUsr] = await Promise.all([api.get("/eolicos"), api.get("/usuarios")]);
      setLista(Array.isArray(rEol.data) ? rEol.data : []);
      setUsuarios(Array.isArray(rUsr.data) ? rUsr.data : []);
    } catch (e) {
      console.error("cargarTodo error:", e?.response || e);
      setError("No se pudo cargar la información.");
      setLista([]);
      setUsuarios([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inicializar dropdowns de Bootstrap
  useEffect(() => {
    const dropdownElementList = document.querySelectorAll('[data-bs-toggle="dropdown"]');
    const dropdownList = [...dropdownElementList].map(dropdownToggleEl => new bootstrap.Dropdown(dropdownToggleEl));
    
    return () => {
      dropdownList.forEach(dropdown => {
        if (dropdown && dropdown.dispose) {
          dropdown.dispose();
        }
      });
    };
  }, [lista]); // Re-inicializar cuando cambie la lista de equipos

  /* Helpers */
  const showBackendError = (e, fallback = "Ocurrió un error") => {
    const msg =
      e?.response?.data?.mensaje ||
      e?.response?.data?.error ||
      e?.response?.data?.errores?.[0]?.msg ||
      (e?.response?.status === 409 ? "Registro duplicado." : null) ||
      fallback;
    alert(msg);
  };

  const isBusy = (id, action) => rowLoading[id] === action;
  const setRowBusy = (id, action) => setRowLoading((s) => ({ ...s, [id]: action }));
  const clearRowBusy = (id) =>
    setRowLoading((s) => {
      const n = { ...s };
      delete n[id];
      return n;
    });

  const nombreUsuario = (r) =>
    [r.nombres, r.primer_apellido, r.segundo_apellido].filter(Boolean).join(" ") || "—";

  const listaFiltrada = useMemo(() => {
    const nq = norm(q);
    if (!nq) return lista;
    return lista.filter((r) => {
      const nombre = [r.nombres, r.primer_apellido, r.segundo_apellido].filter(Boolean).join(" ");
      const campos = [r.codigo, nombre, r.login].map(norm);
      return campos.some((c) => c.includes(nq));
    });
  }, [q, lista]);

  /* Acciones */
  const crearEolico = async () => {
    const codigo = (nuevo.codigo || "").trim().toUpperCase();
    if (!codigo) return alert("Ingresa un código.");
    if (codigo.length < 3) return alert("El código debe tener al menos 3 caracteres.");

    const payload = {
      codigo,
      tarifa_mes: Number(nuevo.tarifa_mes || 0),
      costo_instalacion: Number(nuevo.costo_instalacion || 0),
      deposito: Number(nuevo.deposito || 0),
      costo_operativo_dia: Number(nuevo.costo_operativo_dia || 0),
    };

    try {
      setCreando(true);
      await api.post("/eolicos", payload);
      setNuevo({
        codigo: "",
        tarifa_mes: "",
        costo_instalacion: "",
        deposito: "",
        costo_operativo_dia: "",
      });
      setOpenNuevo(false);
      await cargarTodo();
    } catch (e) {
      if (e?.response?.status === 409) alert("Ese código ya existe.");
      else showBackendError(e, "No se pudo crear el equipo.");
    } finally {
      setCreando(false);
    }
  };

  const asignar = async (id_eolico, usuario_id) => {
    try {
      setRowBusy(id_eolico, "asignar");
      await api.put(`/eolicos/${id_eolico}/asignar`, { usuario_id });
      await cargarTodo();
    } catch (e) {
      showBackendError(e, "No se pudo asignar.");
    } finally {
      clearRowBusy(id_eolico);
    }
  };

  // Rotar device_key
  async function rotarKey(id_eolico) {
    if (!window.confirm("¿Rotar la clave del dispositivo? Deberás actualizar el ESP32.")) return;
    try {
      const r = await api.put(`/eolicos/${id_eolico}/rotar-key`);
      const key = r?.data?.device_key;
      if (key) {
        window.prompt("Nueva device_key (cópiala al ESP32):", key);
      } else {
        alert("Clave rotada, pero no recibimos el valor.");
      }
    } catch (e) {
      console.error(e);
      alert("No se pudo rotar la clave.");
    }
  }

  const desasignar = async (id_eolico) => {
    if (!window.confirm("¿Desasignar este equipo?")) return;
    try {
      setRowBusy(id_eolico, "desasignar");
      await api.put(`/eolicos/${id_eolico}/desasignar`);
      await cargarTodo();
    } catch (e) {
      showBackendError(e, "No se pudo desasignar.");
    } finally {
      clearRowBusy(id_eolico);
    }
  };

  const toggle = async (id_eolico, nuevoEstado) => {
    try {
      setRowBusy(id_eolico, "toggle");
      await api.put(`/eolicos/${id_eolico}/toggle`, { activo: !!nuevoEstado });
      await cargarTodo();
    } catch (e) {
      showBackendError(e, "No se pudo cambiar el estado.");
    } finally {
      clearRowBusy(id_eolico);
    }
  };

  const abrirEditarCostos = (r) => {
    setEquipoEdit(r);
    setCostos({
      tarifa_mes: r.tarifa_mes ?? 0,
      costo_instalacion: r.costo_instalacion ?? 0,
      deposito: r.deposito ?? 0,
      costo_operativo_dia: r.costo_operativo_dia ?? 0,
    });
    setAplicarAlquiler(true); // ✅ por defecto aplicar
    setOpenCostos(true);
  };

  const guardarCostos = async () => {
    if (!equipoEdit) return;
    const id = equipoEdit.id_eolico;
    const payload = {
      tarifa_mes: Number(costos.tarifa_mes || 0),
      costo_instalacion: Number(costos.costo_instalacion || 0),
      deposito: Number(costos.deposito || 0),
      costo_operativo_dia: Number(costos.costo_operativo_dia || 0),
      aplicar_alquiler_activo: aplicarAlquiler, // ✅ enviar flag
    };
    try {
      setRowBusy(id, "costos");
      await api.put(`/eolicos/${id}/costos`, payload);
      setOpenCostos(false);
      setEquipoEdit(null);
      await cargarTodo();
    } catch (e) {
      showBackendError(e, "No se pudieron guardar los costos.");
    } finally {
      clearRowBusy(id);
    }
  };

  // === Cuotas ===
  // Abrir modal para GENERAR plan
  const abrirGenerarPlan = (row) => {
    setEquipoPlan(row);
    setPlanForm((f) => ({
      ...f,
      concepto: "tarifa",
      numero_cuotas: 6,
      periodicidad: "mensual",
      primera_fecha: hoyISO,
      monto_total: "",
      descripcion: "",
    }));
    setOpenPlan(true);
  };

  // Enviar creación de plan
  const enviarGenerarPlan = async () => {
    if (!equipoPlan) return;
    const id = equipoPlan.id_eolico;

    const payload = {
      concepto: planForm.concepto,
      numero_cuotas: Number(planForm.numero_cuotas || 0),
      periodicidad: planForm.periodicidad,
      primera_fecha: planForm.primera_fecha || undefined,
      descripcion: planForm.descripcion || undefined,
    };
    // monto_total es opcional
    if (String(planForm.monto_total).trim() !== "") {
      payload.monto_total = Number(planForm.monto_total);
      if (!(payload.monto_total > 0)) return alert("Monto total inválido.");
    }

    if (!(payload.numero_cuotas >= 1 && payload.numero_cuotas <= 120)) {
      return alert("El número de cuotas debe estar entre 1 y 120.");
    }

    try {
      setGuardandoPlan(true);
      setRowBusy(id, "cuotas-generar");
      await api.post(`/eolicos/${id}/cuotas/generar`, payload);
      setOpenPlan(false);
      setEquipoPlan(null);
      await cargarTodo();
      await verCuotas(id); // abre la lista generada
    } catch (e) {
      showBackendError(e, "No se pudo generar el plan de cuotas.");
    } finally {
      setGuardandoPlan(false);
      clearRowBusy(id);
    }
  };

  // Ver LISTA de cuotas (modal)
  const verCuotas = async (id_eolico) => {
    try {
      setRowBusy(id_eolico, "cuotas-lista");
      setLoadingCuotas(true);
      const r = await api.get(`/eolicos/${id_eolico}/cuotas`);
      setAlquilerInfo(r.data?.alquiler || null);
      setListaCuotas(Array.isArray(r.data?.cuotas) ? r.data.cuotas : []);
      setOpenListaCuotas(true);
    } catch (e) {
      showBackendError(e, "No se pudieron cargar las cuotas.");
    } finally {
      setLoadingCuotas(false);
      clearRowBusy(id_eolico);
    }
  };

  // Pagar una cuota
  const pagarCuota = async (id_cuota) => {
    // Validar que no se esté procesando otra cuota
    if (pagandoId !== 0) {
      console.log("⚠️ Ya se está procesando otra cuota, ignorando...");
      return;
    }

    console.log("💳 Iniciando pago de cuota:", id_cuota);

    try {
      setPagandoId(id_cuota);
      
      console.log("📡 Enviando petición al backend...");
      const response = await api.put(`/cuotas/${id_cuota}/pagar`, { 
        metodo_pago: "efectivo", 
        observaciones: "Pago registrado desde módulo de alquileres" 
      });
      
      console.log("✅ Respuesta del servidor:", response.data);
      
      // Actualizar la lista de cuotas localmente
      setListaCuotas((prev) =>
        prev.map((c) => 
          c.id_cuota === id_cuota 
            ? { ...c, pagado: 1, fecha_pago: new Date().toISOString() } 
            : c
        )
      );
      
      console.log("✅ Lista de cuotas actualizada localmente");
      
      // Mostrar mensaje de éxito
      alert("✅ Cuota marcada como pagada exitosamente. Ahora puedes descargar el recibo PDF.");
      
    } catch (e) {
      console.error("❌ Error al pagar cuota:", e);
      console.error("Detalles del error:", e.response?.data || e.message);
      showBackendError(e, "No se pudo marcar como pagada. Verifica que la cuota exista y no esté ya pagada.");
    } finally {
      // Siempre resetear el estado, incluso si hay error
      console.log("🔄 Reseteando estado de pagandoId");
      setPagandoId(0);
    }
  };

  // PDF de cuotas
  const abrirPDFCuotas = async (id_eolico, codigo) => {
    try {
      setRowBusy(id_eolico, "cuotas-pdf");
      const token = localStorage.getItem("token") || "";
      const base = api.defaults.baseURL || "";
      const url = `${base}/eolicos/${id_eolico}/cuotas/pdf`;

      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || "No se pudo generar el PDF de cuotas");
      }
      const blob = await resp.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const win = window.open(blobUrl, "_blank");
      if (!win) {
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `cuotas_${codigo || id_eolico}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } catch (e) {
      console.error("abrirPDFCuotas error:", e);
      alert("No se pudo abrir el PDF de cuotas.");
    } finally {
      clearRowBusy(id_eolico);
    }
  };

  // === Nuevas Funciones para Alquiler Mejorado ===

  /**
   * Abrir modal para asignar equipo y crear alquiler
   */
  const abrirModalAlquiler = (equipo) => {
    setEquipoAlquiler(equipo);
    setAlquilerForm({
      usuario_id: "",
      costo_instalacion: 300, // Costo estándar en Bs
      tarifa_mensual: Number(equipo.tarifa_mes) || 50, // Usar tarifa del equipo o default
      deposito: Number(equipo.deposito) || 0,
      fecha_inicio: new Date().toISOString().slice(0, 10),
      generar_cuotas: true,
    });
    setOpenModalAlquiler(true);
  };

  /**
   * Crear alquiler con generación automática de cuotas
   */
  const crearAlquiler = async () => {
    if (!equipoAlquiler) return;
    if (!alquilerForm.usuario_id) {
      alert("Selecciona un usuario");
      return;
    }

    // Validar que los valores numéricos sean válidos
    const costoInstalacion = Number(alquilerForm.costo_instalacion) || 0;
    const tarifaMensual = Number(alquilerForm.tarifa_mensual) || 0;
    const deposito = Number(alquilerForm.deposito) || 0;
    
    if (costoInstalacion < 0 || tarifaMensual < 0 || deposito < 0) {
      alert("Los costos no pueden ser negativos");
      return;
    }

    const id_eolico = equipoAlquiler.id_eolico;
    
    try {
      setProcesandoAlquiler(true);
      setRowBusy(id_eolico, "asignar");

      // Paso 1: Asignar equipo al usuario
      await api.put(`/eolicos/${id_eolico}/asignar`, { 
        usuario_id: Number(alquilerForm.usuario_id) 
      });

      // Paso 2: Actualizar costos del equipo
      await api.put(`/eolicos/${id_eolico}/costos`, {
        tarifa_mes: tarifaMensual,
        costo_instalacion: costoInstalacion,
        deposito: deposito,
        costo_operativo_dia: Number(equipoAlquiler.costo_operativo_dia) || 0,
        aplicar_alquiler_activo: true,
      });

      // Paso 3: Si está habilitada la generación automática de cuotas
      if (alquilerForm.generar_cuotas) {
        // Generar primera cuota (Instalación + Primer mes)
        // NOTA: Para concepto 'instalacion', el backend calcula monto_total automáticamente
        // pero como queremos instalación + primer mes, enviamos el monto_total explícito
        const montoPrimeraCuota = costoInstalacion + tarifaMensual;
        
        const fechaInicio = new Date(alquilerForm.fecha_inicio);
        const fechaVencimiento = new Date(fechaInicio);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 7); // 7 días para pagar
        
        // Primera cuota: Instalación + Primer mes
        if (montoPrimeraCuota > 0) {
          await api.post(`/eolicos/${id_eolico}/cuotas/generar`, {
            concepto: "instalacion",
            numero_cuotas: 1,
            periodicidad: "mensual", // Backend solo acepta: mensual, semanal, diaria
            primera_fecha: fechaVencimiento.toISOString().slice(0, 10),
            monto_total: montoPrimeraCuota,
            descripcion: `Instalación (Bs ${costoInstalacion.toFixed(2)}) + Primer mes (Bs ${tarifaMensual.toFixed(2)})`,
          });
        }

        // Generar cuotas mensuales (próximos 12 meses)
        // Para concepto 'tarifa', NO enviamos monto_total, el backend lo calcula automáticamente
        if (tarifaMensual > 0) {
          const fechaSegundaCuota = new Date(fechaInicio);
          fechaSegundaCuota.setMonth(fechaSegundaCuota.getMonth() + 1);
          
          await api.post(`/eolicos/${id_eolico}/cuotas/generar`, {
            concepto: "tarifa",
            numero_cuotas: 12,
            periodicidad: "mensual",
            primera_fecha: fechaSegundaCuota.toISOString().slice(0, 10),
            // NO enviamos monto_total - el backend lo calcula como: tarifa_mes * 12
            descripcion: "Alquiler mensual del sistema eólico",
          });
        }
      }

      // Cerrar modal y recargar
      setOpenModalAlquiler(false);
      await cargarTodo();
      
      alert("✅ Alquiler creado exitosamente.\n" + 
            (alquilerForm.generar_cuotas ? "Se generaron las cuotas automáticamente." : ""));

    } catch (e) {
      showBackendError(e, "No se pudo crear el alquiler.");
    } finally {
      setProcesandoAlquiler(false);
      clearRowBusy(id_eolico);
    }
  };

  /**
   * Abrir modal para registrar un pago
   */
  const abrirRegistrarPago = (equipo) => {
    setEquipoPago(equipo);
    setPagoForm({
      monto: equipo.tarifa_mes || 50,
      metodo_pago: "efectivo",
      observaciones: "",
    });
    setOpenModalPago(true);
  };

  /**
   * Registrar pago y generar recibo
   */
  const registrarPago = async () => {
    if (!equipoPago) return;
    if (!pagoForm.monto || Number(pagoForm.monto) <= 0) {
      alert("Ingresa un monto válido");
      return;
    }

    try {
      setProcesandoPago(true);
      
      // Buscar la siguiente cuota pendiente del alquiler
      const id_eolico = equipoPago.id_eolico;
      const responseCuotas = await api.get(`/eolicos/${id_eolico}/cuotas`);
      const cuotas = responseCuotas.data?.cuotas || [];
      
      const cuotaPendiente = cuotas.find(c => !c.pagado);
      
      if (!cuotaPendiente) {
        alert("No hay cuotas pendientes de pago");
        return;
      }

      // Marcar cuota como pagada
      await api.put(`/cuotas/${cuotaPendiente.id_cuota}/pagar`, {
        metodo_pago: pagoForm.metodo_pago,
        observaciones: pagoForm.observaciones || "Pago registrado desde módulo de alquiler",
      });

      // Generar recibo PDF automáticamente
      const token = localStorage.getItem("token") || "";
      const base = api.defaults.baseURL || "";
      const url = `${base}/eolicos/${id_eolico}/recibo`;
      
      const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (resp.ok) {
        const blob = await resp.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const win = window.open(blobUrl, "_blank");
        if (!win) {
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = `recibo_${equipoPago.codigo}_${new Date().getTime()}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      }

      setOpenModalPago(false);
      await cargarTodo();
      alert("✅ Pago registrado exitosamente.\nSe generó el recibo PDF.");

    } catch (e) {
      showBackendError(e, "No se pudo registrar el pago.");
    } finally {
      setProcesandoPago(false);
    }
  };

  /**
   * Abrir modal para cambiar de usuario
   */
  const abrirModalCambiarUsuario = (equipo) => {
    setEquipoCambio(equipo);
    setNuevoUsuarioId("");
    setOpenModalCambioUsuario(true);
  };

  /**
   * Cambiar usuario asignado
   */
  const cambiarUsuario = async () => {
    if (!equipoCambio) return;
    if (!nuevoUsuarioId) {
      alert("Selecciona un usuario");
      return;
    }

    try {
      const id_eolico = equipoCambio.id_eolico;
      setRowBusy(id_eolico, "asignar");
      
      await api.put(`/eolicos/${id_eolico}/asignar`, { 
        usuario_id: Number(nuevoUsuarioId) 
      });

      setOpenModalCambioUsuario(false);
      await cargarTodo();
      alert("✅ Usuario cambiado exitosamente");

    } catch (e) {
      showBackendError(e, "No se pudo cambiar el usuario.");
    } finally {
      clearRowBusy(equipoCambio?.id_eolico);
    }
  };

  /* UI */
  return (
    <div className="container my-4">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
        <div className="d-flex flex-column">
          <h3 className="mb-0">Sistemas Eólicos</h3>
          <div className="text-muted small">Gestión de alquiler, costos y asignaciones</div>
        </div>

        <div className="d-flex align-items-center gap-2 flex-nowrap">
          {/* BUSCADOR COMPACTO */}
          <div className="input-group input-group-sm" style={{ maxWidth: 280 }}>
            <span className="input-group-text">Buscar</span>
            <input
              className="form-control"
              placeholder="Código, usuario, login…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && (
              <button className="btn btn-outline-secondary" onClick={() => setQ("")} title="Limpiar">
                Limpiar
              </button>
            )}
          </div>

          {/* Acciones */}
          <button className="btn btn-success btn-sm" onClick={() => setOpenNuevo(true)}>
            Nuevo
          </button>
          <button className="btn btn-outline-secondary btn-sm" onClick={cargarTodo} disabled={cargando}>
            {cargando ? "Actualizando…" : "Recargar"}
          </button>
        </div>
      </div>

      {userIdParam > 0 && (
        <div className="form-text mt-1">
          Asignación rápida para usuario ID <strong>{userIdParam}</strong> (se resalta con ★).
        </div>
      )}

      {error && <div className="alert alert-danger mt-3">{error}</div>}

      {/* Tabla responsiva */}
      <div className="card mt-3 shadow-sm">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped table-bordered align-middle">
              <thead className="table-dark">
                <tr className="align-middle">
                  <th style={{ minWidth: 70, width: '5%' }}>Nro.</th>
                  <th style={{ minWidth: 150, width: '15%' }}>Equipo</th>
                  <th style={{ minWidth: 200, width: '25%' }}>Cliente Asignado</th>
                  <th style={{ minWidth: 130, width: '15%' }}>Estado</th>
                  <th style={{ minWidth: 150, width: '15%' }}>Fecha de Registro</th>
                  <th style={{ minWidth: 220, width: '25%' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.map((r, idx) => {
                  const nro = idx + 1;
                  const asignado = !!r.usuario_id;
                  const busyToggle = isBusy(r.id_eolico, "toggle");

                  return (
                    <tr key={r.id_eolico}>
                      {/* Número */}
                      <td className="text-center">
                        <span className="badge bg-light text-dark border">{nro}</span>
                      </td>

                      {/* Equipo - Código y estado de habilitación */}
                      <td>
                        <div className="d-flex flex-column gap-1">
                          <div className="d-flex align-items-center gap-2">
                            <i className="bi bi-wind text-primary fs-5"></i>
                            <strong className="text-dark">{r.codigo}</strong>
                          </div>
                          {r.habilitado ? (
                            <span className="badge bg-success-subtle text-success border border-success">
                              <i className="bi bi-check-circle-fill me-1"></i>
                              Habilitado
                            </span>
                          ) : (
                            <span className="badge bg-warning-subtle text-warning border border-warning">
                              <i className="bi bi-exclamation-triangle-fill me-1"></i>
                              No habilitado
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Cliente Asignado - Nombre y login */}
                      <td>
                        {asignado ? (
                          <div className="d-flex flex-column gap-1">
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-person-circle text-success"></i>
                              <span className="fw-semibold text-dark">{nombreUsuario(r)}</span>
                            </div>
                            <small className="text-muted">
                              <i className="bi bi-at me-1"></i>
                              {r.login || "Sin login"}
                            </small>
                          </div>
                        ) : (
                          <div className="text-muted fst-italic">
                            <i className="bi bi-dash-circle me-1"></i>
                            Sin cliente asignado
                          </div>
                        )}
                      </td>

                      {/* Estado - Switch de activación */}
                      <td>
                        <div className="d-flex flex-column gap-2">
                          <div className="form-check form-switch">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              role="switch"
                              id={`sw-${r.id_eolico}`}
                              checked={!!r.activo}
                              onChange={() => toggle(r.id_eolico, !r.activo)}
                              disabled={!asignado || busyToggle}
                              title={!asignado ? "Primero asigna a un usuario" : r.activo ? "Desactivar" : "Activar"}
                            />
                            <label className="form-check-label" htmlFor={`sw-${r.id_eolico}`}>
                              {busyToggle ? (
                                <span className="text-muted">
                                  <span className="spinner-border spinner-border-sm me-1"></span>
                                  Guardando…
                                </span>
                              ) : r.activo ? (
                                <span className="badge bg-success">
                                  <i className="bi bi-power me-1"></i>
                                  Activo
                                </span>
                              ) : (
                                <span className="badge bg-secondary">
                                  <i className="bi bi-power me-1"></i>
                                  Inactivo
                                </span>
                              )}
                            </label>
                          </div>
                        </div>
                      </td>

                      {/* Fecha de Registro */}
                      <td>
                        <div className="d-flex flex-column gap-1">
                          <span className="text-dark">
                            <i className="bi bi-calendar-check me-1"></i>
                            {new Date(r.fecha_creacion).toLocaleDateString('es-BO', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                          <small className="text-muted">
                            <i className="bi bi-clock me-1"></i>
                            {new Date(r.fecha_creacion).toLocaleTimeString('es-BO', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </small>
                        </div>
                      </td>

                      {/* Acciones - Rediseño UX Mejorado */}
<td style={{ minWidth: 220, maxWidth: 250 }}>
  <div className="d-flex flex-column align-items-stretch gap-2">
    
    {/* Estado del equipo - Badge compacto */}
    {asignado ? (
      <div className="badge bg-success text-truncate" title={`Asignado a: ${nombreUsuario(r)}`}>
        <i className="bi bi-check-circle me-1"></i>
        {nombreUsuario(r).length > 20 ? nombreUsuario(r).substring(0, 20) + '...' : nombreUsuario(r)}
      </div>
    ) : (
      <div className="badge bg-secondary">
        <i className="bi bi-dash-circle me-1"></i>
        Sin asignar
      </div>
    )}

    {/* Botón principal de asignación/cambio */}
    {!asignado ? (
      <button
        className="btn btn-success btn-sm"
        onClick={() => abrirModalAlquiler(r)}
        disabled={isBusy(r.id_eolico, "asignar")}
        title="Asignar equipo y crear alquiler"
        style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
      >
        <i className="bi bi-person-plus-fill me-1"></i>
        {isBusy(r.id_eolico, "asignar") ? "Procesando…" : "Asignar"}
      </button>
    ) : (
      <button
        className="btn btn-warning btn-sm text-dark"
        onClick={() => desasignar(r.id_eolico)}
        disabled={isBusy(r.id_eolico, "desasignar")}
        title="Desasignar equipo del usuario"
        style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
      >
        <i className="bi bi-person-dash-fill me-1"></i>
        {isBusy(r.id_eolico, "desasignar") ? "Procesando…" : "Desasignar"}
      </button>
    )}

    {/* Dropdown de Acciones */}
    <div className="dropdown">
      <button
        className="btn btn-outline-primary btn-sm dropdown-toggle w-100"
        type="button"
        id={`dropdown-${r.id_eolico}`}
        data-bs-toggle="dropdown"
        aria-expanded="false"
        style={{ fontSize: '0.85rem', padding: '0.4rem 0.6rem' }}
      >
        <i className="bi bi-gear-fill me-1"></i>
        Acciones
      </button>
      <ul className="dropdown-menu" aria-labelledby={`dropdown-${r.id_eolico}`}>
        
        {/* Sección: Gestión de Alquiler */}
        <li><h6 className="dropdown-header"><i className="bi bi-house-door me-1"></i> Gestión de Alquiler</h6></li>
        <li>
          <button
            className="dropdown-item"
            onClick={() => abrirEditarCostos(r)}
          >
            <i className="bi bi-cash-coin me-2"></i>
            Editar Costos
          </button>
        </li>
        {asignado && (
          <li>
            <button
              className="dropdown-item"
              onClick={() => abrirModalCambiarUsuario(r)}
            >
              <i className="bi bi-arrow-left-right me-2"></i>
              Cambiar Usuario
            </button>
          </li>
        )}
        
        <li><hr className="dropdown-divider" /></li>
        
        {/* Sección: Cuotas y Pagos */}
        <li><h6 className="dropdown-header"><i className="bi bi-cash-stack me-1"></i> Cuotas y Pagos</h6></li>
        <li>
          <button
            className="dropdown-item"
            onClick={() => verCuotas(r.id_eolico)}
            disabled={isBusy(r.id_eolico, "cuotas-lista")}
          >
            <i className="bi bi-list-check me-2"></i>
            {isBusy(r.id_eolico, "cuotas-lista") ? "Cargando…" : "Ver Cuotas"}
          </button>
        </li>
        <li>
          <button
            className="dropdown-item"
            onClick={() => abrirGenerarPlan(r)}
            disabled={isBusy(r.id_eolico, "cuotas-generar")}
          >
            <i className="bi bi-calendar-plus me-2"></i>
            {isBusy(r.id_eolico, "cuotas-generar") ? "Generando…" : "Generar Plan de Cuotas"}
          </button>
        </li>
        <li>
          <button
            className="dropdown-item"
            onClick={() => abrirRegistrarPago(r)}
            disabled={!asignado}
          >
            <i className="bi bi-credit-card me-2"></i>
            Registrar Pago
          </button>
        </li>
        
        <li><hr className="dropdown-divider" /></li>
        
        {/* Sección: Documentos */}
        <li><h6 className="dropdown-header"><i className="bi bi-file-earmark-pdf me-1"></i> Documentos</h6></li>
        <li>
          <button
            className="dropdown-item"
            onClick={() => {
              (async () => {
                try {
                  setRowBusy(r.id_eolico, "pdf");
                  const token = localStorage.getItem("token") || "";
                  const base = api.defaults.baseURL || "";
                  const url = `${base}/eolicos/${r.id_eolico}/recibo`;
                  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                  if (!resp.ok) {
                    const txt = await resp.text();
                    throw new Error(txt || "No se pudo generar el PDF");
                  }
                  const blob = await resp.blob();
                  const blobUrl = window.URL.createObjectURL(blob);
                  const win = window.open(blobUrl, "_blank");
                  if (!win) {
                    const a = document.createElement("a");
                    a.href = blobUrl;
                    a.download = `recibo_${r.codigo || r.id_eolico}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }
                  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
                } catch (e) {
                  console.error("abrirRecibo error:", e);
                  alert("No se pudo abrir el recibo PDF.");
                } finally {
                  clearRowBusy(r.id_eolico);
                }
              })();
            }}
            disabled={isBusy(r.id_eolico, "pdf")}
          >
            <i className="bi bi-receipt me-2"></i>
            {isBusy(r.id_eolico, "pdf") ? "Generando…" : "Recibo de Pago (PDF)"}
          </button>
        </li>
        <li>
          <button
            className="dropdown-item"
            onClick={() => abrirPDFCuotas(r.id_eolico, r.codigo)}
            disabled={isBusy(r.id_eolico, "cuotas-pdf")}
          >
            <i className="bi bi-file-pdf me-2"></i>
            {isBusy(r.id_eolico, "cuotas-pdf") ? "Generando…" : "Plan de Cuotas (PDF)"}
          </button>
        </li>
        
        <li><hr className="dropdown-divider" /></li>
        
        {/* Sección: Configuración */}
        <li><h6 className="dropdown-header"><i className="bi bi-tools me-1"></i> Configuración</h6></li>
        <li>
          <button
            className="dropdown-item"
            onClick={() => rotarKey(r.id_eolico)}
          >
            <i className="bi bi-key me-2"></i>
            Rotar Clave Dispositivo
          </button>
        </li>
      </ul>
    </div>

  </div>
</td>

                    </tr>
                  );
                })}

                {listaFiltrada.length === 0 && !cargando && (
                  <tr>
                    <td colSpan="6" className="text-center py-5">
                      <div className="d-flex flex-column align-items-center gap-3">
                        <i className="bi bi-inbox display-1 text-muted"></i>
                        <h5 className="text-muted">No hay equipos registrados</h5>
                        <p className="text-muted">Comienza creando un nuevo equipo eólico</p>
                        <button 
                          className="btn btn-primary"
                          onClick={() => setOpenNuevo(true)}
                        >
                          <i className="bi bi-plus-circle me-2"></i>
                          Crear Primer Equipo
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between mt-2">
            <div className="text-muted small">
              {listaFiltrada.length} de {lista.length} resultados
            </div>
            <button className="btn btn-outline-secondary" onClick={cargarTodo} disabled={cargando}>
              {cargando ? "Actualizando" : "Recargar"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Nuevo equipo */}
      <Modal
        open={openNuevo}
        title="Crear nuevo equipo eólico"
        onClose={() => setOpenNuevo(false)}
        footer={
          <button className="btn btn-success" onClick={crearEolico} disabled={creando}>
            {creando ? "Creando…" : "Crear"}
          </button>
        }
      >
        <div className="row g-3">
          <div className="col-12">
            <label className="form-label">Código único</label>
            <input
              className="form-control"
              placeholder="Ej: EOL-0001"
              value={nuevo.codigo}
              onChange={(e) => setNuevo((s) => ({ ...s, codigo: e.target.value.toUpperCase() }))}
              maxLength={20}
              required
            />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label">Tarifa mensual (Bs)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control"
              value={nuevo.tarifa_mes}
              onChange={(e) => setNuevo((s) => ({ ...s, tarifa_mes: e.target.value }))}
            />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label">Instalación (Bs)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control"
              value={nuevo.costo_instalacion}
              onChange={(e) => setNuevo((s) => ({ ...s, costo_instalacion: e.target.value }))}
            />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label">Depósito (Bs)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control"
              value={nuevo.deposito}
              onChange={(e) => setNuevo((s) => ({ ...s, deposito: e.target.value }))}
            />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label">Costo operativo/día (Bs)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control"
              value={nuevo.costo_operativo_dia}
              onChange={(e) => setNuevo((s) => ({ ...s, costo_operativo_dia: e.target.value }))}
            />
          </div>
          <div className="col-12">
            <div className="small text-muted">Luego podrás editar estos valores desde “Editar costos”.</div>
          </div>
        </div>
      </Modal>

      {/* Modal: Editar costos */}
      <Modal
        open={openCostos}
        title={`Editar costos — ${equipoEdit?.codigo ?? ""}`}
        onClose={() => setOpenCostos(false)}
        footer={
          <button
            className="btn btn-primary"
            onClick={guardarCostos}
            disabled={equipoEdit ? isBusy(equipoEdit.id_eolico, "costos") : true}
          >
            {equipoEdit && isBusy(equipoEdit.id_eolico, "costos") ? "Guardando…" : "Guardar costos"}
          </button>
        }
      >
        <div className="row g-3">
          <div className="col-6 col-md-6">
            <label className="form-label">Tarifa mensual (Bs)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control"
              value={costos.tarifa_mes}
              onChange={(e) => setCostos((s) => ({ ...s, tarifa_mes: e.target.value }))}
            />
          </div>
          <div className="col-6 col-md-6">
            <label className="form-label">Instalación (Bs)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control"
              value={costos.costo_instalacion}
              onChange={(e) => setCostos((s) => ({ ...s, costo_instalacion: e.target.value }))}
            />
          </div>
          <div className="col-6 col-md-6">
            <label className="form-label">Depósito (Bs)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control"
              value={costos.deposito}
              onChange={(e) => setCostos((s) => ({ ...s, deposito: e.target.value }))}
            />
          </div>
          <div className="col-6 col-md-6">
            <label className="form-label">Costo operativo/día (Bs)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control"
              value={costos.costo_operativo_dia}
              onChange={(e) => setCostos((s) => ({ ...s, costo_operativo_dia: e.target.value }))}
            />
          </div>

          {/* ✅ Checkbox para aplicar al alquiler activo */}
          <div className="col-12">
            <div className="form-check">
              <input
                id="aplicarAlquiler"
                className="form-check-input"
                type="checkbox"
                checked={aplicarAlquiler}
                onChange={(e) => setAplicarAlquiler(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="aplicarAlquiler">
                Aplicar también al alquiler activo
              </label>
            </div>
            <div className="form-text">
              Se actualizarán <code>tarifa_mes</code>, <code>costo_instalacion</code> y <code>deposito</code> en la fila
              activa de <code>alquileres</code> de este equipo.
            </div>
          </div>

          <div className="col-12">
            <div className="alert alert-light border small mb-0">
              <div className="fw-semibold mb-1">Resumen</div>
              <div>
                Tarifa mensual: <strong>{money(costos.tarifa_mes)}</strong>
              </div>
              <div>
                Instalación: <strong>{money(costos.costo_instalacion)}</strong>
              </div>
              <div>
                Depósito: <strong>{money(costos.deposito)}</strong>
              </div>
              <div>
                Costo operativo/día: <strong>{money(costos.costo_operativo_dia)}</strong>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal: Generar plan de cuotas */}
      <Modal
        open={openPlan}
        title={`Generar plan de cuotas — ${equipoPlan?.codigo ?? ""}`}
        onClose={() => setOpenPlan(false)}
        footer={
          <>
            <button className="btn btn-success" onClick={enviarGenerarPlan} disabled={guardandoPlan}>
              {guardandoPlan ? "Guardando…" : "Crear plan"}
            </button>
          </>
        }
      >
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label">Concepto</label>
            <select
              className="form-select"
              value={planForm.concepto}
              onChange={(e) => setPlanForm((s) => ({ ...s, concepto: e.target.value }))}
            >
              <option value="tarifa">Tarifa mensual</option>
              <option value="instalacion">Instalación</option>
              <option value="deposito">Depósito</option>
              <option value="operativo">Operativo</option>
              <option value="otro">Otro</option>
            </select>
            <div className="form-text">
              Si dejas <b>monto total</b> vacío, el sistema lo calcula (tarifa = tarifa_mes × cuotas; instalación/depósito = valor).
            </div>
          </div>

          <div className="col-6 col-md-3">
            <label className="form-label">N° de cuotas</label>
            <input
              type="number"
              min="1"
              max="120"
              className="form-control"
              value={planForm.numero_cuotas}
              onChange={(e) => setPlanForm((s) => ({ ...s, numero_cuotas: e.target.value }))}
            />
          </div>

          <div className="col-6 col-md-3">
            <label className="form-label">Periodicidad</label>
            <select
              className="form-select"
              value={planForm.periodicidad}
              onChange={(e) => setPlanForm((s) => ({ ...s, periodicidad: e.target.value }))}
            >
              <option value="mensual">Mensual</option>
              <option value="semanal">Semanal</option>
              <option value="diaria">Diaria</option>
            </select>
          </div>

          <div className="col-6 col-md-4">
            <label className="form-label">Primera fecha</label>
            <input
              type="date"
              className="form-control"
              value={planForm.primera_fecha}
              onChange={(e) => setPlanForm((s) => ({ ...s, primera_fecha: e.target.value }))}
            />
          </div>

          <div className="col-6 col-md-4">
            <label className="form-label">Monto total (opcional)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="form-control"
              placeholder="Dejar vacío para auto"
              value={planForm.monto_total}
              onChange={(e) => setPlanForm((s) => ({ ...s, monto_total: e.target.value }))}
            />
          </div>

          <div className="col-12 col-md-4">
            <label className="form-label">Descripción (opcional)</label>
            <input
              className="form-control"
              maxLength={120}
              value={planForm.descripcion}
              onChange={(e) => setPlanForm((s) => ({ ...s, descripcion: e.target.value }))}
            />
          </div>

          <div className="col-12">
            <div className="alert alert-light border small mb-0">
              <div className="fw-semibold mb-1">Referencias (equipo)</div>
              <div>Tarifa mensual: <strong>{money(equipoPlan?.tarifa_mes)}</strong></div>
              <div>Instalación: <strong>{money(equipoPlan?.costo_instalacion)}</strong></div>
              <div>Depósito: <strong>{money(equipoPlan?.deposito)}</strong></div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal: Lista de cuotas */}
      <Modal
        open={openListaCuotas}
        title={`Plan de cuotas — ${alquilerInfo?.codigo ?? ""}`}
        onClose={() => setOpenListaCuotas(false)}
        footer={
          <>
            <button
              className="btn btn-outline-dark"
              onClick={() => abrirPDFCuotas(alquilerInfo?.eolico_id || 0, alquilerInfo?.codigo)}
              disabled={!alquilerInfo}
            >
              Cuotas PDF
            </button>
          </>
        }
      >
        {loadingCuotas ? (
          <div className="text-center py-3">Cargando…</div>
        ) : !alquilerInfo ? (
          <div className="text-muted">No hay alquiler activo.</div>
        ) : (
          <>
            <div className="row g-2 mb-2">
              <div className="col-12 col-md-6">
                <div className="small text-muted">
                  Cliente:{" "}
                  <strong>
                    {[alquilerInfo?.nombres, alquilerInfo?.primer_apellido].filter(Boolean).join(" ") || "—"}
                  </strong>
                </div>
                <div className="small text-muted">Login: <strong>{alquilerInfo?.login || "—"}</strong></div>
              </div>
              <div className="col-12 col-md-6">
                <div className="small text-muted">Alquiler ID: <strong>{alquilerInfo?.id_alquiler}</strong></div>
                <div className="small text-muted">
                  Inicio: <strong>{new Date(alquilerInfo?.fecha_inicio).toLocaleString()}</strong>
                </div>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-sm table-striped align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: 70 }}>#</th>
                    <th>Descripción</th>
                    <th style={{ width: 140 }}>Vencimiento</th>
                    <th style={{ width: 140 }} className="text-end">
                      Monto
                    </th>
                    <th style={{ width: 140 }}>Estado</th>
                    <th style={{ width: 130 }}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {listaCuotas.map((c) => (
                    <tr key={c.id_cuota}>
                      <td>{c.numero}</td>
                      <td className="text-break">{c.descripcion || `${c.concepto} ${c.numero}`}</td>
                      <td>{new Date(c.fecha_vencimiento).toLocaleDateString()}</td>
                      <td className="text-end">{money(c.monto)}</td>
                      <td>
                        {c.pagado ? (
                          <span className="badge bg-success">Pagado</span>
                        ) : (
                          <span className="badge bg-warning text-dark">Pendiente</span>
                        )}
                      </td>
                      <td>
                        {c.pagado ? (
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={async () => {
                              try {
                                // Descargar el PDF de la cuota específica usando Axios
                                const response = await api.get(`/cuotas/${c.id_cuota}/recibo`, {
                                  responseType: 'blob'
                                });
                                
                                // Crear un blob URL y abrirlo en nueva pestaña
                                const blob = new Blob([response.data], { type: 'application/pdf' });
                                const url = URL.createObjectURL(blob);
                                const newWindow = window.open(url, '_blank');
                                
                                // Liberar el blob URL después de un tiempo
                                if (newWindow) {
                                  setTimeout(() => URL.revokeObjectURL(url), 10000);
                                }
                              } catch (e) {
                                console.error("Error al abrir PDF:", e);
                                showBackendError(e, "No se pudo abrir el recibo PDF.");
                              }
                            }}
                            title="Descargar recibo de esta cuota"
                          >
                            <i className="bi bi-file-earmark-pdf"></i> PDF
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-outline-success"
                            disabled={pagandoId === c.id_cuota}
                            onClick={() => pagarCuota(c.id_cuota)}
                          >
                            {pagandoId === c.id_cuota ? "Guardando…" : "Pagar"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {listaCuotas.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-center text-muted">
                        No hay cuotas generadas.
                      </td>
                    </tr>
                  )}
                </tbody>
                {listaCuotas.length > 0 && (
                  <tfoot>
                    {(() => {
                      const total = listaCuotas.reduce((s, c) => s + Number(c.monto || 0), 0);
                      const pagado = listaCuotas.filter((c) => c.pagado).reduce((s, c) => s + Number(c.monto || 0), 0);
                      const pendiente = total - pagado;
                      return (
                        <>
                          <tr>
                            <th colSpan="3" className="text-end">
                              TOTAL
                            </th>
                            <th className="text-end">{money(total)}</th>
                            <th colSpan="2"></th>
                          </tr>
                          <tr>
                            <th colSpan="3" className="text-end">
                              PAGADO
                            </th>
                            <th className="text-end text-success">{money(pagado)}</th>
                            <th colSpan="2"></th>
                          </tr>
                          <tr>
                            <th colSpan="3" className="text-end">
                              PENDIENTE
                            </th>
                            <th className="text-end text-danger">{money(pendiente)}</th>
                            <th colSpan="2"></th>
                          </tr>
                        </>
                      );
                    })()}
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )}
      </Modal>

      {/* ============================================ */}
      {/* Modal: Asignar y Crear Alquiler (NUEVO)     */}
      {/* ============================================ */}
      <Modal
        open={openModalAlquiler}
        title={`🏠 Crear Alquiler - Equipo ${equipoAlquiler?.codigo || ""}`}
        onClose={() => setOpenModalAlquiler(false)}
        footer={
          <>
            <button
              className="btn btn-success"
              onClick={crearAlquiler}
              disabled={procesandoAlquiler}
            >
              {procesandoAlquiler ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Procesando...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-1"></i>
                  Crear Alquiler
                </>
              )}
            </button>
          </>
        }
      >
        {equipoAlquiler && (
          <div className="row g-3">
            
            {/* Información del equipo */}
            <div className="col-12">
              <div className="alert alert-info">
                <h6 className="alert-heading mb-2">
                  <i className="bi bi-info-circle me-1"></i>
                  Información del Equipo
                </h6>
                <div className="row">
                  <div className="col-6"><strong>Código:</strong> {equipoAlquiler.codigo}</div>
                  <div className="col-6"><strong>Estado:</strong> {equipoAlquiler.habilitado ? "✓ Habilitado" : "✗ Deshabilitado"}</div>
                </div>
              </div>
            </div>

            {/* Selección de usuario */}
            <div className="col-12">
              <label className="form-label fw-bold">
                <i className="bi bi-person me-1"></i>
                Cliente
                <span className="text-danger">*</span>
              </label>
              <select
                className="form-select"
                value={alquilerForm.usuario_id}
                onChange={(e) => setAlquilerForm({...alquilerForm, usuario_id: e.target.value})}
                required
              >
                <option value="">— Seleccionar cliente —</option>
                {usuarios.map((u) => (
                  <option key={u.id_usuario} value={u.id_usuario}>
                    {[u.nombres, u.primer_apellido, u.segundo_apellido].filter(Boolean).join(" ") || u.usuario}
                    {" - "}
                    {u.ci || "Sin CI"}
                  </option>
                ))}
              </select>
              <small className="text-muted">
                Si el cliente no existe, créalo primero en el módulo de Usuarios
              </small>
            </div>

            {/* Costos */}
            <div className="col-12">
              <div className="card bg-light">
                <div className="card-header bg-primary text-white">
                  <i className="bi bi-cash-coin me-1"></i>
                  Costos del Alquiler
                </div>
                <div className="card-body">
                  <div className="row g-3">
                    
                    <div className="col-md-6">
                      <label className="form-label">
                        <i className="bi bi-tools me-1"></i>
                        Costo de Instalación (Bs)
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={alquilerForm.costo_instalacion}
                        onChange={(e) => setAlquilerForm({...alquilerForm, costo_instalacion: Number(e.target.value) || 0})}
                        min="0"
                        step="10"
                      />
                      <small className="text-muted">Costo estándar: Bs 300</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">
                        <i className="bi bi-calendar-month me-1"></i>
                        Tarifa Mensual (Bs)
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={alquilerForm.tarifa_mensual}
                        onChange={(e) => setAlquilerForm({...alquilerForm, tarifa_mensual: Number(e.target.value) || 0})}
                        min="0"
                        step="10"
                      />
                      <small className="text-muted">Costo estándar: Bs 50/mes</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">
                        <i className="bi bi-piggy-bank me-1"></i>
                        Depósito en Garantía (Bs)
                      </label>
                      <input
                        type="number"
                        className="form-control"
                        value={alquilerForm.deposito}
                        onChange={(e) => setAlquilerForm({...alquilerForm, deposito: Number(e.target.value) || 0})}
                        min="0"
                        step="10"
                      />
                      <small className="text-muted">Opcional</small>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">
                        <i className="bi bi-calendar-event me-1"></i>
                        Fecha de Inicio
                      </label>
                      <input
                        type="date"
                        className="form-control"
                        value={alquilerForm.fecha_inicio}
                        onChange={(e) => setAlquilerForm({...alquilerForm, fecha_inicio: e.target.value})}
                      />
                    </div>

                  </div>
                </div>
              </div>
            </div>

            {/* Resumen del primer pago */}
            <div className="col-12">
              <div className="alert alert-success">
                <h6 className="alert-heading mb-2">
                  <i className="bi bi-receipt me-1"></i>
                  Primer Pago (A cobrar hoy + 7 días)
                </h6>
                <div className="row">
                  <div className="col-6">Instalación:</div>
                  <div className="col-6 text-end"><strong>Bs {Number(alquilerForm.costo_instalacion).toFixed(2)}</strong></div>
                  
                  <div className="col-6">Primer Mes:</div>
                  <div className="col-6 text-end"><strong>Bs {Number(alquilerForm.tarifa_mensual).toFixed(2)}</strong></div>
                  
                  <div className="col-12"><hr /></div>
                  
                  <div className="col-6"><strong>TOTAL:</strong></div>
                  <div className="col-6 text-end">
                    <strong className="fs-5 text-success">
                      Bs {(Number(alquilerForm.costo_instalacion) + Number(alquilerForm.tarifa_mensual)).toFixed(2)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Opciones */}
            <div className="col-12">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="generarCuotasAuto"
                  checked={alquilerForm.generar_cuotas}
                  onChange={(e) => setAlquilerForm({...alquilerForm, generar_cuotas: e.target.checked})}
                />
                <label className="form-check-label" htmlFor="generarCuotasAuto">
                  <i className="bi bi-calendar-check me-1"></i>
                  Generar cuotas automáticamente
                  <br />
                  <small className="text-muted">
                    Se creará la primera cuota (instalación + primer mes) y 12 cuotas mensuales posteriores
                  </small>
                </label>
              </div>
            </div>

          </div>
        )}
      </Modal>

      {/* ============================================ */}
      {/* Modal: Registrar Pago (NUEVO)               */}
      {/* ============================================ */}
      <Modal
        open={openModalPago}
        title={`💰 Registrar Pago - ${equipoPago?.codigo || ""}`}
        onClose={() => setOpenModalPago(false)}
        footer={
          <>
            <button
              className="btn btn-success"
              onClick={registrarPago}
              disabled={procesandoPago}
            >
              {procesandoPago ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Procesando...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-1"></i>
                  Registrar y Generar Recibo
                </>
              )}
            </button>
          </>
        }
      >
        {equipoPago && (
          <div className="row g-3">
            
            <div className="col-12">
              <div className="alert alert-info">
                <strong>Cliente:</strong> {nombreUsuario(equipoPago)}
                <br />
                <strong>Equipo:</strong> {equipoPago.codigo}
              </div>
            </div>

            <div className="col-md-6">
              <label className="form-label fw-bold">
                Monto (Bs)
                <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                className="form-control"
                value={pagoForm.monto}
                onChange={(e) => setPagoForm({...pagoForm, monto: e.target.value})}
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="col-md-6">
              <label className="form-label fw-bold">
                Método de Pago
              </label>
              <select
                className="form-select"
                value={pagoForm.metodo_pago}
                onChange={(e) => setPagoForm({...pagoForm, metodo_pago: e.target.value})}
              >
                <option value="efectivo">💵 Efectivo</option>
                <option value="transferencia">🏦 Transferencia</option>
                <option value="qr">📱 QR</option>
              </select>
            </div>

            <div className="col-12">
              <label className="form-label">
                Observaciones
              </label>
              <textarea
                className="form-control"
                rows="3"
                value={pagoForm.observaciones}
                onChange={(e) => setPagoForm({...pagoForm, observaciones: e.target.value})}
                placeholder="Opcional: agregar notas sobre el pago"
              />
            </div>

            <div className="col-12">
              <div className="alert alert-warning">
                <i className="bi bi-info-circle me-1"></i>
                Se marcará como pagada la siguiente cuota pendiente y se generará el recibo PDF automáticamente
              </div>
            </div>

          </div>
        )}
      </Modal>

      {/* ============================================ */}
      {/* Modal: Cambiar Usuario (NUEVO)              */}
      {/* ============================================ */}
      <Modal
        open={openModalCambioUsuario}
        title={`↔️ Cambiar Usuario - ${equipoCambio?.codigo || ""}`}
        onClose={() => setOpenModalCambioUsuario(false)}
        footer={
          <>
            <button
              className="btn btn-primary"
              onClick={cambiarUsuario}
              disabled={!nuevoUsuarioId}
            >
              <i className="bi bi-arrow-left-right me-1"></i>
              Cambiar Usuario
            </button>
          </>
        }
      >
        {equipoCambio && (
          <div className="row g-3">
            
            <div className="col-12">
              <div className="alert alert-warning">
                <h6 className="alert-heading">
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  Usuario Actual
                </h6>
                <strong>{nombreUsuario(equipoCambio)}</strong>
                <br />
                <small>Login: {equipoCambio.login}</small>
              </div>
            </div>

            <div className="col-12">
              <label className="form-label fw-bold">
                Nuevo Usuario
                <span className="text-danger">*</span>
              </label>
              <select
                className="form-select"
                value={nuevoUsuarioId}
                onChange={(e) => setNuevoUsuarioId(e.target.value)}
                required
              >
                <option value="">— Seleccionar nuevo usuario —</option>
                {usuarios
                  .filter(u => u.id_usuario !== equipoCambio.usuario_id)
                  .map((u) => (
                    <option key={u.id_usuario} value={u.id_usuario}>
                      {[u.nombres, u.primer_apellido, u.segundo_apellido].filter(Boolean).join(" ") || u.usuario}
                      {" - "}
                      {u.ci || "Sin CI"}
                    </option>
                  ))
                }
              </select>
            </div>

            <div className="col-12">
              <div className="alert alert-info">
                <i className="bi bi-info-circle me-1"></i>
                El historial de cuotas se mantendrá. Este cambio solo actualiza el usuario asignado al equipo.
              </div>
            </div>

          </div>
        )}
      </Modal>

    </div>
  );
}
