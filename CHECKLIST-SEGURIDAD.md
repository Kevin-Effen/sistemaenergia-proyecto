# 🔒 CHECKLIST DE SEGURIDAD - Sistema Energía Eólica

**Fecha:** 17 de octubre de 2025  
**Proyecto:** SISTEMAENERGIA008

---

## ⚠️ PUNTOS CRÍTICOS - NO MODIFICAR SIN RESPALDO

### Backend Critical Files

- [ ] `backend/index.js` (líneas 100-122) → Middleware `requireAuth()`
- [ ] `backend/index.js` (líneas 114-123) → Middleware `requireRole()`
- [ ] `backend/index.js` (líneas 134-221) → Endpoint `/login`
- [ ] `backend/index.js` (líneas 62-75) → Conexión a base de datos
- [ ] `backend/.env` → Variables de entorno críticas

### Frontend Critical Files

- [ ] `frontend/src/api/axios.js` → Cliente HTTP con interceptores
- [ ] `frontend/src/pages/Login.js` → Flujo de autenticación
- [ ] `frontend/src/App.js` → Guards de rutas (PrivateRoute, AdminOnly)
- [ ] `frontend/.env` → URL del backend

### Database Critical Tables

- [ ] `cuentas` → NO modificar estructura (id_cuenta, usuario, contrasena)
- [ ] `usuarios` → NO modificar relaciones (cuenta_id, rol_id)
- [ ] `roles` → NO agregar/eliminar roles sin adaptar código

---

## ✅ VERIFICACIÓN ANTES DE MODIFICAR

### Pre-Development Checklist

- [ ] **Backup completo de base de datos realizado**
  ```sql
  mysqldump -u root -p sistema_energia_eolica > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Git commit de código actual**
  ```bash
  git add .
  git commit -m "Checkpoint antes de modificar [DESCRIPCIÓN]"
  git branch feature/nueva-funcionalidad
  git checkout feature/nueva-funcionalidad
  ```

- [ ] **Login funciona correctamente**
  - Probado con usuario admin
  - Probado con usuario normal
  - Token se genera correctamente

- [ ] **Backend responde en puerto 3001**
  ```powershell
  curl http://localhost:3001/health
  ```

- [ ] **Frontend carga en puerto 3000**

- [ ] **Archivos .env configurados**

---

## 🔐 SEGURIDAD DE AUTENTICACIÓN

### Verificaciones de Login

#### Backend (/login endpoint)
- [ ] Usa `bcrypt.compare()` para verificar contraseñas
- [ ] Genera JWT con `jwt.sign()`
- [ ] Rate limit activo (100 req/15min)
- [ ] Sistema de bloqueo por 5 intentos fallidos
- [ ] Registra en `bitacora_accesos`
- [ ] Actualiza `ultimo_acceso` en tabla cuentas

#### Frontend (Login.js)
- [ ] Valida formato de email antes de enviar
- [ ] Maneja errores 401 (credenciales incorrectas)
- [ ] Maneja errores 423 (cuenta bloqueada)
- [ ] Maneja errores de red (servidor caído)
- [ ] Guarda token en localStorage
- [ ] Guarda rol en localStorage
- [ ] Redirige según rol a dashboard

### Verificaciones de Sesión

- [ ] Token se adjunta automáticamente en headers (axios interceptor)
- [ ] Token expirado redirige a login (401 handler)
- [ ] Logout limpia localStorage completamente
- [ ] `requireAuth` middleware verifica token en backend
- [ ] `requireRole` middleware verifica permisos

---

## 🗄️ SEGURIDAD DE BASE DE DATOS

### Integridad de Datos

- [ ] Todas las contraseñas están hasheadas (bcrypt)
- [ ] Foreign keys configuradas con ON DELETE CASCADE
- [ ] Campos obligatorios tienen validación NOT NULL
- [ ] Timestamps automáticos (created_at, updated_at)

### Auditoría Activa

- [ ] Tabla `bitacora_accesos` registra todos los login
- [ ] Tabla `auditoria_usuarios` registra CRUD de usuarios
- [ ] IPs y User Agents se registran

### Consultas SQL

- [ ] Todas usan prepared statements (?)
- [ ] No hay concatenación directa de strings en SQL
- [ ] Validación de inputs con express-validator

---

## 🛡️ SEGURIDAD DE ENDPOINTS

### Protección de Rutas

#### Rutas Públicas (sin requireAuth)
- [ ] `/health` → Solo información básica
- [ ] `/login` → Con rate limit
- [ ] `/forgot-password` → Con rate limit
- [ ] `/reset-password` → Con validación de token temporal

#### Rutas Autenticadas (requireAuth)
- [ ] `/me`
- [ ] `/me-detalle`
- [ ] `/resumen`
- [ ] `/alertas`
- [ ] `/cliente/dispositivos`
- [ ] `/cliente/lecturas`

#### Rutas Solo Admin (requireAuth + requireRole('administrador'))
- [ ] `/usuarios` (GET, POST, PUT, DELETE)
- [ ] `/eolicos` (todas las operaciones)
- [ ] `/alquileres` (gestión completa)
- [ ] `/cuotas` (gestión completa)
- [ ] `/reporte-usuarios`

### Validación de Inputs

- [ ] Todos los endpoints con body usan express-validator
- [ ] Todos los params numéricos usan `isInt({ min: 1 })`
- [ ] Strings tienen límite de longitud
- [ ] Emails validados con isEmail()

---

## ⚛️ SEGURIDAD DEL FRONTEND

### Routing y Navegación

- [ ] `PrivateRoute` protege rutas autenticadas
- [ ] `AdminOnly` protege rutas de administrador
- [ ] Redirección automática si no hay token
- [ ] Verificación de rol antes de mostrar componentes

### Gestión de Estado

- [ ] Token solo en localStorage (no en state global)
- [ ] Rol verificado en cada renderizado crítico
- [ ] Logout limpia todo el localStorage
- [ ] Evento 'auth-changed' actualiza componentes

### Comunicación con Backend

- [ ] Todas las peticiones usan cliente axios configurado
- [ ] Token se adjunta automáticamente
- [ ] Errores 401 limpian sesión y redirigen
- [ ] Timeout configurado (15 segundos)
- [ ] Reintentos automáticos en caso de fallo

---

## 🚀 CHECKLIST DE DESPLIEGUE

### Antes de Nuevas Funcionalidades

- [ ] **Documentar requisitos**
  - Qué hace la nueva funcionalidad
  - Qué endpoints necesita
  - Qué tablas necesita
  - Qué permisos requiere

- [ ] **Diseñar sin afectar core**
  - No modificar tablas existentes críticas
  - Agregar nuevas tablas con foreign keys
  - Nuevos endpoints siguen patrón existente
  - Nuevos componentes siguen estructura actual

- [ ] **Probar en desarrollo**
  - Login sigue funcionando
  - Roles funcionan correctamente
  - No hay errores 401 inesperados
  - Backend responde correctamente

### Después de Implementar

- [ ] **Testing completo**
  - Probar como admin
  - Probar como usuario
  - Probar sin sesión (debe redirigir)
  - Probar con token expirado

- [ ] **Verificar logs**
  - No hay errores en consola backend
  - No hay errores en consola frontend
  - Bitácora registra correctamente

- [ ] **Documentar cambios**
  - Actualizar CHANGELOG.md
  - Actualizar README si es necesario
  - Documentar nuevos endpoints

---

## 🐛 DEBUGGING CHECKLIST

### Error: "No se pudo conectar con el servidor"

- [ ] Backend está corriendo en puerto 3001
- [ ] Variable REACT_APP_API_BASE apunta a http://localhost:3001
- [ ] No hay firewall bloqueando
- [ ] CORS configurado correctamente

### Error: "Token inválido o expirado"

- [ ] JWT_SECRET es el mismo en backend y token generado
- [ ] Token no ha expirado (default 4h)
- [ ] Token está en formato correcto en header
- [ ] Middleware requireAuth está activo

### Error: "Cuenta bloqueada"

- [ ] Usuario tiene menos de 5 intentos fallidos
- [ ] `bloqueado_hasta` es NULL o pasado
- [ ] Resetear manualmente si es necesario

### Error: "Sin permisos"

- [ ] Usuario tiene el rol correcto en base de datos
- [ ] Token contiene el rol correcto
- [ ] requireRole está configurado correctamente

---

## 📊 MONITOREO DE SEGURIDAD

### Revisar Periódicamente

```sql
-- Usuarios bloqueados
SELECT usuario, intentos_fallidos, bloqueado_hasta 
FROM cuentas 
WHERE bloqueado_hasta > NOW();

