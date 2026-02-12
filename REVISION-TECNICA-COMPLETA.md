# 🔍 REVISIÓN TÉCNICA COMPLETA - SISTEMA ENERGÍA EÓLICA v008

**Fecha de Revisión:** 17 de octubre de 2025  
**Revisor:** Developer Senior  
**Estado del Proyecto:** ✅ OPERATIVO - Listo para expansión

---

## 📊 RESUMEN EJECUTIVO

### ✅ Estado General del Sistema
- **Backend:** Funcional y seguro
- **Frontend:** Operativo con React 19
- **Base de Datos:** Estructurada y normalizada
- **Autenticación:** Implementada con JWT + bcrypt
- **Seguridad:** Niveles básicos implementados

### 🎯 Arquitectura Detectada
```
SISTEMAENERGIA008/
├── backend/          → Express.js + MySQL (Puerto 3001)
├── frontend/         → React 19.1.0 (Puerto 3000)
└── sistema_energia_eolica.sql → MariaDB 10.4.32
```

---

## 🔐 ANÁLISIS DE SEGURIDAD Y AUTENTICACIÓN

### ✅ Puntos Fuertes Identificados

#### 1. **Sistema de Autenticación (CRÍTICO - NO MODIFICAR)**
```javascript
Endpoints Críticos Protegidos:
├── POST /login
│   ├── Validación de credenciales con bcrypt
│   ├── Generación de JWT tokens
│   ├── Rate limiting (100 intentos/15min)
│   ├── Sistema de bloqueo por intentos fallidos
│   └── Bitácora de accesos completa
│
├── GET /me
│   └── Verificación de token activo
│
└── GET /me-detalle
    └── Información del usuario logueado
```

**⚠️ ALERTA:** NO modificar estos endpoints sin respaldo completo.

#### 2. **Middleware de Autenticación**
```javascript
requireAuth(req, res, next)
├── Verifica token en headers Authorization
├── Valida firma JWT
├── Inyecta req.user = { cuenta_id, rol }
└── Retorna 401 si falla
```

#### 3. **Control de Roles**
```javascript
requireRole(...rolesPermitidos)
├── Verifica rol del usuario autenticado
├── Roles disponibles: 'administrador', 'usuario'
└── Retorna 403 si no tiene permisos
```

### 🔧 Configuración de Seguridad

#### Variables de Entorno Críticas (Backend)
```env
# Conexión a Base de Datos
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=sistema_energia_eolica

# Seguridad JWT
JWT_SECRET=tu_clave_secreta_super_segura_cambiala_en_produccion
JWT_EXPIRES=4h

# Servidor
PORT=3001
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3000
```

#### Variables de Entorno Críticas (Frontend)
```env
REACT_APP_API_BASE=http://localhost:3001
```

---

## 🗄️ ARQUITECTURA DE BASE DE DATOS

### Tablas Principales

#### 1. **Sistema de Usuarios y Autenticación**
```sql
cuentas (id_cuenta, usuario, contrasena, intentos_fallidos, bloqueado_hasta)
    ↓ 1:1
usuarios (id_usuario, cuenta_id, rol_id, nombres, apellidos, ci, telefono, email)
    ↓ N:1
roles (id_rol, nombre_rol) → [administrador, usuario]
```

**Características:**
- ✅ Separación cuenta vs perfil de usuario
- ✅ Hash de contraseñas con bcrypt
- ✅ Sistema de bloqueo temporal por intentos fallidos
- ✅ Timestamp de último acceso

#### 2. **Auditoría y Trazabilidad**
```sql
bitacora_accesos
├── Registra todos los intentos de login
├── IP, User Agent, resultado (éxito/fallo)
└── Motivos de fallo detallados

auditoria_usuarios
├── Acciones CRUD sobre usuarios
├── Actor y objetivo de la acción
└── Detalles en formato JSON
```

