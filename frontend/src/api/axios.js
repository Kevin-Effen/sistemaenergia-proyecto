import axios from "axios";

// 🔧 Configuración de la API con reintentos automáticos
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE || "http://localhost:3001",
  withCredentials: true,
  timeout: 15000, // 15 segundos
  headers: {
    'Content-Type': 'application/json',
  },
});

// 📊 Estado de conexión
let isServerDown = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;

// 🔑 Agrega token a cada request si existe en localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    
    // Agregar timestamp para evitar caché
    config.params = {
      ...config.params,
      _t: Date.now()
    };
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 🔁 Manejo avanzado de errores con reconexión automática
api.interceptors.response.use(
  (res) => {
    // Reset de intentos si la petición fue exitosa
    if (isServerDown) {
      isServerDown = false;
      reconnectAttempts = 0;
      console.log("✅ Conexión con el servidor restablecida");
    }
    return res;
  },
  async (error) => {
    const originalRequest = error.config;
    const status = error?.response?.status;
    const path = window.location.pathname;

    // 🔌 Error de conexión (servidor caído o no disponible)
    if (!error.response) {
      // No hay respuesta del servidor
      if (!originalRequest._retry && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        originalRequest._retry = true;
        reconnectAttempts++;
        
        console.warn(`⚠️ Servidor no disponible. Intento ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}...`);
        
        // Esperar antes de reintentar (backoff exponencial)
        await new Promise(resolve => setTimeout(resolve, 1000 * reconnectAttempts));
        
        return api(originalRequest);
      } else {
        isServerDown = true;
        console.error("❌ No se pudo conectar con el servidor después de varios intentos");
      }
    }

    // 401 → sesión expirada o token inválido
    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("rol");
      localStorage.removeItem("usuario");

      // Notificar a toda la app
      window.dispatchEvent(new Event("auth-changed"));

      // Redirigir solo si no estás en login
      if (path !== "/" && !path.includes("/login") && !path.includes("/reset-password")) {
        console.warn("🔒 Sesión expirada. Redirigiendo al login...");
        setTimeout(() => {
          window.location.replace("/");
        }, 1000);
      }
    }

    // 423 → cuenta bloqueada temporalmente
    if (status === 423) {
      console.warn("🔒 Cuenta bloqueada temporalmente. Intenta más tarde.");
    }

    // 429 → demasiadas solicitudes
    if (status === 429) {
      console.warn("⏱️ Demasiadas solicitudes. Intenta de nuevo en un momento.");
    }

    // 500 → error del servidor
    if (status === 500) {
      console.error("💥 Error interno del servidor");
    }

    // 503 → servicio no disponible
    if (status === 503) {
      console.error("🚫 Servicio temporalmente no disponible");
    }

    return Promise.reject(error);
  }
);

export default api;
