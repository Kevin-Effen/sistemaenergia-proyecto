# 📄 MEJORA: Recibo Simplificado y Optimizado

## 📋 Cambios Solicitados

El usuario solicitó las siguientes mejoras en el recibo PDF:

1. ✅ **Eliminar el login del cliente** - No debe mostrarse información sensible
2. ✅ **Eliminar la tabla "Costos vigentes"** - No es relevante para un recibo de pago
3. ✅ **Eliminar la segunda hoja** - Todo debe caber en una sola página

## 🔧 Cambios Implementados

### 1. Eliminación del Login del Cliente

**ANTES:**
```javascript
const sql = `
  SELECT 
    ...
    c.usuario AS login,  // ← Se consultaba el login
    ...
  FROM eolicos e
  LEFT JOIN cuentas c ON c.id_cuenta = u.cuenta_id  // ← JOIN innecesario
`;

// En el PDF:
doc.text(`Login: ${r.login || '—'}`, ...);  // ← Se mostraba el login
```

**DESPUÉS:**
```javascript
const sql = `
  SELECT 
    ...
    -- Sin campo login
    ...
  FROM eolicos e
  -- Sin JOIN a tabla cuentas
`;

// En el PDF:
// Campo "Login" eliminado completamente
doc.text(`Nombre: ${nombreCliente}`, ...);  // ← Solo nombre
```

**Razón:** El login (email) es información sensible que no debe aparecer en recibos impresos que pueden ser compartidos.

### 2. Eliminación de la Tabla "Costos Vigentes"

**ANTES:**
```javascript
// Tabla completa con 4 filas de costos
doc.font('Helvetica-Bold').fontSize(12).text('Costos vigentes', MARGIN, doc.y);
doc.moveDown(0.4);

// Encabezado de tabla
doc.rect(MARGIN, y, W - MARGIN * 2, ROW_H).fill('#ECEFF1');
doc.text('Concepto', c1, y + 7);
doc.text('Detalle', c2, y + 7);
doc.text('Monto (Bs.)', c3, y + 7);

// Filas de datos
fila('Tarifa mensual', 'Uso del sistema eólico', r.tarifa_mes);
fila('Instalación', 'Instalación y puesta en marcha', r.costo_instalacion);
fila('Depósito', 'Garantía reembolsable', r.deposito);
fila('Costo operativo/día', 'Mantenimiento/operación', r.costo_operativo_dia);

doc.text('Total inicial estimado', ...);
```

**DESPUÉS:**
```javascript
// Reemplazado por caja simple de información del alquiler
doc.font('Helvetica-Bold').fontSize(12).text('Información del Alquiler', MARGIN, y);

doc.roundedRect(MARGIN, y, W - MARGIN * 2, 50, 6).fill('#F5F5F5').stroke('#CFD8DC');

if (r.id_alquiler) {
  doc.text(`Nro. de alquiler: ${r.id_alquiler}`, ...);
  doc.text(`Fecha de inicio: ${fechaL(r.fecha_inicio)}`, ...);
}

// Total del alquiler al final
doc.font('Helvetica-Bold').fontSize(14).text('Total del Alquiler:', ...);
doc.text(dinero(totalInicial), ...);
```

**Razón:** Un recibo de pago debe mostrar solo el monto pagado, no un desglose detallado de todos los conceptos. Esto ahorra espacio y simplifica el documento.

### 3. Optimización para Una Sola Página

**Cambios de diseño:**

| Elemento | Antes | Después | Ahorro |
|----------|-------|---------|--------|
| **BOX_H** (altura cajas) | 88px | 70px | 18px |
| **Tabla de costos** | 4 filas + header | Eliminada | ~150px |
| **Separación "Login"** | 1 línea extra | Eliminada | ~20px |
| **Título** | "RECIBO / DETALLE DE EQUIPO" | "RECIBO DE PAGO - ALQUILER" | Más claro |
| **Color título** | `#E3F2FD` (azul claro) | `#000000` (negro) | Mejor contraste |
| **Posición firmas** | Fijo en bottom | Relativo después contenido | Flexible |
| **Posición pie** | Fijo en bottom | Relativo después firmas | Flexible |