#### 3. **Gestión de Equipos Eólicos**
```sql
eolicos (id_eolico, codigo, activo, usuario_id, habilitado, costos)
    ↓ 1:N
alquileres (id_alquiler, eolico_id, usuario_id, fecha_inicio, estado)
    ↓ 1:N
cuotas (id_cuota, alquiler_id, concepto, monto, pagado, fecha_vencimiento)
```

**Características:**
- ✅ Sistema de asignación/desasignación de equipos
- ✅ Control de estado (activo, habilitado)
- ✅ Gestión de costos (tarifa, instalación, depósito, operativo)
- ✅ Sistema de cuotas con seguimiento de pagos

#### 4. **Monitoreo y Lecturas**
```sql
lecturas_resumen (id_lectura, usuario_id, voltaje, bateria, consumo, fecha_lectura)
ventanas_energia (id_ventana, usuario_id, hora, valor, fecha_registro)
```

---

## 🔌 ENDPOINTS DEL BACKEND

### 🔒 Autenticación y Sesión (NO MODIFICAR)

| Método | Ruta | Autenticación | Rol | Descripción |
|--------|------|---------------|-----|-------------|
| `GET` | `/health` | ❌ | - | Health check del servidor |
| `POST` | `/login` | ❌ | - | Login con bcrypt + JWT |
| `GET` | `/me` | ✅ | Todos | Verificar sesión activa |
| `GET` | `/me-detalle` | ✅ | Todos | Datos completos del usuario logueado |
| `POST` | `/forgot-password` | ❌ | - | Solicitar reset de contraseña |
| `POST` | `/reset-password` | ❌ | - | Restablecer contraseña |

### 👥 Gestión de Usuarios

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/usuarios` | Admin | Lista todos los usuarios |
| `POST` | `/usuarios` | Admin | Crear nuevo usuario |
| `PUT` | `/usuarios/:id` | Admin | Actualizar usuario |
| `DELETE` | `/usuarios/:id` | Admin | Eliminar usuario |

### 🌀 Gestión de Equipos Eólicos

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/eolicos` | Admin | Lista equipos eólicos |
| `POST` | `/eolicos` | Admin | Crear nuevo equipo |
| `PUT` | `/eolicos/:id` | Admin | Actualizar equipo |
| `PUT` | `/eolicos/:id/asignar` | Admin | Asignar equipo a usuario |
| `PUT` | `/eolicos/:id/desasignar` | Admin | Desasignar equipo |
| `PUT` | `/eolicos/:id/alternar-habilitado` | Admin | Habilitar/deshabilitar |
| `POST` | `/eolicos/:id/alquilar` | Admin | Crear alquiler |

### 💰 Sistema de Cuotas

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/alquileres/:id/cuotas` | Admin | Lista cuotas de un alquiler |
| `POST` | `/alquileres/:id/cuotas/generar` | Admin | Generar cuotas automáticas |
| `PUT` | `/cuotas/:id/pagar` | Admin | Marcar cuota como pagada |
| `GET` | `/eolicos/:id/recibo` | Admin | PDF de recibo |

### 📊 Monitoreo y Reportes

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/resumen` | Todos | Resumen de lecturas |
| `GET` | `/alertas` | Todos | Alertas del sistema |
| `GET` | `/reporte-usuarios` | Admin | Reporte CSV de usuarios |

