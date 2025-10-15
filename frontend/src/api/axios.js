import axios from "axios";

// Usamos REACT_APP_API_BASE (definido en frontend/.env)
const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE || "http://localhost:3001",
  withCredentials: true,
  timeout: 10000,
});

// 🔑 Agrega token a cada request si existe en localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 🔁 Manejo común de errores
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    const path = window.location.pathname;

    // 401 → sesión expirada o token inválido
    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("rol");
      localStorage.removeItem("usuario");

      // Notificar a toda la app (escuchado en guards)
      window.dispatchEvent(new Event("auth-changed"));

      // Si no estás en login, opcionalmente redirige:
      if (path !== "/" && !path.includes("/login")) {
        // window.location.replace("/");
      }
    }

    // 423 → cuenta bloqueada temporalmente
    if (status === 423) {
      console.warn("Cuenta bloqueada temporalmente. Intenta más tarde.");
    }

    // 429 → demasiadas solicitudes
    if (status === 429) {
      console.warn("Demasiadas solicitudes. Intenta de nuevo en un momento.");
    }

    return Promise.reject(error);
  }
);

export default api;
