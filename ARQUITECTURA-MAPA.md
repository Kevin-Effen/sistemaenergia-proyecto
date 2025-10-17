# 🏗️ ARQUITECTURA DEL SISTEMA - Mapa Visual

**Proyecto:** SISTEMAENERGIA008  
**Fecha:** 17 de octubre de 2025

---

## 🌐 ARQUITECTURA GENERAL

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          SISTEMA ENERGÍA EÓLICA                          │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│                  │         │                  │         │                  │
│    FRONTEND      │ ◄──────►│     BACKEND      │ ◄──────►│   BASE DE DATOS  │
│   React 19.1.0   │  HTTP   │  Express.js      │   SQL   │  MariaDB 10.4    │
│   Puerto 3000    │  REST   │   Puerto 3001    │         │                  │
│                  │         │                  │         │                  │
└──────────────────┘         └──────────────────┘         └──────────────────┘
       │                              │                            │
       │                              │                            │
       ├─ Axios Client               ├─ JWT Authentication        ├─ Tablas
       ├─ React Router               ├─ bcrypt Passwords          │  ├─ cuentas
       ├─ Bootstrap 5                ├─ CORS Enabled              │  ├─ usuarios
       ├─ Chart.js                   ├─ Rate Limiting             │  ├─ roles
       └─ LocalStorage               ├─ Express Validator         │  ├─ eolicos
                                     └─ MySQL2 Client             │  ├─ alquileres
                                                                   │  ├─ cuotas
                                                                   │  ├─ lecturas_resumen
                                                                   │  └─ bitacora_accesos
```

---

## 🔐 FLUJO DE AUTENTICACIÓN

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FLUJO DE LOGIN COMPLETO                           │
└─────────────────────────────────────────────────────────────────────────┘

[1] USUARIO INGRESA CREDENCIALES
    │
    ├─► Login.js valida formato email
    │   ├─ Si inválido: muestra error
    │   └─ Si válido: continúa ▼
    │
[2] FRONTEND → BACKEND
    │
    POST /login
    {
      usuario: "email@dominio.com",
      contrasena: "password123"
    }
    │
[3] BACKEND PROCESA
    │
    ├─► Busca usuario en tabla 'cuentas'
    │   ├─ No existe → 401 "Usuario no encontrado"
    │   └─ Existe → continúa ▼
    │
    ├─► Verifica bloqueado_hasta
    │   ├─ Bloqueado → 423 "Cuenta bloqueada"
    │   └─ No bloqueado → continúa ▼
    │
    ├─► bcrypt.compare(input, hash_db)
    │   ├─ Falla → incrementa intentos_fallidos
    │   │         → si >= 5 → bloquea 15 minutos
    │   │         → 401 "Contraseña incorrecta"
    │   └─ OK → continúa ▼
    │
    ├─► Genera JWT Token
    │   jwt.sign({
    │     cuenta_id: X,
    │     rol: "administrador"
    │   }, JWT_SECRET, { expiresIn: '4h' })
    │
    ├─► Actualiza último_acceso
    │   UPDATE cuentas SET ultimo_acceso = NOW()
    │
    └─► Registra en bitacora
        INSERT INTO bitacora_accesos
        (cuenta_id, ip, exito, motivo)
    │
[4] BACKEND → FRONTEND
    │
    {
      success: true,
      token: "eyJhbGc...",
      rol: "administrador",
      usuario: "email@dominio.com"
    }
    │
[5] FRONTEND GUARDA SESIÓN
    │
    ├─► localStorage.setItem("token", token)
    ├─► localStorage.setItem("rol", rol)
    ├─► localStorage.setItem("usuario", JSON.stringify(...))
    │
[6] FRONTEND CONFIGURA AXIOS
    │
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`
    │
[7] REDIRECCIÓN
    │
    ├─ Si rol = "administrador" → /dashboard (DashboardAdmin)
    └─ Si rol = "usuario"       → /dashboard (DashboardUsuario)