### 👤 Endpoints de Usuario

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/cliente/dispositivos` | Usuario | Mis equipos asignados |
| `GET` | `/cliente/lecturas` | Usuario | Lecturas de mi equipo |

---

## ⚛️ ARQUITECTURA DEL FRONTEND

### Estructura de Componentes

```
frontend/src/
├── api/
│   └── axios.js ⚠️ → Configuración crítica de conexión
│
├── components/
│   ├── Layout.js → Layout principal con autenticación
│   ├── Navbar.js → Navegación según rol
│   ├── Footer.js
│   ├── Graficos.js
│   ├── GraficosEnergia.js
│   ├── AlertasDashboard.js
│   ├── ReportePDF.js
│   └── ui/
│       ├── CardSmartScroll.jsx
│       └── SmartScroll.jsx
│
├── pages/
│   ├── Login.js ⚠️ → Autenticación (NO MODIFICAR)
│   ├── ForgotPassword.js
│   ├── ResetPassword.js
│   ├── DashboardAdmin.js
│   ├── DashboardUsuario.js
│   ├── Usuarios.js
│   ├── Eolicos.js → Módulo de alquiler
│   ├── MisDispositivos.js
│   ├── DispositivoDetalle.js
│   ├── MonitoreoAdmin.js
│   ├── Reportes.js
│   ├── AlertasPage.js
│   ├── Contactos.js
│   └── Mensajes.js
│
└── App.js ⚠️ → Rutas y guards de autenticación
```

### 🚨 Archivos Críticos (NO MODIFICAR sin respaldo)

#### 1. **axios.js** - Cliente HTTP
```javascript
Características críticas:
├── Timeout de 15 segundos
├── Reintentos automáticos (3 intentos)
├── Inyección automática de JWT token
├── Manejo de errores 401 (redirección a login)
├── Manejo de errores 423 (cuenta bloqueada)
└── Detección de servidor caído
```

#### 2. **Login.js** - Autenticación
```javascript
Flujo crítico:
├── Validación de formato de email
├── POST /login con credenciales
├── Almacenamiento de token en localStorage
├── Almacenamiento de rol en localStorage
├── Redirección según rol a /dashboard
└── Manejo de errores (423, 401, 500, red)
```

#### 3. **App.js** - Routing y Guards
```javascript
Guards de seguridad:
├── PrivateRoute → Verifica token
├── AdminOnly → Verifica rol 'administrador'
├── DashboardWrapper → Redirige según rol
└── Fallback a login si no hay token
```

### Sistema de Autenticación del Frontend

```javascript
// Verificación de sesión en cada request
api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Manejo de sesión expirada
api.interceptors.response.use(
  res => res,
  error => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.replace("/");
    }
  }
);
```

---

## 📦 DEPENDENCIAS PRINCIPALES

### Backend (package.json)
```json
{
  "express": "^4.21.2",           → Framework web
  "mysql2": "^3.14.3",            → Cliente MySQL
  "bcryptjs": "^3.0.2",           → Hash de contraseñas
  "jsonwebtoken": "^9.0.2",       → Autenticación JWT
  "cors": "^2.8.5",               → CORS habilitado
  "helmet": "^8.1.0",             → Seguridad HTTP
  "express-rate-limit": "^8.0.1", → Rate limiting
  "express-validator": "^7.2.1",  → Validación de inputs
  "nodemailer": "^7.0.6",         → Envío de emails
  "pdfkit": "^0.17.2"             → Generación de PDFs
}
```

### Frontend (package.json)
```json
{
  "react": "^19.1.0",             → Framework UI
  "react-router-dom": "^7.7.0",   → Routing
  "axios": "^1.10.0",             → Cliente HTTP
  "bootstrap": "^5.3.7",          → Estilos
  "chart.js": "^4.5.0",           → Gráficos
  "jspdf": "^3.0.1"               → PDFs cliente
}
```

---

## 🚀 PROCESO DE INICIO DEL SISTEMA

### Script Automático (start-dev.ps1)
```powershell
Flujo de inicio:
├── 1. Verificar puertos 3000 y 3001
├── 2. Liberar puertos si están ocupados
├── 3. Verificar/crear archivos .env
├── 4. Iniciar backend (puerto 3001)
├── 5. Iniciar frontend (puerto 3000)
└── 6. Mostrar estado de conexión
```

### Inicio Manual
```bash
# Terminal 1 - Backend
cd backend
npm start  # Inicia en puerto 3001

