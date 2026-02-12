# 🐛 CORRECCIÓN: ID Undefined en URL del PDF

## 📋 Problema Reportado

Al hacer clic en el botón "PDF" de una cuota pagada, se abre una nueva pestaña con el error:

```
{"error":"Token faltante"}
```

Y la URL muestra:
```
http://localhost:3001/eolicos/undefined/recibo?token=...
                                ↑
                            undefined
```

## 🔍 Análisis del Error

### URL Generada (Incorrecta)
```
http://localhost:3001/eolicos/undefined/recibo
```

El problema está en que `equipoPago?.id_eolico` es **undefined** en el contexto del modal de cuotas.

### Causa Raíz

Hay **DOS modales diferentes** en el componente Eolicos.js:

#### 1. Modal de "Registrar Pago" 💰
- **Variable de estado**: `equipoPago`
- **Se abre desde**: Dropdown → "Registrar Pago"
- **Función**: `abrirModalPago(equipo)`
- **Propósito**: Registrar un pago único fuera del plan de cuotas

#### 2. Modal de "Plan de Cuotas" 📋
- **Variable de estado**: `alquilerInfo`
- **Se abre desde**: Dropdown → "Ver Cuotas"
- **Función**: `verCuotas(id_eolico)`
- **Propósito**: Ver lista completa de cuotas y marcarlas como pagadas

### El Error

El botón PDF está en el **Modal de "Plan de Cuotas"**, pero el código usaba:
```javascript
const url = `${baseURL}/eolicos/${equipoPago?.id_eolico}/recibo?token=${token}&_t=${Date.now()}`;
                                    ↑
                            Variable INCORRECTA
```

En el contexto del modal de cuotas, `equipoPago` es **null** porque ese modal usa `alquilerInfo`.

## ✅ Solución Implementada

### Cambio en el Código

**ANTES** (Incorrecto):
```javascript
<button
  className="btn btn-sm btn-outline-primary"
  onClick={() => {
    const token = localStorage.getItem("token");
    const baseURL = process.env.REACT_APP_API_BASE || "http://localhost:3001";
    const url = `${baseURL}/eolicos/${equipoPago?.id_eolico}/recibo?token=${token}&_t=${Date.now()}`;
    //                                  ↑ INCORRECTO: equipoPago es null en este modal
    window.open(url, '_blank');
  }}
  title="Descargar recibo de pago"
>
  <i className="bi bi-file-earmark-pdf"></i> PDF
</button>
```

**DESPUÉS** (Correcto):
```javascript
<button
  className="btn btn-sm btn-outline-primary"
  onClick={() => {
    const token = localStorage.getItem("token");
    const baseURL = process.env.REACT_APP_API_BASE || "http://localhost:3001";
    const url = `${baseURL}/eolicos/${alquilerInfo?.eolico_id}/recibo?token=${token}&_t=${Date.now()}`;
    //                                  ↑ CORRECTO: alquilerInfo tiene el eolico_id
    window.open(url, '_blank');
  }}
  title="Descargar recibo de pago"
>
  <i className="bi bi-file-earmark-pdf"></i> PDF
</button>
```

### URL Generada Correcta

```
http://localhost:3001/eolicos/123/recibo?token=eyJhbG...&_t=1729468800000
                                ↑
                            ID correcto
```

## 🎯 Contexto de las Variables

### Estado del Componente

```javascript
// Estado del modal "Registrar Pago"
const [openModalPago, setOpenModalPago] = useState(false);
const [equipoPago, setEquipoPago] = useState(null);

// Estado del modal "Plan de Cuotas"
const [openListaCuotas, setOpenListaCuotas] = useState(false);
const [alquilerInfo, setAlquilerInfo] = useState(null);
const [listaCuotas, setListaCuotas] = useState([]);
```

### Estructura de `alquilerInfo`

Cuando se ejecuta `verCuotas(id_eolico)`:
```javascript
const r = await api.get(`/eolicos/${id_eolico}/cuotas`);
setAlquilerInfo(r.data?.alquiler || null);
```

`alquilerInfo` contiene:
```javascript
{
  id_alquiler: 45,
  eolico_id: 123,          // ← ID que necesitamos
  usuario_id: 78,
  codigo: "EOLICO-001",
  login: "usuario3@demo.com",
  nombres: "Usuario 3",
  primer_apellido: "Demo",
  fecha_inicio: "2026-01-20T04:00:00.000Z",
  estado: "activo"
}
```

## 🧪 Cómo Probar la Corrección

### Paso 1: Recargar la Aplicación
```bash
# Presionar F5 en el navegador (hard refresh con Ctrl+F5 si es necesario)
```

### Paso 2: Navegar al Modal de Cuotas
1. Ir a `/eolicos`
2. Hacer clic en **"Acciones"** de un equipo asignado
3. Seleccionar **"Ver Cuotas"** del menú desplegable

