// src/utils/logger.js
/**
 * Logger condicional que solo muestra logs en desarrollo
 * En producción, los logs se suprimen para mejor performance y seguridad
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = {
  /**
   * Log normal - solo en desarrollo
   */
  log: (...args) => {
    if (isDevelopment) {
      console.log('📝', ...args);
    }
  },

  /**
   * Log de información - solo en desarrollo
   */
  info: (...args) => {
    if (isDevelopment) {
      console.info('ℹ️', ...args);
    }
  },

  /**
   * Log de advertencia - siempre se muestra
   */
  warn: (...args) => {
    console.warn('⚠️', ...args);
  },

  /**
   * Log de error - siempre se muestra
   */
  error: (...args) => {
    console.error('❌', ...args);
  },

  /**
   * Log de éxito - solo en desarrollo
   */
  success: (...args) => {
    if (isDevelopment) {
      console.log('✅', ...args);
    }
  },

  /**
   * Log de debug - solo en desarrollo
   */
  debug: (...args) => {
    if (isDevelopment) {
      console.debug('🐛', ...args);
    }
  },

  /**
   * Tabla de datos - solo en desarrollo
   */
  table: (data) => {
    if (isDevelopment) {
      console.table(data);
    }
  }
};

export default logger;
