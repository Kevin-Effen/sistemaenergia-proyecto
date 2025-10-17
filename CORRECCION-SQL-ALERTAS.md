# 🔧 Solución Error SQL - Columnas Inexistentes

## ❌ Error Encontrado

```
Error: Unknown column 'u.login' in 'field list'
```

**Causa**: El SQL intentaba acceder a columnas que **NO existen** en la tabla `usuarios`.

---

## 🔍 Análisis de la Base de Datos

### Estructura Real de las Tablas

#### Tabla `usuarios`
```sql
CREATE TABLE `usuarios` (
  `id_usuario` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `cuenta_id` smallint(5) unsigned NOT NULL,
  `rol_id` smallint(5) unsigned NOT NULL,
  `nombres` varchar(60),
  `primer_apellido` varchar(60),
  `segundo_apellido` varchar(60),
  `ci` varchar(20),
  `fecha_nacimiento` date,
  `telefono` varchar(25),
  `direccion` varchar(255),
  `email` varchar(120),
  ...
)
```

❌ **NO tiene columna `login`**  
❌ **NO tiene columna `rol`**

#### Tabla `cuentas`
```sql
CREATE TABLE `cuentas` (
  `id_cuenta` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `usuario` varchar(50) NOT NULL,        ← AQUÍ está el "login"
  `contrasena` varchar(255) NOT NULL,
  ...
)
```

✅ **Tiene columna `usuario`** (equivalente a login)

#### Tabla `roles`
```sql
CREATE TABLE `roles` (
  `id_rol` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `nombre` varchar(30) NOT NULL,         ← AQUÍ está el nombre del rol
  ...
)
```

✅ **Tiene columna `nombre`** (nombre del rol)

---

## ✅ Solución Implementada

### SQL INCORRECTO (antes):
```sql
SELECT 
  lr.voltaje, 
  lr.bateria, 
  lr.consumo, 
  lr.fecha_lectura,
  u.login,          ← ❌ NO EXISTE
  u.rol             ← ❌ NO EXISTE
FROM lecturas_resumen lr
JOIN usuarios u ON u.id_usuario = lr.usuario_id
WHERE ...
```

### SQL CORREGIDO (ahora):
```sql
SELECT 
  lr.voltaje, 
  lr.bateria, 
  lr.consumo, 
  lr.fecha_lectura,
  c.usuario as login,      ← ✅ De tabla cuentas
  r.nombre as rol          ← ✅ De tabla roles
FROM lecturas_resumen lr
JOIN usuarios u ON u.id_usuario = lr.usuario_id
JOIN cuentas c ON c.id_cuenta = u.cuenta_id     ← ✅ JOIN agregado
JOIN roles r ON r.id_rol = u.rol_id             ← ✅ JOIN agregado
WHERE ...
```

---

## 🔗 Relación de Tablas

```
lecturas_resumen
       ↓ (usuario_id)
    usuarios
       ↓ (cuenta_id)        ↓ (rol_id)
    cuentas              roles
  [usuario]            [nombre]
```

**Flujo de JOINs**:
1. `lecturas_resumen` → `usuarios` (por `usuario_id`)
2. `usuarios` → `cuentas` (por `cuenta_id`) → obtener `usuario` (login)
3. `usuarios` → `roles` (por `rol_id`) → obtener `nombre` (rol)

---

## 📝 Cambios en el Código

### Archivo: `backend/index.js`

**Líneas modificadas**: ~827-845

**Cambio realizado**:
```javascript
// ANTES (incorrecto)
const sql = `
  SELECT 
    lr.voltaje, lr.bateria, lr.consumo, lr.fecha_lectura,
    u.login,    // ❌ NO EXISTE
    u.rol       // ❌ NO EXISTE
  FROM lecturas_resumen lr
  JOIN usuarios u ON u.id_usuario = lr.usuario_id
  WHERE ...