### Paso 3: Verificar la Información del Modal

El modal debe mostrar:
```
📋 Plan de cuotas — EOLICO-001

Cliente: Usuario 3 Demo
Login: usuario3@demo.com
Alquiler ID: 45
Inicio: 20/1/2026 00:00:00
```

### Paso 4: Hacer Clic en Botón "PDF"

**En una cuota con badge "Pagado" (verde):**
1. Hacer clic en el botón **"📄 PDF"**
2. **RESULTADO ESPERADO**:
   - Se abre nueva pestaña
   - URL: `http://localhost:3001/eolicos/123/recibo?token=...` (con ID numérico, NO "undefined")
   - Se muestra un PDF del recibo

### Paso 5: Verificar en DevTools (Opcional)

**Abrir la consola del navegador (F12):**

**ANTES de hacer clic en PDF, ejecutar en consola:**
```javascript
// Verificar que alquilerInfo tiene el eolico_id
console.log("alquilerInfo:", window.React?.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED); 
// Esto no funcionará directamente, mejor:

// Agregar temporalmente en el código para debuggear:
console.log("alquilerInfo:", alquilerInfo);
console.log("eolico_id:", alquilerInfo?.eolico_id);
```

**Después de hacer clic:**
- En la pestaña **Network** → Buscar petición GET a `/eolicos/{id}/recibo`
- Verificar que el ID sea un **número** y no "undefined"

## 🔍 Comparación de Modales

| Aspecto | Modal "Registrar Pago" | Modal "Plan de Cuotas" |
|---------|----------------------|----------------------|
| **Variable de equipo** | `equipoPago` | `alquilerInfo` |
| **Campo de ID** | `equipoPago.id_eolico` | `alquilerInfo.eolico_id` |
| **Estado del modal** | `openModalPago` | `openListaCuotas` |
| **Lista de cuotas** | No aplica | `listaCuotas` |
| **Función de apertura** | `abrirModalPago(equipo)` | `verCuotas(id_eolico)` |
| **Se abre desde** | Dropdown → "Registrar Pago" | Dropdown → "Ver Cuotas" |
| **Botón PDF** | ❌ No tiene | ✅ Sí tiene (corregido) |

## 📊 Flujo Completo de Datos

### Apertura del Modal

```
1. Usuario hace clic en "Ver Cuotas"
   ↓
2. Se ejecuta: verCuotas(id_eolico)
   ↓
3. Backend: GET /eolicos/${id_eolico}/cuotas
   ↓
4. Respuesta:
   {
     alquiler: { id_alquiler, eolico_id, codigo, ... },
     cuotas: [{ id_cuota, numero, monto, pagado, ... }, ...]
   }
   ↓
5. Frontend actualiza estados:
   - setAlquilerInfo(r.data.alquiler)  ← Guarda eolico_id aquí
   - setListaCuotas(r.data.cuotas)
   - setOpenListaCuotas(true)
   ↓
6. Modal se abre mostrando las cuotas
```

### Clic en Botón PDF

```
1. Usuario hace clic en botón "📄 PDF"
   ↓
2. Se construye URL:
   - Obtiene: alquilerInfo.eolico_id = 123
   - Obtiene: localStorage.getItem("token")
   - Construye: http://localhost:3001/eolicos/123/recibo?token=...
   ↓
3. Se ejecuta: window.open(url, '_blank')
   ↓
4. Backend: GET /eolicos/123/recibo
   ↓
5. Valida token y genera PDF
   ↓
6. Responde con PDF (Content-Type: application/pdf)
   ↓
7. Navegador muestra el PDF en nueva pestaña
```

## 🐛 Otros Posibles Errores

### Si sigue mostrando "undefined"

**Posible causa 1:** El código no se actualizó
```bash
# Solución: Hard refresh
Ctrl + F5
```

**Posible causa 2:** El backend no está devolviendo `eolico_id`
```javascript
// Verificar en consola del navegador:
console.log("alquilerInfo:", alquilerInfo);
// Si eolico_id es undefined, revisar el backend
```

**Posible causa 3:** Cache del navegador
```bash
# Solución: Limpiar caché
1. F12 → Pestaña Application
2. Storage → Clear site data
3. Recargar página
```

### Si sale error "Token faltante"

**Causa:** El token no está en localStorage
```javascript
// Verificar en consola:
console.log("Token:", localStorage.getItem("token"));
// Si es null, hacer login nuevamente
```

### Si el PDF no se genera

**Verificar backend:**
```bash
# En la terminal del backend, buscar el log:
GET /eolicos/123/recibo?token=...
```

**Si sale 404:** El eolico_id no existe en la base de datos
**Si sale 500:** Error en el backend al generar el PDF
**Si sale 401:** Token inválido o expirado

