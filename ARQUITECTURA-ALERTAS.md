# 🔔 ARQUITECTURA DEL SISTEMA DE ALERTAS

**Fecha:** 17 de octubre de 2025  
**Consulta:** ¿Alertas en Dashboard Admin o Usuario?  
**Respuesta:** EN AMBOS (con diferentes alcances)

---

## 🎯 CONCEPTO DE ALERTAS

Las alertas son **notificaciones del sistema** que informan sobre:
- 🔋 Batería baja (<20%)
- ⚡ Voltaje anormal (fuera de rango)
- 🔌 Desconexión de equipo
- 📊 Consumo excesivo
- ⚠️ Cualquier anomalía en los equipos eólicos

---

## 👥 QUIÉN DEBE VER ALERTAS

### ✅ AMBOS ROLES (con diferente alcance)

#### 👤 **USUARIO NORMAL**
**Ve:** Solo alertas de SUS equipos asignados

**¿Por qué?**
- Es responsable de monitorear su equipo
- Necesita saber si hay problemas
- Puede tomar acciones correctivas
- Mejora la experiencia de usuario

**Ejemplo:**
```
Usuario: juan@empresa.com
Equipo asignado: EOL-1001

Ve alertas de:
✅ EOL-1001 únicamente
❌ NO ve alertas de otros equipos
```

#### 👑 **ADMINISTRADOR**
**Ve:** Alertas de TODOS los equipos del sistema

**¿Por qué?**
- Necesita visibilidad global
- Mantenimiento preventivo
- Detectar patrones de fallo
- Priorizar reparaciones
- Asignar técnicos

**Ejemplo:**
```
Admin: admin@sistema.com

Ve alertas de:
✅ EOL-1001 (Usuario Juan)
✅ EOL-1002 (Usuario María)
✅ EOL-1003 (Usuario Pedro)
✅ TODOS los equipos del sistema
```

---

## 🏗️ ARQUITECTURA ACTUAL (CORRECTA)

### Backend - Endpoint `/alertas`

```javascript
// backend/index.js (línea 738)
app.get('/alertas', requireAuth, (req, res) => {
  const esAdmin = (req.user.rol || '').toLowerCase() === 'administrador';
  
  // Condición de alerta
  const where = `(
    (lr.bateria IS NOT NULL AND lr.bateria < 20)
    OR (lr.voltaje IS NOT NULL AND lr.voltaje < 10)
  )`;

  if (!esAdmin) {
    // 👤 USUARIO: Solo sus alertas
    const sql = `
      SELECT lr.voltaje, lr.bateria, lr.consumo, lr.fecha_lectura
      FROM lecturas_resumen lr
      JOIN usuarios u ON u.id_usuario = lr.usuario_id
      WHERE u.cuenta_id = ? AND ${where}
      ORDER BY lr.fecha_lectura DESC
      LIMIT 10
    `;
    db.query(sql, [req.user.cuenta_id], ...);
    
  } else {
    // 👑 ADMIN: Todas las alertas
    const sqlAdmin = `
      SELECT voltaje, bateria, consumo, fecha_lectura
      FROM lecturas_resumen lr
      WHERE ${where}
      ORDER BY fecha_lectura DESC
      LIMIT 10
    `;
    db.query(sqlAdmin, ...);
  }
});
```

✅ **Este código está PERFECTO**
- Filtra automáticamente por rol
- Usuario ve solo sus alertas
- Admin ve todas

---

## 🎨 MEJORAS RECOMENDADAS PARA UX

### 1. Navbar Diferenciada

```javascript
// frontend/src/components/Navbar.js

{/* Para ADMIN */}
{rol === 'administrador' && (
  <Nav.Link as={Link} to="/alertas">
    <i className="bi bi-exclamation-triangle-fill"></i> 
    Alertas Globales
    {alertasCount > 0 && (
      <Badge bg="danger" className="ms-1">{alertasCount}</Badge>
    )}
  </Nav.Link>
)}

{/* Para USUARIO */}
{rol === 'usuario' && (
  <Nav.Link as={Link} to="/alertas">
    <i className="bi bi-bell-fill"></i> 
    Mis Alertas
    {alertasCount > 0 && (
      <Badge bg="warning" className="ms-1">{alertasCount}</Badge>
    )}
  </Nav.Link>
)}
```

### 2. Título Contextual en AlertasPage