```

---

## 🛡️ FLUJO DE REQUEST AUTENTICADO

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    REQUEST AUTENTICADO TÍPICO                            │
└─────────────────────────────────────────────────────────────────────────┘

[COMPONENTE] Usuarios.js
    │
    const fetchUsuarios = async () => {
      const res = await api.get('/usuarios');
      setUsuarios(res.data);
    }
    │
[AXIOS INTERCEPTOR REQUEST]
    │
    ├─► Lee token de localStorage
    ├─► Agrega header: Authorization: Bearer eyJhbGc...
    ├─► Agrega timestamp anti-caché
    └─► Envía request ▼
    │
[BACKEND] GET /usuarios
    │
    ├─► [1] Middleware: requireAuth
    │        │
    │        ├─ Extrae token de header
    │        ├─ jwt.verify(token, JWT_SECRET)
    │        │  ├─ Inválido → 401
    │        │  └─ Válido → req.user = { cuenta_id, rol }
    │        └─ next() ▼
    │
    ├─► [2] Middleware: requireRole('administrador')
    │        │
    │        ├─ Verifica req.user.rol
    │        │  ├─ No es admin → 403 "Sin permisos"
    │        │  └─ Es admin → next() ▼
    │
    ├─► [3] Handler del endpoint
    │        │
    │        ├─ Ejecuta query SQL
    │        ├─ db.query('SELECT * FROM usuarios...')
    │        └─ res.json(usuarios) ▼
    │
[BACKEND → FRONTEND]
    │
    [
      { id_usuario: 1, nombres: "Juan", ... },
      { id_usuario: 2, nombres: "María", ... }
    ]
    │
[AXIOS INTERCEPTOR RESPONSE]
    │
    ├─ Status 200 → OK, retorna data
    ├─ Status 401 → Limpia localStorage, redirige a /
    ├─ Status 403 → Error "Sin permisos"
    └─ Status 500 → Error "Servidor"
    │
[COMPONENTE] Usuarios.js
    │
    setUsuarios(res.data)
    │
[RENDERIZADO]
    │
    Muestra tabla de usuarios
```

---

## 📊 ESTRUCTURA DE BASE DE DATOS

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     DIAGRAMA ENTIDAD-RELACIÓN                            │
└─────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │    roles     │
                    ├──────────────┤
                    │ id_rol (PK)  │
                    │ nombre_rol   │
                    └──────┬───────┘
                           │
                           │ 1:N
                           ▼
    ┌──────────────┐      ┌──────────────────┐
    │   cuentas    │      │    usuarios      │
    ├──────────────┤ 1:1  ├──────────────────┤
    │ id_cuenta(PK)├─────►│ id_usuario (PK)  │
    │ usuario      │      │ cuenta_id (FK)   │
    │ contrasena   │      │ rol_id (FK)──────┘
    │ intentos_f   │      │ nombres          │
    │ bloqueado_h  │      │ apellidos        │
    │ ultimo_acc   │      │ ci, telefono     │
    │ reset_token  │      │ email, direccion │
    └──────┬───────┘      └────────┬─────────┘
           │                       │
           │ 1:N                   │ 1:N
           ▼                       ▼
    ┌──────────────────┐   ┌──────────────────┐
    │ bitacora_accesos │   │     eolicos      │
    ├──────────────────┤   ├──────────────────┤
    │ id (PK)          │   │ id_eolico (PK)   │
    │ cuenta_id (FK)   │   │ codigo (UNIQUE)  │
    │ ip, agente       │   │ usuario_id (FK)  │
    │ exito, motivo    │   │ activo, habilitado│
    │ creado_en        │   │ tarifas...       │
    └──────────────────┘   └────────┬─────────┘
                                    │
                                    │ 1:N
                                    ▼
                            ┌──────────────────┐
                            │   alquileres     │
                            ├──────────────────┤
                            │ id_alquiler (PK) │
                            │ eolico_id (FK)   │
                            │ usuario_id (FK)  │
                            │ fecha_inicio     │
                            │ fecha_fin        │
                            │ estado           │
                            └────────┬─────────┘
                                     │
                                     │ 1:N
                                     ▼
                            ┌──────────────────┐
                            │     cuotas       │
                            ├──────────────────┤
                            │ id_cuota (PK)    │
                            │ alquiler_id (FK) │
                            │ concepto         │
                            │ numero           │
                            │ monto            │
                            │ pagado           │
                            │ fecha_pago       │
                            └──────────────────┘

    ┌──────────────────┐           ┌──────────────────┐
    │auditoria_usuarios│           │lecturas_resumen  │
    ├──────────────────┤           ├──────────────────┤
    │ id (PK)          │           │ id_lectura (PK)  │
    │ actor_cuenta_id  │           │ usuario_id (FK)  │
    │ accion           │           │ voltaje, bateria │
    │ objetivo_cuenta  │           │ consumo          │
    │ detalle (JSON)   │           │ fecha_lectura    │
    └──────────────────┘           └──────────────────┘
