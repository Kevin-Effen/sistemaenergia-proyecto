# 🚀 GUÍA PARA AGREGAR NUEVOS MÓDULOS

**Proyecto:** SISTEMAENERGIA008  
**Fecha:** 17 de octubre de 2025

---

## 📋 PROCESO PASO A PASO PARA NUEVOS DESARROLLOS

Esta guía te ayudará a agregar nuevas funcionalidades **SIN ROMPER** el sistema existente, especialmente el login y la autenticación.

---

## ✅ PASO 0: PREPARACIÓN (OBLIGATORIO)

### 🔐 Checklist de Seguridad PRE-Desarrollo

```powershell
# 1. Backup de la base de datos
cd "c:\Users\kevin\Desktop\INCOS 2025\PROYECTO  SOCIO-PRODUCTIVO\SOFTWARE EOLICO\VERSIONES\sistemaenergia008"
mysqldump -u root -p sistema_energia_eolica > "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

# 2. Commit del estado actual
git add .
git commit -m "Checkpoint antes de agregar [NOMBRE_FUNCIONALIDAD]"

# 3. Crear branch para desarrollo
git branch feature/nombre-funcionalidad
git checkout feature/nombre-funcionalidad

# 4. Verificar que el sistema funciona
.\start-dev.ps1
```

### ✅ Verificación del Sistema

- [ ] Backend inicia correctamente en puerto 3001
- [ ] Frontend inicia correctamente en puerto 3000
- [ ] Login funciona (probar con usuario admin)
- [ ] Dashboard carga correctamente
- [ ] No hay errores en consola

---

## 📊 PASO 1: PLANIFICACIÓN

### Documento de Requisitos

Antes de codear, responde estas preguntas:

```markdown
## Nueva Funcionalidad: [NOMBRE]

### 1. ¿Qué hace esta funcionalidad?
- Descripción breve y clara

### 2. ¿Quién puede usarla?
- [ ] Solo administradores
- [ ] Solo usuarios normales
- [ ] Ambos roles
- [ ] Público (sin autenticación)

### 3. ¿Qué datos necesita?
- Campos de entrada
- Validaciones requeridas
- Tipos de datos

### 4. ¿Necesita nuevas tablas en la BD?
- [ ] No, usa tablas existentes
- [ ] Sí, nueva tabla: [NOMBRE]

### 5. ¿Necesita nuevos endpoints?
- [ ] GET /ruta → Descripción
- [ ] POST /ruta → Descripción
- [ ] PUT /ruta → Descripción
- [ ] DELETE /ruta → Descripción

### 6. ¿Necesita nueva página en el frontend?
- [ ] No, se integra en página existente
- [ ] Sí, nueva página: [NOMBRE]

### 7. ¿Afecta al sistema de autenticación?
- [ ] NO (99% de los casos)
- [ ] SÍ → ⚠️ REQUIERE REVISIÓN SENIOR
```

---

## 🗄️ PASO 2: BASE DE DATOS (Si aplica)

### Agregar Nueva Tabla

```sql
-- Archivo: agregar_tabla_[NOMBRE].sql
-- Fecha: [FECHA]
-- Descripción: [BREVE DESCRIPCIÓN]

-- ============================================
-- Crear tabla
-- ============================================

DROP TABLE IF EXISTS `nombre_tabla`;
CREATE TABLE `nombre_tabla` (
  `id_registro` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `usuario_id` SMALLINT UNSIGNED NOT NULL,
  `campo1` VARCHAR(100) NOT NULL,
  `campo2` DECIMAL(10,2) DEFAULT 0.00,
  `activo` TINYINT(1) NOT NULL DEFAULT 1,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  PRIMARY KEY (`id_registro`),
  KEY `usuario_id` (`usuario_id`),
  
  -- ⚠️ IMPORTANTE: Siempre agregar foreign keys
  CONSTRAINT `fk_nombre_usuario` FOREIGN KEY (`usuario_id`) 
    REFERENCES `usuarios` (`id_usuario`) 
    ON DELETE CASCADE ON UPDATE CASCADE
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- Índices adicionales (si son necesarios)
-- ============================================
CREATE INDEX `idx_campo1` ON `nombre_tabla` (`campo1`);

-- ============================================
-- Datos de prueba (opcional)
-- ============================================
INSERT INTO `nombre_tabla` 
  (`usuario_id`, `campo1`, `campo2`) 
VALUES 
  (1, 'Valor de prueba', 100.50);

-- ============================================
-- Verificación
-- ============================================
SELECT * FROM nombre_tabla;
```

