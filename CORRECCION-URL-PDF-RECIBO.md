# 🔧 CORRECCIÓN: URL del Botón PDF para Recibos

## 🐛 Problema Reportado

El botón "PDF" abre el **dashboard** en lugar del **recibo PDF** de la cuota pagada.

### Comportamiento Incorrecto
```
Usuario hace clic en "PDF" → Se abre nueva pestaña → Muestra dashboard en /api/eolicos/X/recibo
```

### Causa Raíz
La URL usada era **relativa** y no incluía:
1. ❌ El **protocolo y dominio completo** del backend
2. ❌ El **token de autenticación** requerido por el endpoint
3. ❌ El **timestamp** para evitar caché

## ✅ Solución Implementada

### Código ANTES (Incorrecto)
```javascript
<button
  className="btn btn-sm btn-outline-primary"
  onClick={() => {
    const url = `/api/eolicos/${equipoPago?.id_eolico}/recibo`;
    window.open(url, '_blank');
  }}
  title="Descargar recibo de pago"
>
  <i className="bi bi-file-earmark-pdf"></i> PDF
</button>
```

**Problema:** La URL `/api/eolicos/X/recibo` es relativa y se construye como:
```
http://localhost:3000/api/eolicos/123/recibo
                    ↑
            Frontend (React Router)
```

El frontend intenta enrutar esto como una página de React, no como una petición al backend.

### Código DESPUÉS (Correcto)
```javascript
<button
  className="btn btn-sm btn-outline-primary"
  onClick={() => {
    const token = localStorage.getItem("token");
    const baseURL = process.env.REACT_APP_API_BASE || "http://localhost:3001";
    const url = `${baseURL}/eolicos/${equipoPago?.id_eolico}/recibo?token=${token}&_t=${Date.now()}`;
    window.open(url, '_blank');
  }}
  title="Descargar recibo de pago"
>
  <i className="bi bi-file-earmark-pdf"></i> PDF
</button>
```

**Solución:** Construcción de URL absoluta con autenticación:
```
http://localhost:3001/eolicos/123/recibo?token=eyJhbG...&_t=1729468800000
                    ↑                      ↑             ↑
                Backend                  JWT          Anti-caché
```

### Componentes de la URL Correcta

1. **`baseURL`**: 
   - Obtiene de `process.env.REACT_APP_API_BASE`
   - Fallback: `http://localhost:3001`
   - Asegura que apunte al servidor backend

2. **`token`**:
   - Lee de `localStorage.getItem("token")`
   - Pasa como query param `?token=...`
   - Necesario porque `window.open()` no incluye headers automáticamente

3. **`_t`** (timestamp):
   - Usa `Date.now()` para generar timestamp único
   - Evita que el navegador use versión cacheada del PDF

## 🔍 Por Qué Era Necesario

### Diferencia entre `api.get()` y `window.open()`

**Con Axios (api.get):**
```javascript
// ✅ Funciona bien con URLs relativas
await api.get('/eolicos/123/recibo');

// Axios automáticamente:
// 1. Agrega baseURL → http://localhost:3001/eolicos/123/recibo
// 2. Agrega headers → Authorization: Bearer <token>
// 3. Agrega timestamp → params: { _t: Date.now() }
```

**Con window.open():**
```javascript
// ❌ NO funciona con URLs relativas
window.open('/eolicos/123/recibo', '_blank');

// El navegador NO:
// 1. Agrega baseURL (usa la URL del frontend)
// 2. Agrega headers de autorización
// 3. Respeta interceptores de Axios
```

### Autenticación en GET de PDFs

El backend requiere autenticación:
```javascript
app.get('/eolicos/:id/recibo', 
  requireAuth,                    // ← Requiere token JWT
  requireRole('administrador'),   // ← Requiere rol de admin
  (req, res) => {
    // Genera PDF...
  }
);
```

Cuando abres una URL con `window.open()`, el navegador hace una petición HTTP GET simple **sin headers personalizados**. Por eso necesitamos pasar el token como **query parameter**.

## 🧪 Cómo Probar la Corrección

### Paso 1: Recargar la Aplicación
```bash
# Presionar F5 en el navegador
```

### Paso 2: Navegar a una Cuota Pagada
1. Ir a `/eolicos`
2. Hacer clic en **"Acciones"** de un equipo asignado
3. Seleccionar **"Ver Cuotas"**
4. Buscar una cuota con badge **"Pagado"** (verde)