**Total ahorrado:** ~188px → Asegura que todo quepa en una página A4

## 📊 Estructura del Nuevo Recibo

### Layout Vertical (Una Sola Página)

```
┌────────────────────────────────────────────────┐
│  HEADER AZUL (92px)                            │
│  - Logo empresa (izquierda)                    │
│  - Nombre, dirección, teléfono, NIT            │
│  - Fecha de generación (derecha)               │
├────────────────────────────────────────────────┤
│  TÍTULO: RECIBO DE PAGO - ALQUILER             │
├────────────────────────────────────────────────┤
│  CAJA META (50px)                              │
│  - Código equipo: 0002                         │
│  - Estado: Activado                            │
│  - Habilitado: Sí                              │
├────────────────────────────────────────────────┤
│  CAJAS CLIENTE Y EQUIPO (70px c/u)             │
│  ┌──────────────┐ ┌──────────────┐            │
│  │ Cliente      │ │ Equipo       │            │
│  │ Nombre: XXX  │ │ Creado: ...  │            │
│  │              │ │ Nro: 2       │            │
│  └──────────────┘ └──────────────┘            │
├────────────────────────────────────────────────┤
│  INFORMACIÓN DEL ALQUILER (50px)               │
│  ┌──────────────────────────────────────────┐ │
│  │ Nro. de alquiler: 20                     │ │
│  │ Fecha de inicio: 19/10/2025, 11:57:47   │ │
│  └──────────────────────────────────────────┘ │
├────────────────────────────────────────────────┤
│  TOTAL DEL ALQUILER                            │
│  Total del Alquiler:            Bs 450,00      │
├────────────────────────────────────────────────┤
│  OBSERVACIONES (pequeñas)                      │
│  Este documento es un comprobante de pago...   │
├────────────────────────────────────────────────┤
│  FIRMAS                                        │
│  _______________        _______________        │
│  Recibí conforme       Entregué conforme       │
├────────────────────────────────────────────────┤
│  PIE DE PÁGINA                                 │
│  Documento generado por el Sistema...          │
└────────────────────────────────────────────────┘

Total: ~700px (cabe en 842px de altura A4)
```

## 🎨 Mejoras Visuales

### Título Más Profesional

**ANTES:**
```javascript
doc.font('Helvetica-Bold').fontSize(16).fillColor('#E3F2FD').text('RECIBO / DETALLE DE EQUIPO');
//                                                   ↑ Azul claro, difícil de leer
```

**DESPUÉS:**
```javascript
doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000').text('RECIBO DE PAGO - ALQUILER');
//                                                   ↑ Negro, mejor contraste
```

### Caja de Información Destacada

**ANTES:**
```javascript
// Texto plano sin fondo
doc.text(`Nro. de alquiler: ${r.id_alquiler}`, MARGIN, y);
doc.text(`Inicio: ${fechaL(r.fecha_inicio)}`, MARGIN + 220, y);
```

**DESPUÉS:**
```javascript
// Caja con fondo gris claro y borde redondeado
doc.roundedRect(MARGIN, y, W - MARGIN * 2, 50, 6)
   .fill('#F5F5F5')
   .stroke('#CFD8DC');

doc.text(`Nro. de alquiler: ${r.id_alquiler}`, MARGIN + 12, y + 12);
doc.text(`Fecha de inicio: ${fechaL(r.fecha_inicio)}`, MARGIN + 12, y + 28);
```

### Total Más Grande y Destacado

**ANTES:**
```javascript
doc.font('Helvetica-Bold').fontSize(11).text('Total inicial estimado', ...);
doc.font('Helvetica-Bold').fontSize(11).text(dinero(totalInicial), ...);
```

