# 🚀 Sistema de Energía Eólica - Guía de Inicio

## 📋 Inicio Rápido

### Opción 1: Script Automático (Recomendado)

```powershell
.\start-dev.ps1
```

Este script:
- ✅ Verifica y libera los puertos 3000 y 3001
- ✅ Crea archivos .env automáticamente si no existen
- ✅ Inicia el backend en puerto 3001
- ✅ Inicia el frontend en puerto 3000
- ✅ Muestra el estado de conexión

### Opción 2: Inicio Manual

**Terminal 1 - Backend:**
```powershell
cd backend
npm start
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm start
```

## 🔧 Configuración

### Backend (.env)
```env
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=sistema_energia_eolica
JWT_SECRET=tu_clave_secreta_super_segura_cambiala_en_produccion
```

### Frontend (.env)
```env
REACT_APP_API_BASE=http://localhost:3001
```

## 🛠️ Solución de Problemas

### ❌ "No se pudo conectar con el servidor"

**Causa:** Backend no está corriendo o puerto 3001 bloqueado

**Solución:**
```powershell
# Verificar puertos
netstat -ano | Select-String "3001"

# Liberar puerto 3001
Get-Process -Id <PID> | Stop-Process -Force

# Reiniciar backend
cd backend
npm start
```

### ❌ Frontend no carga

**Causa:** Puerto 3000 ocupado o variables de entorno incorrectas

**Solución:**
```powershell
# Verificar puerto 3000
netstat -ano | Select-String "3000"

# Verificar .env existe
Test-Path .\frontend\.env

# Reiniciar frontend
cd frontend
npm start
```

### ❌ Error de conexión después de cambios

**Causa:** React no recarga variables de entorno automáticamente

**Solución:**
1. Detener frontend (Ctrl+C)
2. Reiniciar: `npm start`
3. Limpiar caché del navegador (Ctrl+Shift+R)

## 📊 Verificación de Estado

### Backend
```powershell
# Verificar que responde
curl http://localhost:3001
```

### Frontend
```
http://localhost:3000
```

## 🔒 Mejoras Implementadas

### 1. Reconexión Automática
- ✅ Intenta reconectar 3 veces antes de fallar
- ✅ Backoff exponencial entre intentos
- ✅ Reintentos transparentes para el usuario

### 2. Manejo Robusto de Errores
- ✅ Timeout de 15 segundos
- ✅ Detección automática de servidor caído
- ✅ Logs descriptivos en consola
- ✅ Caché deshabilitado para evitar datos antiguos

### 3. Script de Inicio
- ✅ Verificación de puertos
- ✅ Creación automática de .env
- ✅ Inicio ordenado de servicios
- ✅ Validación de que todo inició correctamente

## 📝 Comandos Útiles

```powershell
# Ver todos los procesos node
Get-Process node

# Ver puertos en uso
netstat -ano | Select-String "LISTENING"

# Matar proceso específico
Stop-Process -Id <PID> -Force

# Ver logs del backend (si usas PM2)
pm2 logs backend

# Reiniciar todo desde cero
.\start-dev.ps1
```

## 🎯 Buenas Prácticas

1. **Siempre** usa `start-dev.ps1` para iniciar en desarrollo
2. **Nunca** modifiques `.env` mientras los servidores están corriendo
3. **Limpia** el caché del navegador después de cambios en configuración
4. **Verifica** que ambos servicios iniciaron antes de probar

## 🐛 Reportar Problemas

Si encuentras algún error:
1. Revisa la consola del navegador (F12)
2. Revisa los logs del backend
3. Verifica que los puertos estén libres
4. Asegúrate de que los .env están correctos

---

**Desarrollado por:** Kevin Effen  
**Proyecto:** Sistema de Energía Eólica  
**Fecha:** Octubre 2025