### Paso 3: Hacer Clic en Botón "PDF"
```
ACCIÓN: Clic en botón "📄 PDF"

RESULTADO ESPERADO:
✅ Se abre nueva pestaña
✅ La URL es: http://localhost:3001/eolicos/{id}/recibo?token=...&_t=...
✅ Se muestra un PDF con el recibo del equipo eólico
✅ Se puede descargar o imprimir

RESULTADO INCORRECTO (ANTERIOR):
❌ Se abre nueva pestaña
❌ La URL es: http://localhost:3000/api/eolicos/{id}/recibo
❌ Se muestra el dashboard (página de React)
```

### Paso 4: Verificar en DevTools (Opcional)

**Abrir DevTools (F12) → Pestaña Network:**
1. Hacer clic en botón "PDF"
2. Buscar petición GET a `/eolicos/{id}/recibo`
3. **Verificar:**
   - **Request URL**: `http://localhost:3001/eolicos/123/recibo?token=...&_t=...`
   - **Status**: `200 OK`
   - **Response Type**: `application/pdf`
   - **Content-Disposition**: `inline; filename="recibo_XXX.pdf"`

## 🎯 Caso de Uso Completo

### Flujo de Trabajo del Usuario

```
1. Usuario navega a /eolicos
   ↓
2. Hace clic en "Acciones" → "Ver Cuotas"
   ↓
3. Ve lista de cuotas con badges "Pendiente" / "Pagado"
   ↓
4. Cuota pendiente → Botón "Pagar" (verde)
   Cuota pagada → Botón "📄 PDF" (azul)
   ↓
5. Hace clic en "Pagar"
   ↓
6. Botón cambia a "Guardando..."
   ↓
7. Backend actualiza: SET pagado=1, fecha_pago=NOW()
   ↓
8. Botón cambia a "📄 PDF"
   Badge cambia a "Pagado" (verde)
   ↓
9. Hace clic en "📄 PDF"
   ↓
10. Se abre nueva pestaña con recibo PDF
    ↓
11. Usuario puede imprimir o descargar el recibo
```

## 🔐 Seguridad

### Token en Query Params: ¿Es Seguro?

**Consideraciones:**
- ⚠️ **Tokens en URL son visibles** en historial del navegador y logs del servidor
- ✅ **Uso temporal**: El token solo se usa para descargar el PDF una vez
- ✅ **HTTPS en producción**: En producción, usar HTTPS para encriptar la URL completa
- ✅ **Token de corta duración**: Los JWT pueden tener expiración de 1-24 horas

**Alternativa más segura (para futuro):**
```javascript
// Opción 1: Usar POST con body en lugar de GET
const response = await api.post(`/eolicos/${id}/recibo`, {}, { responseType: 'blob' });
const blob = new Blob([response.data], { type: 'application/pdf' });
const url = URL.createObjectURL(blob);
window.open(url, '_blank');
URL.revokeObjectURL(url);

// Opción 2: Generar token temporal específico para descarga
const { data } = await api.post(`/eolicos/${id}/recibo-token`);
window.open(`${baseURL}/download?token=${data.downloadToken}`, '_blank');
```

Para esta implementación actual, **pasar el token en query params es aceptable** porque:
1. Es un PDF de solo lectura (no operación sensible)
2. Requiere rol de administrador
3. El token ya tiene expiración
4. Se usará HTTPS en producción

## 📊 Comparación de Métodos

| Aspecto | URL Relativa (❌) | URL Absoluta + Token (✅) |
|---------|-------------------|---------------------------|
| **URL** | `/api/eolicos/X/recibo` | `http://localhost:3001/eolicos/X/recibo?token=...` |
| **Destino** | Frontend React Router | Backend Express |
| **Autenticación** | ❌ Sin headers | ✅ Token en query param |
| **Resultado** | Muestra dashboard | Muestra PDF correctamente |
| **Cache** | ❌ Puede usar caché | ✅ Timestamp previene caché |

## 🚀 Próximos Pasos (Opcional)

### 1. Crear Endpoint de Recibo por Cuota Individual