**DESPUÉS:**
```javascript
doc.moveTo(MARGIN, y).lineTo(W - MARGIN, y).stroke('#DDDDDD');  // Línea separadora

doc.font('Helvetica-Bold').fontSize(14).text('Total del Alquiler:', MARGIN, y);
doc.font('Helvetica-Bold').fontSize(14).text(dinero(totalInicial), W - MARGIN - 150, y, {
  width: 150,
  align: 'right'
});
```

## 🧪 Cómo Probar

### Paso 1: Reiniciar el Backend

```bash
# Detener el servidor backend (Ctrl+C)
# Reiniciar el backend
cd backend
npm start
```

**Importante:** El backend debe reiniciarse para que los cambios en el código tomen efecto.

### Paso 2: Limpiar Caché del Navegador

```bash
# En el navegador:
1. F12 → Pestaña Application
2. Storage → Clear site data
3. Recargar con Ctrl+F5
```

### Paso 3: Abrir el Recibo

1. Ve a `/eolicos`
2. Haz clic en **"Acciones"** → **"Ver Cuotas"**
3. Haz clic en **"📄 PDF"** de una cuota pagada

### Paso 4: Verificar el PDF

**Debe mostrar:**
- ✅ **Una sola página** (no dos)
- ✅ **Sin campo "Login"** en la sección Cliente
- ✅ **Sin tabla "Costos vigentes"**
- ✅ Solo **"Información del Alquiler"** con número y fecha
- ✅ **Total del Alquiler** al final con monto grande
- ✅ Firmas y pie de página al final

**NO debe mostrar:**
- ❌ Tabla con 4 filas de costos
- ❌ Campo "Login:" con email
- ❌ Segunda página en blanco

## 🔍 Comparación Antes/Después

### Información del Cliente

| Antes | Después |
|-------|---------|
| Nombre: NAELY CUBA LUNA | Nombre: NAELY CUBA LUNA |
| Login: cubanaely@gmail.com | *(eliminado)* |

### Sección de Costos

| Antes | Después |
|-------|---------|
| **Costos vigentes** | **Información del Alquiler** |
| Tabla con 4 filas: | Caja simple: |
| - Tarifa mensual: Bs 50,00 | - Nro. de alquiler: 20 |
| - Instalación: Bs 300,00 | - Fecha de inicio: 19/10/2025 |
| - Depósito: Bs 100,00 | |
| - Costo operativo/día: Bs 10,00 | |
| Total inicial estimado: Bs 450,00 | **Total del Alquiler: Bs 450,00** |

### Tamaño del Documento

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Páginas** | 2 | 1 |
| **Altura usada** | ~950px | ~700px |
| **Información mostrada** | Excesiva | Esencial |
| **Legibilidad** | Sobrecargada | Clara y concisa |

## 📝 Observaciones Técnicas

### Variables Eliminadas

```javascript
// Ya no se usan:
const ROW_H = 26;  // Altura de filas de tabla
const c1, c2, c3;  // Columnas de tabla
const fila = (...) => { ... };  // Función para crear filas
```

### Cálculo del Total

El cálculo del total **se mantiene igual**:
```javascript
const totalInicial = Number(r.tarifa_mes || 0) + 
                     Number(r.costo_instalacion || 0) + 
                     Number(r.deposito || 0);
```

Pero ya no se muestran los conceptos individuales, solo el total.

### Posicionamiento Dinámico

**ANTES (posición fija):**
```javascript
const fy = doc.page.height - 120;  // Firmas siempre a 120px del fondo
doc.text('...', MARGIN, doc.page.height - 40);  // Pie siempre a 40px del fondo
```

**DESPUÉS (posición relativa):**
```javascript
const fy = y + 20;  // Firmas después del contenido
const footerY = fy + 40;  // Pie después de las firmas
```

Esto permite que el contenido se ajuste automáticamente sin generar páginas adicionales.

## 🚀 Próximas Mejoras (Opcional)

### 1. Recibo Específico por Cuota

Actualmente, el recibo muestra información general del alquiler. Para mostrar información específica de la cuota pagada, se podría crear:

**Nuevo endpoint:** `GET /cuotas/:id/recibo`