**Aplicar script:**
```powershell
mysql -u root -p sistema_energia_eolica < agregar_tabla_nombre.sql
```

### Modificar Tabla Existente

```sql
-- ⚠️ CUIDADO: No modificar tablas críticas
-- Tablas críticas: cuentas, usuarios, roles

-- SOLO SI ES NECESARIO:
ALTER TABLE `tabla_existente` 
ADD COLUMN `nuevo_campo` VARCHAR(100) DEFAULT NULL 
AFTER `campo_existente`;

-- Verificar que no rompe nada
SELECT * FROM tabla_existente LIMIT 5;
```

---

## 🔧 PASO 3: BACKEND - ENDPOINTS

### Plantilla para Nuevo Endpoint

```javascript
// ============================================
// [NOMBRE DEL MÓDULO]
// Descripción: [BREVE DESCRIPCIÓN]
// Fecha: [FECHA]
// ============================================

// GET - Obtener lista
app.get('/nombre-modulo',
  requireAuth,                              // ✅ Siempre requerir autenticación
  requireRole('administrador'),             // ✅ Si es solo admin
  (req, res) => {
    const cuentaId = req.user.cuenta_id;    // Disponible por requireAuth
    const rol = req.user.rol;               // Disponible por requireAuth
    
    const sql = `
      SELECT 
        t.id_registro,
        t.campo1,
        t.campo2,
        t.creado_en,
        u.nombres,
        u.primer_apellido
      FROM nombre_tabla t
      JOIN usuarios u ON u.id_usuario = t.usuario_id
      ORDER BY t.creado_en DESC
      LIMIT 100
    `;
    
    db.query(sql, [], (err, rows) => {
      if (err) {
        console.error('Error al obtener registros:', err);
        return res.status(500).json({ mensaje: 'Error en servidor' });
      }
      res.json(rows || []);
    });
  }
);

// POST - Crear nuevo registro
app.post('/nombre-modulo',
  requireAuth,
  requireRole('administrador'),
  [
    // ✅ Validaciones con express-validator
    body('campo1').isString().trim().isLength({ min: 3, max: 100 }),
    body('campo2').isFloat({ min: 0 }),
    body('usuario_id').optional().isInt({ min: 1 }),
  ],
  (req, res) => {
    // Validar errores
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }
    
    const { campo1, campo2, usuario_id } = req.body;
    const cuentaId = req.user.cuenta_id;
    
    // Si no viene usuario_id, usar el del usuario logueado
    const usuarioFinal = usuario_id || cuentaId;
    
    const sql = `
      INSERT INTO nombre_tabla (usuario_id, campo1, campo2)
      VALUES (?, ?, ?)
    `;
    
    db.query(sql, [usuarioFinal, campo1, campo2], (err, result) => {
      if (err) {
        console.error('Error al crear registro:', err);
        return res.status(500).json({ mensaje: 'Error al crear registro' });
      }
      
      res.json({
        success: true,
        mensaje: 'Registro creado exitosamente',
        id: result.insertId
      });
    });
  }
);

// PUT - Actualizar registro
app.put('/nombre-modulo/:id',
  requireAuth,
  requireRole('administrador'),
  [
    param('id').isInt({ min: 1 }),
    body('campo1').optional().isString().trim().isLength({ min: 3, max: 100 }),
    body('campo2').optional().isFloat({ min: 0 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }
    
    const { id } = req.params;
    const { campo1, campo2 } = req.body;
    
    const sql = `
      UPDATE nombre_tabla 
      SET campo1 = ?, campo2 = ?
      WHERE id_registro = ?
    `;
    
    db.query(sql, [campo1, campo2, id], (err, result) => {
      if (err) {
        console.error('Error al actualizar:', err);
        return res.status(500).json({ mensaje: 'Error al actualizar' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ mensaje: 'Registro no encontrado' });
      }
      
      res.json({
        success: true,
        mensaje: 'Registro actualizado exitosamente'
      });
    });
  }
);

// DELETE - Eliminar registro
app.delete('/nombre-modulo/:id',
  requireAuth,
  requireRole('administrador'),
  [param('id').isInt({ min: 1 })],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }
    
    const { id } = req.params;
    
    const sql = `DELETE FROM nombre_tabla WHERE id_registro = ?`;
    
    db.query(sql, [id], (err, result) => {
      if (err) {
        console.error('Error al eliminar:', err);
        return res.status(500).json({ mensaje: 'Error al eliminar' });
      }
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ mensaje: 'Registro no encontrado' });
      }
      
      res.json({
        success: true,
        mensaje: 'Registro eliminado exitosamente'
      });
    });
  }
);
```