`;

// DESPUÉS (correcto)
const sql = `
  SELECT 
    lr.voltaje, lr.bateria, lr.consumo, lr.fecha_lectura,
    c.usuario as login,    // ✅ Correcto
    r.nombre as rol        // ✅ Correcto
  FROM lecturas_resumen lr
  JOIN usuarios u ON u.id_usuario = lr.usuario_id
  JOIN cuentas c ON c.id_cuenta = u.cuenta_id      // ✅ Nuevo JOIN
  JOIN roles r ON r.id_rol = u.rol_id              // ✅ Nuevo JOIN
  WHERE ...
`;
```

---

## 🚀 Pasos para Aplicar

### 1. **Detener el backend actual**
   - En la terminal del backend: `Ctrl+C`

### 2. **Reiniciar el backend**
   ```powershell
   cd "C:\Users\kevin\Desktop\INCOS 2025\PROYECTO  SOCIO-PRODUCTIVO\SOFTWARE EOLICO\VERSIONES\sistemaenergia008\backend"
   node index.js
   ```

### 3. **Verificar que inicie sin errores**
   Deberías ver:
   ```
   ✅ Servidor escuchando en puerto 3001
   ✅ Conectado a MySQL (sistema_energia_eolica)
   ```

### 4. **Probar en el navegador**
   - Ve a: `http://localhost:3000/alertas`
   - Selecciona rango de fechas
   - Click en "Buscar"
   - ✅ Ya NO debe mostrar errores SQL

---

## 🧪 Resultado Esperado

### Vista Administrador
Al hacer búsqueda, la respuesta incluirá:
```json
[
  {
    "voltaje": 12.5,
    "bateria": 18.3,
    "consumo": 45.2,
    "fecha_lectura": "2025-10-17T10:30:00.000Z",
    "login": "cuba@gmail.com",           ← ✅ Usuario (login)
    "rol": "administrador"               ← ✅ Nombre del rol
  }
]
```

### Vista Usuario
Al hacer búsqueda, la respuesta incluirá:
```json
[
  {
    "voltaje": 12.5,
    "bateria": 85.3,
    "consumo": 45.2,
    "fecha_lectura": "2025-10-17T10:30:00.000Z"
  }
]
```

---

## ⚠️ Lección Aprendida

**Siempre verificar la estructura real de la base de datos antes de escribir SQL.**

### Comandos útiles para verificar columnas:

```sql
-- Ver estructura de una tabla
DESCRIBE usuarios;

-- Ver todas las columnas
SHOW COLUMNS FROM usuarios;

-- Ver el CREATE TABLE completo
SHOW CREATE TABLE usuarios;
```

---

## 📊 Resumen de Correcciones

| Elemento | Antes (Incorrecto) | Después (Correcto) |
|----------|-------------------|-------------------|
| **Login** | `u.login` | `c.usuario as login` |
| **Rol** | `u.rol` | `r.nombre as rol` |
| **JOINs** | 1 (usuarios) | 3 (usuarios + cuentas + roles) |
| **Resultado** | ❌ Error SQL | ✅ Funciona correctamente |

---

## ✅ Checklist de Verificación

Después de reiniciar:

- [ ] Backend inicia sin errores SQL
- [ ] Página `/alertas` carga sin "Error cargando datos"
- [ ] Filtros de fecha funcionan
- [ ] Botón "Buscar" trae datos correctamente
- [ ] Admin ve `login` y `rol` en las alertas
- [ ] Usuario ve sus alertas sin errores
- [ ] Botón PDF funciona correctamente

---

## 🎉 Estado Final

**Archivo modificado**: `backend/index.js`  
**Endpoint corregido**: `GET /alertas/admin-rango`  
**SQL corregido**: ✅ Usa columnas correctas con JOINs apropiados  
**Breaking changes**: Ninguno  
**Requiere reinicio**: ✅ Sí (backend)

---

**Fecha**: 17 de Octubre 2025  
**Solución**: SQL corregido para usar estructura real de BD  
**Estado**: ✅ Listo para probar