# Terminal 2 - Frontend
cd frontend
npm start  # Inicia en puerto 3000
```

---

## 🔒 PUNTOS CRÍTICOS DE SEGURIDAD

### ⚠️ NO MODIFICAR SIN RESPALDO COMPLETO

1. **Backend: Middleware de autenticación**
   - `requireAuth()` en index.js
   - `requireRole()` en index.js

2. **Backend: Endpoint de login**
   - POST /login (línea ~134)
   - Lógica de bcrypt y JWT

3. **Backend: Conexión a base de datos**
   - Variable `db` (líneas 62-75)
   - Credenciales en .env

4. **Frontend: Cliente axios**
   - `frontend/src/api/axios.js`
   - Interceptores de request/response

5. **Frontend: Login**
   - `frontend/src/pages/Login.js`
   - Flujo de autenticación completo

6. **Frontend: Routing**
   - `frontend/src/App.js`
   - Guards PrivateRoute y AdminOnly

---

## 📋 MÓDULOS FUNCIONALES EXISTENTES

### ✅ Módulos Implementados

1. **Autenticación**
   - Login/Logout
   - Recuperación de contraseña
   - Sesiones con JWT

2. **Gestión de Usuarios (Admin)**
   - CRUD completo de usuarios
   - Asignación de roles
   - Auditoría de acciones

3. **Gestión de Equipos Eólicos (Admin)**
   - CRUD de equipos
   - Asignación/desasignación a usuarios
   - Estados: activo, habilitado

4. **Sistema de Alquileres**
   - Creación de alquileres
   - Gestión de costos
   - Sistema de cuotas

5. **Sistema de Cuotas**
   - Generación automática de cuotas
   - Registro de pagos
   - Recibos en PDF

6. **Dashboard Usuario**
   - Mis dispositivos
   - Lecturas de energía
   - Alertas personalizadas

7. **Dashboard Admin**
   - Monitoreo general
   - Gestión de usuarios
   - Reportes

8. **Reportes**
   - Exportación CSV
   - Generación de PDFs
   - Estadísticas

---

## 🛠️ RECOMENDACIONES PARA NUEVOS DESARROLLOS

### ✅ Prácticas Seguras para Agregar Funcionalidades

#### 1. **Agregar Nuevos Endpoints (Backend)**

```javascript
// ✅ BUENA PRÁCTICA: Copiar patrón existente
app.get('/nuevo-endpoint',
  requireAuth,                    // Siempre requerir autenticación
  requireRole('administrador'),   // Si es admin only
  [
    // Validaciones
    param('id').isInt({ min: 1 }),
    body('campo').isString().trim()
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }
    
    // Tu lógica aquí
    const cuentaId = req.user.cuenta_id; // Disponible por requireAuth
    const rol = req.user.rol;            // Disponible por requireAuth
    
    // Query a la BD
    db.query('SELECT ...', [params], (err, rows) => {
      if (err) return res.status(500).json({ mensaje: 'Error' });
      res.json(rows);
    });
  }
);
```

#### 2. **Agregar Nuevas Páginas (Frontend)**

```javascript
// En App.js, agregar dentro de <PrivateRoute>
<Route element={<AdminOnly />}>
  <Route path="/nueva-pagina" element={<NuevaPagina />} />
</Route>
```

#### 3. **Consumir API desde Frontend**

```javascript
// En cualquier componente
import api from '../api/axios';

// ✅ BUENA PRÁCTICA: Usar try-catch
const fetchData = async () => {
  try {
    const res = await api.get('/tu-endpoint');
    setData(res.data);
  } catch (error) {
    if (error.response?.status === 401) {
      // Token expirado, axios ya redirige
      console.error('Sesión expirada');
    } else {
      console.error('Error:', error.message);
    }
  }
};
```

#### 4. **Agregar Nueva Tabla en Base de Datos**

```sql
-- ✅ BUENA PRÁCTICA: Usar foreign keys
CREATE TABLE nueva_tabla (
  id_registro SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id SMALLINT UNSIGNED NOT NULL,
  campo VARCHAR(100) NOT NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_registro),
  KEY usuario_id (usuario_id),
  CONSTRAINT fk_nueva_usuario FOREIGN KEY (usuario_id) 
    REFERENCES usuarios (id_usuario) 
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