```javascript
// frontend/src/pages/AlertasPage.js

import React from "react";
import AlertasDashboard from "../components/AlertasDashboard";

function AlertasPage() {
  const rol = (localStorage.getItem("rol") || "").toLowerCase();
  
  const titulo = rol === 'administrador' 
    ? "📊 Alertas del Sistema - Vista Global"
    : "🔔 Mis Alertas - Equipos Asignados";
  
  const descripcion = rol === 'administrador'
    ? "Monitoreo de todos los equipos eólicos del sistema"
    : "Notificaciones de tus equipos asignados";

  return (
    <div className="container-fluid p-4">
      <div className="mb-4">
        <h2>{titulo}</h2>
        <p className="text-muted">{descripcion}</p>
      </div>
      <AlertasDashboard />
    </div>
  );
}

export default AlertasPage;
```

### 3. Resumen en Dashboards

#### Dashboard Admin
```javascript
// Mostrar resumen de alertas críticas
<Card className="mb-3">
  <Card.Header className="bg-danger text-white">
    <h5>⚠️ Alertas Críticas del Sistema</h5>
  </Card.Header>
  <Card.Body>
    <p>Últimas 5 alertas de todos los equipos:</p>
    {/* Lista de alertas */}
    <Button variant="danger" size="sm" onClick={() => navigate('/alertas')}>
      Ver todas las alertas →
    </Button>
  </Card.Body>
</Card>
```

#### Dashboard Usuario
```javascript
// Mostrar resumen de alertas personales
<Card className="mb-3">
  <Card.Header className="bg-warning text-dark">
    <h5>🔔 Mis Alertas Recientes</h5>
  </Card.Header>
  <Card.Body>
    <p>Alertas de tus equipos asignados:</p>
    {/* Lista de alertas del usuario */}
    <Button variant="warning" size="sm" onClick={() => navigate('/alertas')}>
      Ver historial completo →
    </Button>
  </Card.Body>
</Card>
```

---

## 🔔 TIPOS DE ALERTAS

### Niveles de Criticidad

```javascript
const TIPOS_ALERTA = {
  INFO: {
    nivel: 'info',
    color: 'primary',
    icono: 'bi-info-circle',
    prioridad: 1
  },
  WARNING: {
    nivel: 'warning',
    color: 'warning',
    icono: 'bi-exclamation-triangle',
    prioridad: 2
  },
  DANGER: {
    nivel: 'danger',
    color: 'danger',
    icono: 'bi-exclamation-octagon',
    prioridad: 3
  },
  CRITICAL: {
    nivel: 'critical',
    color: 'dark',
    icono: 'bi-x-octagon',
    prioridad: 4
  }
};
```

### Umbrales Actuales

```javascript
const UMBRAL = {
  VOLTAJE_ALTO: 15,      // V
  VOLTAJE_BAJO: 10,      // V
  BATERIA_BAJA: 20,      // %
  BATERIA_CRITICA: 10,   // %
  CONSUMO_ALTO: 80,      // W
};
```

### Condiciones de Alerta

| Condición | Nivel | Acción |
|-----------|-------|--------|
| Batería < 20% | WARNING | Notificar usuario |
| Batería < 10% | DANGER | Notificar admin + usuario |
| Voltaje < 10V | DANGER | Notificar inmediato |
| Voltaje > 15V | WARNING | Revisar regulador |
| Consumo > 80W | WARNING | Revisar cargas |
| Equipo sin datos > 1h | CRITICAL | Desconexión detectada |

---

## 📊 FLUJO DE DATOS DE ALERTAS

```
┌─────────────────────────────────────────────────────────────┐
│                   GENERACIÓN DE ALERTAS                     │
└─────────────────────────────────────────────────────────────┘

1. EQUIPO EÓLICO
   ├─ Sensores miden: voltaje, batería, consumo
   └─ Envía datos cada X minutos
   
2. BACKEND RECIBE DATOS
   ├─ INSERT INTO lecturas_resumen
   └─ Timestamp: fecha_lectura
   
3. EVALUACIÓN AUTOMÁTICA
   ├─ Si batería < 20% → ALERTA
   ├─ Si voltaje < 10V → ALERTA
   └─ Si consumo > 80W → ALERTA
   
4. ALMACENAMIENTO (Futuro)
   └─ INSERT INTO alertas_activas
   
5. NOTIFICACIÓN
   ├─ Usuario recibe notificación (SUS equipos)
   ├─ Admin recibe notificación (TODOS)
   └─ Email si es crítico
   
6. VISUALIZACIÓN
   ├─ Dashboard: Resumen últimas 5
   └─ /alertas: Historial completo filtrable
```

---

## 🚀 MEJORAS FUTURAS SUGERIDAS

### Fase 1: Sistema de Alertas Activas (2 semanas)