## 🚀 Mejora Futura: Recibo Individual por Cuota

Actualmente, el botón PDF abre el **recibo general del equipo eólico**, no específico de la cuota pagada.

### Propuesta de Mejora

Crear un endpoint específico para recibo de cuota individual:

**Backend:**
```javascript
app.get('/cuotas/:id/recibo', 
  requireAuth, 
  requireRole('administrador'),
  [param('id').isInt({ min: 1 })],
  async (req, res) => {
    const id_cuota = Number(req.params.id);
    
    // Consultar la cuota con información relacionada
    const sql = `
      SELECT 
        c.*,
        e.codigo, e.tarifa_mes,
        u.nombres, u.primer_apellido, u.segundo_apellido,
        a.fecha_inicio
      FROM cuotas c
      JOIN alquileres a ON a.id_alquiler = c.alquiler_id
      JOIN eolicos e ON e.id_eolico = a.eolico_id
      JOIN usuarios u ON u.id_usuario = a.usuario_id
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
      
      // Diseño del recibo
      doc.fontSize(24).text('RECIBO DE PAGO', { align: 'center', underline: true });
      doc.moveDown(2);
      
      doc.fontSize(14);
      doc.text(`Recibo Nro: ${cuota.id_cuota}`, { bold: true });
      doc.text(`Fecha de Emisión: ${new Date().toLocaleString('es-BO')}`);
      doc.moveDown();
      
      doc.fontSize(12);
      doc.text('DATOS DEL CLIENTE', { underline: true });
      doc.text(`Nombre: ${cuota.nombres} ${cuota.primer_apellido} ${cuota.segundo_apellido || ''}`);
      doc.text(`Equipo: ${cuota.codigo}`);
      doc.moveDown();
      
      doc.text('DETALLE DEL PAGO', { underline: true });
      doc.text(`Cuota Nro: ${cuota.numero}`);
      doc.text(`Concepto: ${cuota.concepto}`);
      doc.text(`Descripción: ${cuota.descripcion || '—'}`);
      doc.text(`Monto Pagado: Bs ${Number(cuota.monto).toFixed(2)}`);
      doc.text(`Fecha de Pago: ${new Date(cuota.fecha_pago).toLocaleString('es-BO')}`);
      doc.text(`Método de Pago: ${cuota.metodo_pago || 'Efectivo'}`);
      doc.text(`Fecha de Vencimiento: ${new Date(cuota.fecha_vencimiento).toLocaleDateString('es-BO')}`);
      doc.moveDown();
      
      if (cuota.observaciones) {
        doc.text('OBSERVACIONES', { underline: true });
        doc.text(cuota.observaciones);
        doc.moveDown();
      }
      
      doc.fontSize(10);
      doc.text('_'.repeat(60), { align: 'center' });
      doc.text('Firma Autorizada', { align: 'center' });
      
      doc.end();
    });
  }
);
```

**Frontend:**
```javascript
<button
  className="btn btn-sm btn-outline-primary"
  onClick={() => {
    const token = localStorage.getItem("token");
    const baseURL = process.env.REACT_APP_API_BASE || "http://localhost:3001";
    const url = `${baseURL}/cuotas/${c.id_cuota}/recibo?token=${token}&_t=${Date.now()}`;
    window.open(url, '_blank');
  }}
  title="Descargar recibo de esta cuota específica"
>
  <i className="bi bi-file-earmark-pdf"></i> PDF Cuota
</button>
```

Esto generaría un recibo más específico con:
- ✅ Solo información de esa cuota
- ✅ Fecha de pago registrada
- ✅ Método de pago utilizado
- ✅ Observaciones del pago
- ✅ Diseño profesional como comprobante

## ✅ Verificación Final

Después de recargar la página (F5), confirmar:

- [ ] El modal "Plan de cuotas" se abre correctamente
- [ ] Muestra información del alquiler (cliente, código, fecha inicio)
- [ ] Las cuotas pagadas tienen badge "Pagado" (verde)
- [ ] El botón "📄 PDF" aparece solo en cuotas pagadas
- [ ] Hacer clic en "PDF" abre nueva pestaña
- [ ] La URL contiene un ID numérico (NO "undefined")
- [ ] Se muestra un PDF correctamente
- [ ] El PDF se puede descargar o imprimir
- [ ] No hay errores en la consola del navegador

---

**Autor**: GitHub Copilot  
**Fecha**: 20 de octubre de 2025  
**Archivo modificado**: `frontend/src/pages/Eolicos.js`  
**Línea modificada**: 1470  
**Cambio**: `equipoPago?.id_eolico` → `alquilerInfo?.eolico_id`  
**Razón**: Usar la variable correcta del contexto del modal de cuotas