```

---

## 🗂️ ESTRUCTURA DE ARCHIVOS

```
SISTEMAENERGIA008/
│
├── 📄 REVISION-TECNICA-COMPLETA.md  ← Este documento
├── 📄 CHECKLIST-SEGURIDAD.md
├── 📄 INICIO-RAPIDO.md
├── 📄 package.json                  (Firebase dependency)
├── 📄 sistema_energia_eolica.sql    (Estructura completa de BD)
├── 📄 start-dev.ps1                 (Script de inicio automático)
│
├── 📁 backend/
│   ├── 📄 package.json
│   ├── 📄 index.js                  ⚠️ ARCHIVO CRÍTICO (1696 líneas)
│   ├── 📄 db.js                     (vacío - conexión en index.js)
│   ├── 📄 recibo.js                 (generación de recibos PDF)
│   ├── 📄 reportePDF.js             (reportes en PDF)
│   └── 📁 scripts/
│       └── 📄 migrate_passwords.js
│
└── 📁 frontend/
    ├── 📄 package.json
    ├── 📄 README.md
    │
    ├── 📁 public/
    │   ├── index.html
    │   ├── manifest.json
    │   └── robots.txt
    │
    └── 📁 src/
        ├── 📄 App.js                ⚠️ ARCHIVO CRÍTICO (routing)
        ├── 📄 index.js
        ├── 📄 App.css
        ├── 📄 index.css
        │
        ├── 📁 api/
        │   └── 📄 axios.js          ⚠️ ARCHIVO CRÍTICO (cliente HTTP)
        │
        ├── 📁 components/
        │   ├── 📄 Layout.js
        │   ├── 📄 Navbar.js
        │   ├── 📄 Footer.js
        │   ├── 📄 Graficos.js
        │   ├── 📄 GraficosEnergia.js
        │   ├── 📄 AlertasDashboard.js
        │   ├── 📄 ReportePDF.js
        │   └── 📁 ui/
        │       ├── CardSmartScroll.jsx
        │       └── SmartScroll.jsx
        │
        ├── 📁 pages/
        │   ├── 📄 Login.js          ⚠️ ARCHIVO CRÍTICO (autenticación)
        │   ├── 📄 ForgotPassword.js
        │   ├── 📄 ResetPassword.js
        │   ├── 📄 DashboardAdmin.js
        │   ├── 📄 DashboardUsuario.js
        │   ├── 📄 Usuarios.js
        │   ├── 📄 UsuarioDetalle.js
        │   ├── 📄 Eolicos.js        (Módulo de alquiler)
        │   ├── 📄 MisDispositivos.js
        │   ├── 📄 DispositivoDetalle.js
        │   ├── 📄 MonitoreoAdmin.js
        │   ├── 📄 Reportes.js
        │   ├── 📄 AlertasPage.js
        │   ├── 📄 Contactos.js
        │   └── 📄 Mensajes.js
        │
        └── 📁 styles/
            ├── alquiler-responsive.css
            └── card-scroll.css
```

---

## 🚦 MAPA DE RUTAS Y PERMISOS

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         RUTAS DEL FRONTEND                               │
└─────────────────────────────────────────────────────────────────────────┘

🌐 RUTAS PÚBLICAS (sin autenticación)
├─ / ................................. Login.js
├─ /forgot-password .................. ForgotPassword.js
└─ /reset-password/:token ............ ResetPassword.js

🔒 RUTAS AUTENTICADAS (requiere token válido)
│
├─ /dashboard ........................ DashboardWrapper
│  ├─ Admin → DashboardAdmin.js
│  └─ Usuario → DashboardUsuario.js
│
├─ 👥 SOLO ADMINISTRADOR
│  ├─ /usuarios ...................... Usuarios.js (lista)
│  ├─ /usuarios/:id .................. UsuarioDetalle.js
│  ├─ /eolicos ....................... Eolicos.js (alquiler)
│  ├─ /alquiler ...................... Eolicos.js (alias)
│  └─ /admin/monitoreo ............... MonitoreoAdmin.js
│
└─ 🔓 AUTENTICADOS (admin + usuario)
   ├─ /contactos ..................... Contactos.js
   ├─ /mensajes ...................... Mensajes.js
   ├─ /alertas ....................... AlertasPage.js
   ├─ /graficos ...................... Graficos.js
   ├─ /reportes ...................... Reportes.js
   ├─ /mis-dispositivos .............. MisDispositivos.js
   └─ /mis-dispositivos/:codigo ...... DispositivoDetalle.js
```

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       ENDPOINTS DEL BACKEND                              │
└─────────────────────────────────────────────────────────────────────────┘