**Backend (backend/index.js):**
```javascript
app.get('/cuotas/:id/recibo', 
  requireAuth, 
  requireRole('administrador'),
  [param('id').isInt({ min: 1 })],
  async (req, res) => {
    const id_cuota = Number(req.params.id);
    
    // Consultar información de la cuota específica
    const sql = `
      SELECT 
        c.*, 
        e.codigo, e.tarifa_mes,
        u.nombres, u.primer_apellido, u.segundo_apellido,
        a.fecha_inicio
      FROM cuotas c
      JOIN alquileres a ON a.id_alquiler = c.alquiler_id
      JOIN eolicos e ON e.id_eolico = a.eolico_id
      JOIN usuarios u ON u.id_usuario = e.usuario_id
      WHERE c.id_cuota = ? AND c.pagado = 1
      LIMIT 1
    `;
    
    db.query(sql, [id_cuota], (err, rows) => {
      if (err || !rows || !rows.length) {
        return res.status(404).json({ mensaje: 'Cuota no encontrada o no pagada' });
      }
      
      const cuota = rows[0];
      
      // Generar PDF específico de la cuota
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="recibo_cuota_${cuota.numero}.pdf"`);
      doc.pipe(res);
      
      // Título
      doc.fontSize(20).text('RECIBO DE PAGO', { align: 'center' });
      doc.moveDown();
      
      // Información de la cuota
      doc.fontSize(12);
      doc.text(`Cuota Nro: ${cuota.numero}`);
      doc.text(`Concepto: ${cuota.concepto}`);
      doc.text(`Descripción: ${cuota.descripcion || '—'}`);
      doc.text(`Monto: Bs ${Number(cuota.monto).toFixed(2)}`);
      doc.text(`Fecha de Pago: ${new Date(cuota.fecha_pago).toLocaleString('es-BO')}`);
      doc.text(`Método de Pago: ${cuota.metodo_pago || 'Efectivo'}`);
      doc.moveDown();
      
      // Información del cliente
      doc.text(`Cliente: ${cuota.nombres} ${cuota.primer_apellido} ${cuota.segundo_apellido}`);
      doc.text(`Equipo: ${cuota.codigo}`);
      
      doc.end();
    });
  }
);
```

**Frontend (Eolicos.js):**
```javascript
<button
  className="btn btn-sm btn-outline-primary"
  onClick={() => {
    const token = localStorage.getItem("token");
    const baseURL = process.env.REACT_APP_API_BASE || "http://localhost:3001";
    const url = `${baseURL}/cuotas/${c.id_cuota}/recibo?token=${token}&_t=${Date.now()}`;
    window.open(url, '_blank');
  }}
  title="Descargar recibo individual de esta cuota"
>
  <i className="bi bi-file-earmark-pdf"></i> PDF
</button>
```

### 2. Agregar Columna "Fecha de Pago" en la Tabla

```javascript
<th style={{ width: 140 }}>Fecha de Pago</th>
// ...
<td>
  {c.pagado && c.fecha_pago 
    ? new Date(c.fecha_pago).toLocaleString('es-BO') 
    : '—'
  }
</td>
```

### 3. Botón para Descargar Todos los Recibos

```javascript
<button
  className="btn btn-outline-primary"
  onClick={() => {
    const token = localStorage.getItem("token");
    const baseURL = process.env.REACT_APP_API_BASE || "http://localhost:3001";
    const url = `${baseURL}/eolicos/${equipoPago.id_eolico}/cuotas/pdf?token=${token}&_t=${Date.now()}`;
    window.open(url, '_blank');
  }}
>
  <i className="bi bi-file-earmark-pdf"></i> Descargar Plan Completo
</button>
```

## ✅ Verificación Final

Después de recargar la página, confirmar:

- [ ] El botón "📄 PDF" aparece solo en cuotas con badge "Pagado"
- [ ] Hacer clic abre nueva pestaña
- [ ] La URL es `http://localhost:3001/eolicos/{id}/recibo?token=...`
- [ ] Se muestra un PDF (no el dashboard)
- [ ] El PDF contiene información del equipo eólico
- [ ] Se puede descargar o imprimir el PDF
- [ ] No hay errores en la consola del navegador

## 🐛 Troubleshooting

### Si sigue abriendo el dashboard:
1. **Verificar la URL en la barra de direcciones** de la nueva pestaña
2. Si es `localhost:3000` → El código no se actualizó, recargar con Ctrl+F5
3. Si es `localhost:3001` pero no funciona → Verificar que el backend esté corriendo

### Si sale error 401 (No autorizado):
```javascript
// Verificar en consola:
console.log("Token:", localStorage.getItem("token"));
// Si es null → El usuario no está autenticado, hacer login nuevamente
```

### Si el PDF no se genera correctamente:
```javascript
// Backend: Revisar logs del servidor backend
// Frontend: Abrir DevTools → Network → Ver respuesta del endpoint
```

---

**Autor**: GitHub Copilot  
**Fecha**: 20 de octubre de 2025  
**Archivo modificado**: `frontend/src/pages/Eolicos.js`  
**Líneas modificadas**: 1463-1471 (construcción de URL del PDF)  
**Cambio clave**: URL relativa → URL absoluta con token y timestamp