```javascript
app.get('/cuotas/:id/recibo', requireAuth, requireRole('administrador'), 
  [param('id').isInt({ min: 1 })], 
  async (req, res) => {
    const id_cuota = Number(req.params.id);
    
    const sql = `
      SELECT 
        c.*,
        e.codigo, u.nombres, u.primer_apellido, u.segundo_apellido,
        a.fecha_inicio
      FROM cuotas c
      JOIN alquileres a ON a.id_alquiler = c.alquiler_id
      JOIN eolicos e ON e.id_eolico = a.eolico_id
      JOIN usuarios u ON u.id_usuario = a.usuario_id
      WHERE c.id_cuota = ? AND c.pagado = 1
    `;
    
    db.query(sql, [id_cuota], (err, rows) => {
      if (err || !rows?.length) {
        return res.status(404).json({ mensaje: 'Cuota no encontrada o no pagada' });
      }
      
      const cuota = rows[0];
      
      // Generar PDF específico de la cuota
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 
        `inline; filename="recibo_cuota_${cuota.numero}.pdf"`);
      doc.pipe(res);
      
      // ... diseño específico para la cuota
      doc.text(`Cuota Nro: ${cuota.numero}`);
      doc.text(`Concepto: ${cuota.concepto}`);
      doc.text(`Monto: ${dinero(cuota.monto)}`);
      doc.text(`Fecha de pago: ${fechaL(cuota.fecha_pago)}`);
      doc.text(`Método de pago: ${cuota.metodo_pago || 'Efectivo'}`);
      
      doc.end();
    });
  }
);
```

**Frontend:**
```javascript
// En el botón PDF de la cuota:
const url = `${baseURL}/cuotas/${c.id_cuota}/recibo?token=${token}`;
```

### 2. QR Code para Verificación

Agregar un código QR que permita verificar la autenticidad del recibo:

```javascript
const QRCode = require('qrcode');

// Generar QR con URL de verificación
const qrUrl = `https://tudominio.com/verificar-recibo/${r.id_alquiler}`;
const qrImage = await QRCode.toDataURL(qrUrl);

// Agregar al PDF
doc.image(qrImage, W - MARGIN - 80, footerY - 60, { width: 70 });
```

### 3. Logo Personalizado por Empresa

```javascript
// Permitir logo desde URL o base64
if (EMP.logo) {
  if (EMP.logo.startsWith('http')) {
    // Descargar y usar logo desde URL
    const response = await axios.get(EMP.logo, { responseType: 'arraybuffer' });
    doc.image(Buffer.from(response.data), MARGIN, 18, { fit: [50, 50] });
  } else if (fs.existsSync(EMP.logo)) {
    // Usar logo local
    doc.image(EMP.logo, MARGIN, 18, { fit: [50, 50] });
  }
}
```

## ✅ Checklist de Verificación

Después de reiniciar el backend y limpiar caché, confirmar:

- [ ] El backend se reinició correctamente
- [ ] El recibo PDF se genera sin errores
- [ ] El recibo tiene **solo una página**
- [ ] NO aparece el campo **"Login:"** en la sección Cliente
- [ ] NO aparece la tabla **"Costos vigentes"**
- [ ] SÍ aparece **"Información del Alquiler"** con número y fecha
- [ ] SÍ aparece **"Total del Alquiler"** con monto destacado
- [ ] Las firmas están visibles
- [ ] El pie de página está visible
- [ ] El documento se puede descargar o imprimir correctamente

---

**Autor**: GitHub Copilot  
**Fecha**: 20 de octubre de 2025  
**Archivo modificado**: `backend/index.js`  
**Líneas modificadas**: 1520-1670 (endpoint `/eolicos/:id/recibo`)  
**Cambios clave:**
- Eliminado campo `login` del query y del PDF
- Eliminada tabla "Costos vigentes" completa
- Reducida altura de cajas (88px → 70px)
- Optimizado layout para una sola página
- Mejorado contraste del título
- Agregada caja destacada para información del alquiler