🌐 PÚBLICOS
├─ GET    /health
├─ POST   /login             [rate-limit: 100/15min]
├─ POST   /forgot-password   [rate-limit: 20/15min]
└─ POST   /reset-password    [rate-limit: 20/15min]

🔒 AUTENTICADOS (requireAuth)
├─ GET    /me
├─ GET    /me-detalle
├─ GET    /resumen
├─ GET    /alertas
├─ GET    /cliente/dispositivos
└─ GET    /cliente/lecturas

🔐 SOLO ADMIN (requireAuth + requireRole('administrador'))
│
├─ 👥 USUARIOS
│  ├─ GET     /usuarios
│  ├─ POST    /usuarios
│  ├─ PUT     /usuarios/:id
│  └─ DELETE  /usuarios/:id
│
├─ 🌀 EOLICOS
│  ├─ GET     /eolicos
│  ├─ POST    /eolicos
│  ├─ PUT     /eolicos/:id
│  ├─ PUT     /eolicos/:id/asignar
│  ├─ PUT     /eolicos/:id/desasignar
│  └─ PUT     /eolicos/:id/alternar-habilitado
│
├─ 💰 ALQUILERES Y CUOTAS
│  ├─ POST    /eolicos/:id/alquilar
│  ├─ GET     /alquileres/:id/cuotas
│  ├─ POST    /alquileres/:id/cuotas/generar
│  ├─ PUT     /cuotas/:id/pagar
│  └─ GET     /eolicos/:id/recibo          [PDF]
│
└─ 📊 REPORTES
   └─ GET     /reporte-usuarios            [CSV]
```

---

## 🔄 CICLO DE VIDA DE DATOS

```
┌─────────────────────────────────────────────────────────────────────────┐
│              FLUJO DE ASIGNACIÓN DE EQUIPO A USUARIO                    │
└─────────────────────────────────────────────────────────────────────────┘

[1] ADMIN EN PÁGINA /eolicos
    │
    ├─ Carga lista de equipos disponibles
    │  GET /eolicos
    │
    └─ Selecciona equipo + usuario destino
        │
[2] ASIGNACIÓN
    │
    PUT /eolicos/:id/asignar
    {
      usuario_id: 5
    }
    │
[3] BACKEND VALIDA
    │
    ├─ requireAuth → OK
    ├─ requireRole('administrador') → OK
    ├─ Equipo existe → OK
    ├─ Usuario existe → OK
    └─ Equipo no está asignado → OK
        │
[4] BACKEND ACTUALIZA
    │
    UPDATE eolicos 
    SET usuario_id = 5, 
        activo = 1
    WHERE id_eolico = :id
    │
[5] BACKEND RESPONDE
    │
    {
      success: true,
      equipo: {
        id_eolico: 3,
        codigo: "0003",
        usuario_id: 5,
        activo: true
      }
    }
    │
[6] FRONTEND ACTUALIZA
    │
    ├─ Actualiza lista de equipos
    ├─ Muestra notificación de éxito
    └─ Equipo ahora aparece como "Asignado"
```

```
┌─────────────────────────────────────────────────────────────────────────┐
│              FLUJO DE GENERACIÓN DE CUOTAS DE ALQUILER                  │
└─────────────────────────────────────────────────────────────────────────┘

[1] ADMIN CREA ALQUILER
    │
    POST /eolicos/:id/alquilar
    {
      usuario_id: 5,
      tarifa_mes: 100.00,
      meses: 6,
      costo_instalacion: 50.00,
      deposito: 30.00
    }
    │
[2] BACKEND CREA ALQUILER
    │
    INSERT INTO alquileres 
    (eolico_id, usuario_id, estado, tarifa_mes, ...)
    VALUES (...)
    │
    ├─ Retorna { alquiler_id: 10 }
    │
[3] ADMIN GENERA CUOTAS
    │
    POST /alquileres/10/cuotas/generar
    {
      meses: 6,
      tarifa_mes: 100.00
    }
    │