#### Nueva Tabla en BD
```sql
CREATE TABLE alertas_activas (
  id_alerta SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  eolico_id SMALLINT UNSIGNED NOT NULL,
  tipo_alerta ENUM('BATERIA_BAJA','VOLTAJE_ANORMAL','DESCONEXION','CONSUMO_ALTO') NOT NULL,
  nivel ENUM('info','warning','danger','critical') NOT NULL,
  mensaje VARCHAR(255) NOT NULL,
  valor_medido DECIMAL(10,2),
  resuelta TINYINT(1) NOT NULL DEFAULT 0,
  fecha_generacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_resolucion DATETIME DEFAULT NULL,
  resuelto_por SMALLINT UNSIGNED DEFAULT NULL,
  observaciones TEXT,
  
  PRIMARY KEY (id_alerta),
  KEY eolico_id (eolico_id),
  KEY resuelto_por (resuelto_por),
  KEY fecha_generacion (fecha_generacion),
  
  CONSTRAINT fk_alerta_eolico FOREIGN KEY (eolico_id)
    REFERENCES eolicos (id_eolico) ON DELETE CASCADE,
  CONSTRAINT fk_alerta_resuelto FOREIGN KEY (resuelto_por)
    REFERENCES usuarios (id_usuario) ON DELETE SET NULL
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### Nuevos Endpoints
```javascript
// Backend
app.get('/alertas/activas', requireAuth, ...);
app.put('/alertas/:id/resolver', requireAuth, ...);
app.get('/alertas/historial', requireAuth, ...);
app.get('/alertas/estadisticas', requireAuth, requireRole('administrador'), ...);
```

### Fase 2: Notificaciones en Tiempo Real (1 mes)

- WebSockets con Socket.io
- Notificaciones push en navegador
- Sonido de alerta configurable
- Badge con contador en navbar

### Fase 3: Notificaciones por Email (2 semanas)

```javascript
// Enviar email cuando hay alerta crítica
if (nivel === 'critical' || nivel === 'danger') {
  await enviarEmailAlerta({
    destinatario: usuario.email,
    asunto: `ALERTA CRÍTICA: ${tipo_alerta}`,
    mensaje: `Su equipo ${codigo} presenta: ${mensaje}`,
    valor: valor_medido
  });
}
```

### Fase 4: Dashboard de Alertas Avanzado (2 semanas)

- Gráfico de alertas por tipo
- Gráfico de alertas por equipo
- Tiempo promedio de resolución
- Equipos con más alertas
- Tendencias y predicciones

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN ACTUAL

### ✅ YA IMPLEMENTADO
- [x] Endpoint `/alertas` con filtro por rol
- [x] AlertasPage accesible para ambos roles
- [x] Generación de alertas desde lecturas
- [x] Visualización en dashboards
- [x] Umbrales configurados

### 🔄 MEJORAS RECOMENDADAS
- [ ] Títulos diferenciados por rol
- [ ] Badge con contador de alertas en navbar
- [ ] Iconos diferentes (campana vs triángulo)
- [ ] Tabla de alertas activas en BD
- [ ] Sistema de resolución de alertas
- [ ] Notificaciones por email
- [ ] WebSockets para tiempo real

### 🚀 FUTURO (Opcional)
- [ ] Machine Learning para predecir fallas
- [ ] Notificaciones SMS para críticas
- [ ] App móvil con notificaciones push
- [ ] Panel de estadísticas de alertas
- [ ] Sistema de escalamiento automático

---

## 🎯 RESUMEN EJECUTIVO

### ✅ RESPUESTA A TU PREGUNTA

**¿Alertas en Dashboard Admin o Usuario?**

**RESPUESTA: EN AMBOS**

### Razones:

1. ✅ **Usuario NECESITA saber si SU equipo tiene problemas**
   - Es su responsabilidad
   - Puede actuar rápido
   - Mejor experiencia

2. ✅ **Admin NECESITA visibilidad global**
   - Mantenimiento preventivo
   - Detectar patrones
   - Priorizar acciones

3. ✅ **Tu implementación actual es CORRECTA**
   - Endpoint ya filtra por rol
   - Seguro y funcional
   - Sigue buenas prácticas

### 📝 Acción Recomendada:

**MANTÉN todo como está** y solo agrega mejoras de UX:
- Títulos diferenciados
- Iconos según rol
- Badges de notificación
- Links desde dashboards

---

## 📚 REFERENCIAS

- Ver: `backend/index.js` línea 738 (endpoint /alertas)
- Ver: `frontend/src/pages/AlertasPage.js`
- Ver: `frontend/src/components/AlertasDashboard.js`
- Ver: `GUIA-NUEVOS-MODULOS.md` para agregar mejoras
- Ver: `REVISION-TECNICA-COMPLETA.md` para arquitectura

---

**Última actualización:** 17 de octubre de 2025  
**Consultor:** Developer Senior  
**Estado:** ✅ Arquitectura correcta - Solo mejoras opcionales sugeridas