-- Últimos intentos fallidos
SELECT * FROM bitacora_accesos 
WHERE exito = 0 
ORDER BY creado_en DESC 
LIMIT 50;

-- Últimos cambios de usuarios
SELECT * FROM auditoria_usuarios 
ORDER BY creado_en DESC 
LIMIT 50;

-- Usuarios sin rol definido (anomalía)
SELECT u.id_usuario, c.usuario 
FROM usuarios u 
JOIN cuentas c ON c.id_cuenta = u.cuenta_id 
WHERE u.rol_id IS NULL;
```

---

## ✅ APROBACIÓN FINAL

### Antes de Commit

- [ ] Código revisado
- [ ] Login probado y funciona
- [ ] Sin errores en consola
- [ ] Backup de BD realizado
- [ ] Documentación actualizada
- [ ] No se modificaron archivos críticos
- [ ] Tests manuales pasados

### Antes de Despliegue a Producción

- [ ] Variables de entorno de producción configuradas
- [ ] JWT_SECRET diferente a desarrollo
- [ ] Contraseñas de BD seguras
- [ ] CORS configurado para dominio de producción
- [ ] Rate limits apropiados para producción
- [ ] HTTPS configurado
- [ ] Backup automático de BD configurado

---

## 📞 CONTACTO DE EMERGENCIA

Si algo falla crítico en autenticación:

1. **Deshacer último commit**
   ```bash
   git revert HEAD
   git push
   ```

2. **Restaurar base de datos**
   ```sql
   mysql -u root -p sistema_energia_eolica < backup_YYYYMMDD_HHMMSS.sql
   ```

3. **Reiniciar servicios**
   ```powershell
   .\start-dev.ps1
   ```

---

**Última actualización:** 17 de octubre de 2025  
**Versión del checklist:** 1.0