[4] BACKEND GENERA CUOTAS
    │
    ├─ Calcula: 100 / 6 = 16.67 por mes
    │
    ├─ INSERT cuota 1: vence 2025-11-17, monto 16.67
    ├─ INSERT cuota 2: vence 2025-12-17, monto 16.67
    ├─ INSERT cuota 3: vence 2026-01-17, monto 16.67
    ├─ INSERT cuota 4: vence 2026-02-17, monto 16.67
    ├─ INSERT cuota 5: vence 2026-03-17, monto 16.67
    └─ INSERT cuota 6: vence 2026-04-17, monto 16.70 (ajuste)
        │
[5] CUOTAS DISPONIBLES
    │
    GET /alquileres/10/cuotas
    │
    [
      { numero: 1, monto: 16.67, pagado: false, ... },
      { numero: 2, monto: 16.67, pagado: false, ... },
      ...
    ]
    │
[6] REGISTRAR PAGO
    │
    PUT /cuotas/:id/pagar
    {
      metodo_pago: "efectivo",
      observaciones: "Caja"
    }
    │
    UPDATE cuotas 
    SET pagado = 1, 
        fecha_pago = NOW(),
        metodo_pago = 'efectivo',
        observaciones = 'Caja'
    WHERE id_cuota = :id
```

---

## 🎨 FLUJO DE COMPONENTES REACT

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    JERARQUÍA DE COMPONENTES                              │
└─────────────────────────────────────────────────────────────────────────┘

App.js
├── BrowserRouter
    ├── Routes
        │
        ├─ Route (públicas)
        │  ├─ Login
        │  ├─ ForgotPassword
        │  └─ ResetPassword
        │
        └─ Route (PrivateRoute)
           └─ Layout
              ├─ Navbar
              │  ├─ Muestra logo
              │  ├─ Links según rol
              │  └─ Botón logout
              │
              ├─ Outlet (contenido de páginas)
              │  │
              │  ├─ DashboardWrapper
              │  │  ├─ Si admin → DashboardAdmin
              │  │  └─ Si usuario → DashboardUsuario
              │  │
              │  ├─ AdminOnly (solo admin)
              │  │  ├─ Usuarios
              │  │  ├─ UsuarioDetalle
              │  │  ├─ Eolicos
              │  │  └─ MonitoreoAdmin
              │  │
              │  └─ Páginas comunes
              │     ├─ Contactos
              │     ├─ Mensajes
              │     ├─ AlertasPage
              │     ├─ Graficos
              │     ├─ Reportes
              │     ├─ MisDispositivos
              │     └─ DispositivoDetalle
              │
              └─ Footer
```

---

## 🔐 FLUJO DE SEGURIDAD COMPLETO

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CAPAS DE SEGURIDAD                                  │
└─────────────────────────────────────────────────────────────────────────┘

CAPA 1: FRONTEND - Guards de Rutas
├─ PrivateRoute verifica localStorage token
├─ AdminOnly verifica localStorage rol = 'administrador'
└─ Redirección automática si falla

CAPA 2: FRONTEND - Axios Interceptors
├─ Agrega token a cada request
├─ Detecta 401 y limpia sesión
└─ Detecta servidor caído y reintenta

CAPA 3: BACKEND - CORS y Headers
├─ CORS solo permite http://localhost:3000
├─ Helmet agrega headers de seguridad
└─ Rate limiting en rutas sensibles

CAPA 4: BACKEND - Middleware requireAuth
├─ Extrae y verifica token JWT
├─ Valida firma y expiración
└─ Inyecta req.user con cuenta_id y rol

CAPA 5: BACKEND - Middleware requireRole
├─ Verifica rol del usuario
└─ Retorna 403 si no tiene permisos

CAPA 6: BACKEND - Validación de Inputs
├─ express-validator en cada endpoint
├─ Sanitización de strings
└─ Validación de tipos y rangos

CAPA 7: BASE DE DATOS - Prepared Statements
├─ Todas las queries usan ?
├─ No hay concatenación de strings
└─ Protección contra SQL Injection

CAPA 8: BASE DE DATOS - Constraints
├─ Foreign keys con ON DELETE CASCADE
├─ Campos NOT NULL obligatorios
└─ UNIQUE constraints en campos críticos

CAPA 9: BASE DE DATOS - Auditoría
├─ Tabla bitacora_accesos registra logins
├─ Tabla auditoria_usuarios registra cambios
└─ Timestamps automáticos en todas las tablas
```

---

**Última actualización:** 17 de octubre de 2025  
**Versión:** 1.0