### ⚠️ CHECKLIST Antes de Modificar

- [ ] **Hacer respaldo completo de la base de datos**
- [ ] **Commitear cambios actuales en Git**
- [ ] **Probar que el login funciona correctamente**
- [ ] **Verificar que existe archivo .env con configuración**
- [ ] **Documentar cambios en archivo CHANGELOG.md**
- [ ] **No modificar middleware requireAuth ni requireRole**
- [ ] **No cambiar estructura de tabla `cuentas` ni `usuarios`**
- [ ] **No modificar flujo de login en frontend**

---

## 🐛 DEBUGGING Y RESOLUCIÓN DE PROBLEMAS

### Error: "No se pudo conectar con el servidor"

**Posibles causas:**
1. Backend no está corriendo
2. Puerto 3001 ocupado
3. Variable REACT_APP_API_BASE incorrecta
4. Firewall bloqueando conexión

**Solución:**
```powershell
# Verificar si backend está corriendo
Get-NetTCPConnection -LocalPort 3001

# Reiniciar con script
.\start-dev.ps1

# O manual
cd backend
npm start
```

### Error: "Token inválido o expirado"

**Causa:** JWT expiró (4 horas por defecto)

**Solución:**
```javascript
// Frontend limpia automáticamente y redirige
// Usuario debe hacer login nuevamente
```

### Error: "Cuenta bloqueada temporalmente"

**Causa:** 5 intentos fallidos de login

**Solución:**
```sql
-- Desbloquear cuenta manualmente (admin)
UPDATE cuentas 
SET intentos_fallidos = 0, bloqueado_hasta = NULL 
WHERE usuario = 'email@usuario.com';
```

### Error: Base de datos no conecta

**Verificar:**
```env
# backend/.env
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=sistema_energia_eolica
```

**Solución:**
```powershell
# Verificar MySQL está corriendo
Get-Service -Name MySQL*

# Importar BD si no existe
mysql -u root -p < sistema_energia_eolica.sql
```

---

## 📚 ESTRUCTURA DE ROLES Y PERMISOS

### Rol: Administrador

**Permisos:**
- ✅ CRUD completo de usuarios
- ✅ CRUD completo de equipos eólicos
- ✅ Gestión de alquileres y cuotas
- ✅ Asignación/desasignación de equipos
- ✅ Acceso a todos los reportes
- ✅ Monitoreo completo del sistema
- ✅ Visualización de auditoría

**Páginas accesibles:**
- /dashboard
- /usuarios
- /eolicos (alquiler)
- /admin/monitoreo
- /reportes
- /alertas
- /contactos
- /mensajes

### Rol: Usuario

**Permisos:**
- ✅ Ver mis equipos asignados
- ✅ Ver lecturas de mis equipos
- ✅ Ver mis alertas
- ✅ Generar reportes propios
- ❌ No puede gestionar otros usuarios
- ❌ No puede asignar equipos

**Páginas accesibles:**
- /dashboard
- /mis-dispositivos
- /mis-dispositivos/:codigo
- /alertas
- /reportes
- /contactos
- /mensajes

---

## 🔄 FLUJO DE DATOS COMPLETO

### Flujo de Login
```
1. Usuario ingresa email y contraseña en Login.js
2. Frontend valida formato de email
3. axios.post('/login', { usuario, contrasena })
4. Backend busca usuario en tabla cuentas
5. Backend verifica hash con bcrypt.compare()
6. Si OK: genera JWT y actualiza ultimo_acceso
7. Si FAIL: incrementa intentos_fallidos
8. Backend registra en bitacora_accesos
9. Frontend recibe { success, token, rol }
10. Frontend guarda en localStorage
11. Frontend configura axios headers
12. Frontend redirige a /dashboard
13. DashboardWrapper decide qué mostrar según rol
```

