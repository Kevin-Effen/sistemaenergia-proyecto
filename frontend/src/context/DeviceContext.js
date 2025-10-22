// src/context/DeviceContext.js
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const DeviceContext = createContext();

export const useDevice = () => {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDevice debe usarse dentro de DeviceProvider');
  }
  return context;
};

export const DeviceProvider = ({ children }) => {
  // Estado persistente en localStorage
  const [dispositivoSeleccionado, setDispositivoSeleccionadoState] = useState(() => {
    const saved = localStorage.getItem('dispositivoSeleccionado');
    return saved || null;
  });

  const [dispositivos, setDispositivos] = useState([]);

  // Guardar en localStorage cuando cambie (memoizado)
  const setDispositivoSeleccionado = useCallback((codigo) => {
    setDispositivoSeleccionadoState(codigo);
    if (codigo) {
      localStorage.setItem('dispositivoSeleccionado', codigo);
    } else {
      localStorage.removeItem('dispositivoSeleccionado');
    }
  }, []);

  // Limpiar al hacer logout
  useEffect(() => {
    const handleAuthChange = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setDispositivoSeleccionadoState(null);
        setDispositivos([]);
        localStorage.removeItem('dispositivoSeleccionado');
      }
    };

    window.addEventListener('auth-changed', handleAuthChange);
    return () => window.removeEventListener('auth-changed', handleAuthChange);
  }, []);

  const value = useMemo(() => ({
    dispositivoSeleccionado,
    setDispositivoSeleccionado,
    dispositivos,
    setDispositivos,
  }), [dispositivoSeleccionado, setDispositivoSeleccionado, dispositivos]);

  return (
    <DeviceContext.Provider value={value}>
      {children}
    </DeviceContext.Provider>
  );
};

export default DeviceContext;