### ⚠️ DÓNDE Agregar el Código en index.js

```javascript
// backend/index.js

// ... código existente ...

// ====================================================
// Aquí termina el código existente (alrededor línea 1650)
// ====================================================

// ====================================================
// NUEVOS MÓDULOS - Agregar AQUÍ (antes de server.listen)
// ====================================================

// Tu código nuevo va aquí

// ====================================================
// NO MODIFICAR DE AQUÍ HACIA ABAJO
// ====================================================

const http = require('http');
const HOST = process.env.HOST || '0.0.0.0';
const server = http.createServer(app);
server.listen(PORT, HOST, () => {
  console.log(`[backend] listening on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
});
```

---

## ⚛️ PASO 4: FRONTEND - COMPONENTE/PÁGINA

### Crear Nueva Página

```javascript
// frontend/src/pages/NombreModulo.js

import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Form, Alert } from 'react-bootstrap';
import api from '../api/axios';

function NombreModulo() {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    campo1: '',
    campo2: 0
  });

  // Cargar datos al montar componente
  useEffect(() => {
    fetchRegistros();
  }, []);

  const fetchRegistros = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/nombre-modulo');
      setRegistros(res.data);
    } catch (err) {
      console.error('Error al cargar:', err);
      setError(err.response?.data?.mensaje || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      await api.post('/nombre-modulo', formData);
      
      // Limpiar formulario
      setFormData({ campo1: '', campo2: 0 });
      setMostrarForm(false);
      
      // Recargar lista
      await fetchRegistros();
      
    } catch (err) {
      console.error('Error al crear:', err);
      setError(err.response?.data?.mensaje || 'Error al crear registro');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar este registro?')) return;
    
    try {
      setError('');
      await api.delete(`/nombre-modulo/${id}`);
      await fetchRegistros();
    } catch (err) {
      console.error('Error al eliminar:', err);
      setError(err.response?.data?.mensaje || 'Error al eliminar');
    }
  };

  return (
    <Container fluid className="py-4">
      <Row>
        <Col>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h4 className="mb-0">📊 Nombre del Módulo</h4>
              <Button 
                variant="primary" 
                onClick={() => setMostrarForm(!mostrarForm)}
              >
                {mostrarForm ? 'Cancelar' : '+ Nuevo'}
              </Button>
            </Card.Header>
            
            <Card.Body>
              {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
              
              {/* Formulario */}
              {mostrarForm && (
                <Card className="mb-4">
                  <Card.Body>
                    <Form onSubmit={handleSubmit}>
                      <Row>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Campo 1</Form.Label>
                            <Form.Control
                              type="text"
                              value={formData.campo1}
                              onChange={(e) => setFormData({...formData, campo1: e.target.value})}
                              required
                            />
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group className="mb-3">
                            <Form.Label>Campo 2</Form.Label>
                            <Form.Control
                              type="number"
                              step="0.01"
                              value={formData.campo2}
                              onChange={(e) => setFormData({...formData, campo2: parseFloat(e.target.value)})}
                              required
                            />
                          </Form.Group>
                        </Col>
                      </Row>
                      <Button type="submit" variant="success">Guardar</Button>
                    </Form>
                  </Card.Body>
                </Card>
              )}
              
              {/* Tabla */}
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                </div>
              ) : registros.length === 0 ? (
                <Alert variant="info">No hay registros disponibles</Alert>
              ) : (
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Campo 1</th>
                      <th>Campo 2</th>
                      <th>Usuario</th>
                      <th>Fecha</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registros.map(reg => (
                      <tr key={reg.id_registro}>
                        <td>{reg.id_registro}</td>
                        <td>{reg.campo1}</td>
                        <td>{reg.campo2}</td>
                        <td>{reg.nombres} {reg.primer_apellido}</td>
                        <td>{new Date(reg.creado_en).toLocaleString()}</td>
                        <td>
                          <Button 
                            size="sm" 
                            variant="danger"
                            onClick={() => handleDelete(reg.id_registro)}
                          >
                            Eliminar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default NombreModulo;
```

---

## 🗺️ PASO 5: FRONTEND - ROUTING

### Agregar Ruta en App.js

```javascript
// frontend/src/App.js

// 1. Importar el componente al inicio
import NombreModulo from "./pages/NombreModulo";

// 2. Agregar la ruta en el lugar apropiado

// Si es SOLO ADMIN:
<Route element={<AdminOnly />}>
  <Route path="/nombre-modulo" element={<NombreModulo />} />
  {/* otras rutas admin */}
</Route>

// Si es para TODOS los autenticados:
<Route element={<PrivateRoute />}>
  <Route element={<Layout />}>
    <Route path="/nombre-modulo" element={<NombreModulo />} />
    {/* otras rutas */}
  </Route>
</Route>
```

---

## 🧭 PASO 6: FRONTEND - NAVEGACIÓN

### Agregar Link en Navbar

```javascript
// frontend/src/components/Navbar.js

// Dentro del componente Navbar, en la sección de links

{rol === 'administrador' && (
  <Nav.Link as={Link} to="/nombre-modulo">
    <i className="bi bi-icon-name"></i> Nombre Módulo
  </Nav.Link>
)}

// O si es para todos:
<Nav.Link as={Link} to="/nombre-modulo">
  <i className="bi bi-icon-name"></i> Nombre Módulo
</Nav.Link>
```

---

## 🧪 PASO 7: TESTING

### Checklist de Pruebas

```markdown
## Testing del Nuevo Módulo

### Backend
- [ ] Endpoint GET funciona
- [ ] Endpoint POST funciona
- [ ] Endpoint PUT funciona (si aplica)
- [ ] Endpoint DELETE funciona (si aplica)
- [ ] Validaciones funcionan correctamente
- [ ] Errores retornan códigos correctos (400, 404, 500)
- [ ] requireAuth bloquea peticiones sin token
- [ ] requireRole bloquea usuarios sin permisos

### Frontend
- [ ] Página carga correctamente
- [ ] Datos se muestran en la tabla
- [ ] Formulario de creación funciona
- [ ] Eliminación funciona
- [ ] Errores se muestran correctamente
- [ ] Loading state funciona
- [ ] Responsive design (mobile)

### Integración
- [ ] Login sigue funcionando
- [ ] Dashboard sigue funcionando
- [ ] Otros módulos no se afectaron
- [ ] No hay errores en consola
- [ ] Token sigue funcionando correctamente

### Seguridad
- [ ] Usuario sin autenticar no puede acceder
- [ ] Usuario normal no puede acceder a rutas admin
- [ ] SQL injection protegido (prepared statements)
- [ ] XSS protegido (inputs sanitizados)
```

---

## 📝 PASO 8: DOCUMENTACIÓN

### Actualizar Documentación

Crear archivo: `docs/MODULO_[NOMBRE].md`

```markdown
# Módulo: [NOMBRE]

## Descripción
[Descripción detallada]

## Permisos
- Rol requerido: [administrador/usuario/ambos]

## Endpoints

### GET /nombre-modulo
Obtiene lista de registros

**Autenticación:** Requerida  
**Rol:** Administrador  
**Response:**
```json
[
  {
    "id_registro": 1,
    "campo1": "valor",
    "campo2": 100.50,
    "creado_en": "2025-10-17T12:00:00"
  }
]
```

### POST /nombre-modulo
Crea un nuevo registro

**Autenticación:** Requerida  
**Rol:** Administrador  
**Body:**
```json
{
  "campo1": "valor",
  "campo2": 100.50
}
```
**Response:**
```json
{
  "success": true,
  "mensaje": "Registro creado exitosamente",
  "id": 10
}
```

## Componentes Frontend

### Página: NombreModulo
Ubicación: `frontend/src/pages/NombreModulo.js`

**Funcionalidades:**
- Lista de registros
- Formulario de creación
- Eliminación de registros

## Tablas de Base de Datos

### nombre_tabla
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id_registro | SMALLINT | PK autoincremental |
| usuario_id | SMALLINT | FK a usuarios |
| campo1 | VARCHAR(100) | Descripción |
| campo2 | DECIMAL(10,2) | Descripción |
| creado_en | DATETIME | Timestamp automático |

## Casos de Uso

1. **Crear registro**
   - Admin accede a /nombre-modulo
   - Clic en "+ Nuevo"
   - Llena formulario
   - Guardar

2. **Ver registros**
   - Admin accede a /nombre-modulo
   - Ve tabla con todos los registros

3. **Eliminar registro**
   - Admin clic en "Eliminar"
   - Confirma acción
   - Registro eliminado

## Changelog

**v1.0.0 - 2025-10-17**
- Versión inicial
- CRUD completo implementado
```

---

## ⚠️ ERRORES COMUNES Y SOLUCIONES

### Error 1: "Cannot read property 'cuenta_id' of undefined"

**Causa:** No se agregó `requireAuth` al endpoint  
**Solución:**
```javascript
app.get('/ruta', requireAuth, (req, res) => {
  // ahora req.user está disponible
});
```

### Error 2: "Access denied" / 403

**Causa:** Usuario no tiene el rol requerido  
**Solución:** Verificar que `requireRole` tiene el rol correcto
```javascript
// Para admin
app.get('/ruta', requireAuth, requireRole('administrador'), (req, res) => {});

// Para todos
app.get('/ruta', requireAuth, (req, res) => {});
```

### Error 3: "ER_NO_SUCH_TABLE"

**Causa:** Tabla no existe en la BD  
**Solución:** Ejecutar script SQL para crear tabla

### Error 4: "Token inválido"

**Causa:** Modificaste el middleware requireAuth sin querer  
**Solución:** Restaurar desde backup o git

### Error 5: Frontend no compila

**Causa:** Error de sintaxis en JSX  
**Solución:** Verificar que todos los tags estén cerrados

---

## 🎯 EJEMPLO COMPLETO: Módulo de "Mantenimientos"

Ver archivo separado: `EJEMPLO-MODULO-MANTENIMIENTOS.md`

---

## ✅ CHECKLIST FINAL

Antes de hacer merge a main:

- [ ] Backup de BD realizado
- [ ] Tests manuales completados
- [ ] Login funciona correctamente
- [ ] Dashboard funciona correctamente
- [ ] Documentación actualizada
- [ ] Código comentado apropiadamente
- [ ] No hay errores en consola
- [ ] No se modificaron archivos críticos
- [ ] Git commit con mensaje descriptivo

---

**Última actualización:** 17 de octubre de 2025  
**Versión:** 1.0