### Flujo de Request Autenticado
```
1. Componente hace: api.get('/endpoint')
2. Interceptor agrega: Authorization: Bearer <token>
3. Backend recibe request
4. Middleware requireAuth verifica token
5. Middleware requireRole verifica permisos
6. Backend ejecuta query
7. Backend retorna JSON
8. Frontend actualiza estado
9. Componente renderiza datos
```

### Flujo de Asignación de Equipo
```
1. Admin selecciona equipo en /eolicos
2. Admin selecciona usuario destino
3. Frontend: api.put(`/eolicos/${id}/asignar`, { usuario_id })
4. Backend verifica que equipo existe
5. Backend verifica que usuario existe
6. Backend actualiza: eolicos.usuario_id = usuario_id
7. Backend actualiza: eolicos.activo = 1
8. Backend retorna equipo actualizado
9. Frontend actualiza lista de equipos
```

---

## 📊 MÉTRICAS Y MONITOREO

### Tablas de Auditoría
```sql
-- Ver últimos accesos
SELECT * FROM bitacora_accesos 
ORDER BY creado_en DESC LIMIT 50;

-- Ver cambios en usuarios
SELECT * FROM auditoria_usuarios 
ORDER BY creado_en DESC LIMIT 50;

-- Usuarios bloqueados
SELECT usuario, intentos_fallidos, bloqueado_hasta 
FROM cuentas 
WHERE bloqueado_hasta > NOW();
```

### Estadísticas Disponibles
- Total de usuarios por rol
- Equipos activos vs inactivos
- Alquileres activos
- Cuotas pendientes de pago
- Lecturas por período
- Intentos de login fallidos

---

## 🎯 ROADMAP SUGERIDO PARA NUEVAS FUNCIONALIDADES

### Fácil de Implementar (Sin afectar core)
- [ ] Agregar más campos a perfil de usuario
- [ ] Nuevos tipos de reportes
- [ ] Gráficos adicionales
- [ ] Notificaciones por email
- [ ] Exportar datos en Excel
- [ ] Dashboard personalizable

### Moderado (Requiere cuidado)
- [ ] Sistema de mensajería entre usuarios
- [ ] Calendario de mantenimientos
- [ ] Gestión de inventario de repuestos
- [ ] Sistema de tickets de soporte
- [ ] Facturación automática

### Complejo (Requiere planificación)
- [ ] Multi-tenancy (múltiples organizaciones)
- [ ] API REST pública documentada
- [ ] App móvil (React Native)
- [ ] Integración con IoT devices
- [ ] Machine Learning para predicciones

---

## ✅ CONCLUSIÓN DE LA REVISIÓN

### Estado Actual
El sistema **SISTEMAENERGIA008** está:
- ✅ **Operativo y funcional**
- ✅ **Correctamente estructurado**
- ✅ **Con seguridad básica implementada**
- ✅ **Listo para recibir nuevos módulos**

### Puntos Críticos Identificados (NO TOCAR)
1. ✅ Sistema de autenticación (login, JWT, bcrypt)
2. ✅ Conexión a base de datos
3. ✅ Middleware requireAuth y requireRole
4. ✅ Cliente axios y sus interceptores
5. ✅ Guards de rutas en App.js

### Listo para Expansión
El sistema puede **recibir nuevas funcionalidades** siguiendo estos principios:
- Usar los patrones existentes
- No modificar el core de autenticación
- Mantener la estructura de roles
- Agregar tablas con foreign keys
- Documentar todos los cambios

### Próximos Pasos Recomendados
1. **Crear archivo .env** si no existe (usar INICIO-RAPIDO.md)
2. **Hacer backup de la base de datos actual**
3. **Crear branch en Git antes de nuevos desarrollos**
4. **Documentar requisitos de nuevas funcionalidades**
5. **Seguir patrones de este documento**

---

**Documento generado por:** Developer Senior  
**Versión:** 1.0  
**Última actualización:** 17 de octubre de 2025  

---

> ⚠️ **NOTA IMPORTANTE:** Conserva este documento como referencia antes de realizar cualquier modificación al sistema. Contiene información crítica sobre la arquitectura y puntos sensibles del proyecto.
