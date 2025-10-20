# 📄 NUEVO: Recibo Específico por Cuota Mensual

## 📋 Problema Identificado

El recibo anterior mostraba el **total general del alquiler** (instalación + depósito + tarifa mensual), lo cual NO es correcto para recibos de cuotas mensuales.

### Ejemplo del Problema

```
❌ RECIBO INCORRECTO (anterior):

Detalle del Pago

Tarifa mensual           Bs 50,00
Instalación             Bs 300,00  ← NO debe aparecer en cuotas mensuales
Depósito                Bs 100,00  ← NO debe aparecer en cuotas mensuales

TOTAL A PAGAR:          Bs 450,00  ← Monto incorrecto
```

**Problema:** 
- La instalación y el depósito solo se pagan **una vez al inicio**
- Las cuotas mensuales posteriores solo deben cobrar la **tarifa mensual**
- No se indicaba a **qué mes** corresponde el pago

## ✅ Solución Implementada

### 1. Nuevo Endpoint `/cuotas/:id/recibo`

Creado un endpoint específico para generar recibos de cuotas individuales.

**Características:**
- ✅ Obtiene datos específicos de la cuota (ID, número, concepto, monto, fechas)
- ✅ Calcula automáticamente el **mes al que corresponde** el pago
- ✅ Solo muestra el **monto de esa cuota específica**
- ✅ Valida que la cuota esté **pagada** antes de generar el recibo
- ✅ Muestra información del cliente y equipo
- ✅ Incluye fecha de pago y método de pago

### 2. Estructura del Nuevo Recibo

```
✅ RECIBO CORRECTO (nuevo):

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RECIBO DE PAGO - CUOTA MENSUAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Recibo Nro: 123          Equipo: 0002
Cuota Nro: 11            Período: Octubre 2026
                                    ↑ Muestra el mes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────┐  ┌──────────────────────┐
│ Cliente         │  │ Información de Pago  │
│ Nombre: NAELY   │  │ Fecha: 20/10/2025    │
│ CUBA LUNA       │  │ Método: Efectivo     │
└─────────────────┘  └──────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Detalle del Pago

┌──────────────────────────────────────┐
│ Concepto: TARIFA                     │
│ Descripción: Cuota 11 - Octubre 2026│
│ Período: Octubre 2026                │
└──────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MONTO PAGADO:                  Bs 50,00
                                  ↑
                        Solo la cuota mensual

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🎯 Diferencias Clave

| Aspecto | Recibo Anterior | Recibo Nuevo |
|---------|----------------|--------------|
| **Endpoint** | `/eolicos/:id/recibo` | `/cuotas/:id/recibo` |
| **Título** | "RECIBO DE PAGO - ALQUILER" | "RECIBO DE PAGO - CUOTA MENSUAL" |
| **Conceptos** | Instalación + Depósito + Tarifa | Solo la cuota específica |
| **Monto** | Bs 450,00 (total) | Bs 50,00 (solo cuota) |
| **Período** | No especificado | "Octubre 2026" |
| **Número de cuota** | No incluido | "Cuota Nro: 11" |
| **Fecha de pago** | No incluida | "20/10/2025" |
| **Método de pago** | No incluido | "Efectivo" |
| **Validación** | No valida si está pagada | Solo genera si pagado=1 |

## 🔍 Detalles Técnicos

### Query SQL del Nuevo Endpoint

```sql
SELECT 
  c.id_cuota, c.numero, c.concepto, c.descripcion, c.monto, 
  c.fecha_vencimiento, c.fecha_pago, c.pagado, c.metodo_pago, c.observaciones,
  e.id_eolico, e.codigo AS equipo_codigo,
  u.nombres, u.primer_apellido, u.segundo_apellido,
  a.id_alquiler, a.fecha_inicio
FROM cuotas c
JOIN alquileres a ON a.id_alquiler = c.alquiler_id
JOIN eolicos e ON e.id_eolico = a.eolico_id
JOIN usuarios u ON u.id_usuario = a.usuario_id
WHERE c.id_cuota = ?
```

**Joins:**
- `cuotas` → `alquileres` → Obtener información del alquiler
- `alquileres` → `eolicos` → Obtener código del equipo
- `alquileres` → `usuarios` → Obtener nombre del cliente

### Cálculo del Mes Correspondiente

```javascript
const fechaVencimiento = new Date(cuota.fecha_vencimiento);
const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
               'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const mesNombre = meses[fechaVencimiento.getMonth()];
const anio = fechaVencimiento.getFullYear();
const periodoMes = `${mesNombre} ${anio}`;  // "Octubre 2026"
```

**Lógica:**
- Toma la `fecha_vencimiento` de la cuota
- Extrae el mes y año
- Formatea como "Mes Año" (ej: "Octubre 2026")

### Validación de Cuota Pagada

```javascript
if (!cuota.pagado) {
  return res.status(400).json({ mensaje: 'Esta cuota aún no ha sido pagada' });
}
```

**Protección:** No se puede generar recibo de una cuota que no ha sido pagada.

## 📊 Estructura del PDF

### Sección 1: Header (92px)
```
┌────────────────────────────────────────┐
│ [Logo] Sistema de Energía Eólica      │
│        Dirección: Calle Manuel...      │
│        Tel: +591... NIT: 123456789     │
│                    Fecha: 20/10/2025   │
└────────────────────────────────────────┘
```

### Sección 2: Título
```
RECIBO DE PAGO - CUOTA MENSUAL
```

### Sección 3: Meta (50px)
```
┌──────────────────────────────────────┐
│ Recibo Nro: 123   | Equipo: 0002     │
│ Cuota Nro: 11     | Período: Oct 2026│
└──────────────────────────────────────┘
```

### Sección 4: Cajas Cliente e Información (70px cada una)
```
┌──────────────┐  ┌────────────────────┐
│ Cliente      │  │ Información de Pago│
│ Nombre: XXX  │  │ Fecha pago: XX/XX  │
│              │  │ Método: Efectivo   │
└──────────────┘  └────────────────────┘
```

### Sección 5: Detalle del Pago (80px)
```
Detalle del Pago

┌────────────────────────────────────┐
│ Concepto: TARIFA                   │
│ Descripción: Cuota 11 - Octubre... │
│ Período: Octubre 2026              │
└────────────────────────────────────┘
```

### Sección 6: Monto Total (grande y destacado)
```
───────────────────────────────────────

MONTO PAGADO:              Bs 50,00
```

### Sección 7: Observaciones
```
Observaciones: Pago correspondiente a la cuota mensual...
```

### Sección 8: Firmas
```
_______________        _______________
Recibí conforme       Entregué conforme
```

### Sección 9: Pie de Página
```
Recibo generado el 20/10/2025 | Sistema de Energía Eólica
```

## 🔄 Cambios en el Frontend

### Antes
```javascript
// Usaba el endpoint general del eolico
const response = await api.get(`/eolicos/${alquilerInfo?.eolico_id}/recibo`, {
  responseType: 'blob'
});
```

### Después
```javascript
// Usa el endpoint específico de la cuota
const response = await api.get(`/cuotas/${c.id_cuota}/recibo`, {
  responseType: 'blob'
});
```

**Cambio clave:** Ahora usa el `id_cuota` de la cuota específica en lugar del `eolico_id`.

## 🧪 Cómo Probar

### Paso 1: Reiniciar el Backend

**IMPORTANTE:** El backend DEBE reiniciarse para cargar el nuevo endpoint.

```bash
# Terminal del backend:
# 1. Detener con Ctrl+C
# 2. Reiniciar:
cd backend
npm start

# Esperar mensaje:
# "Servidor corriendo en puerto 3001"
```

### Paso 2: Limpiar Caché del Frontend

```bash
# En el navegador:
Ctrl + F5  (hard refresh)
```

### Paso 3: Navegar a las Cuotas

1. Ve a `/eolicos`
2. Haz clic en **"Acciones"** de un equipo asignado
3. Selecciona **"Ver Cuotas"**
4. Busca una cuota con badge **"Pagado"** (verde)

### Paso 4: Generar el Recibo

1. Haz clic en el botón **"📄 PDF"** de la cuota pagada
2. Se abrirá una nueva pestaña con el PDF

### Paso 5: Verificar el Contenido

El PDF debe mostrar:

✅ **Título:** "RECIBO DE PAGO - CUOTA MENSUAL"
✅ **Recibo Nro:** (el id_cuota)
✅ **Cuota Nro:** (el número de cuota)
✅ **Período:** "Octubre 2026" (o el mes correspondiente)
✅ **Información del cliente**
✅ **Fecha de pago:** 20/10/2025 (fecha real del pago)
✅ **Método de pago:** Efectivo
✅ **Detalle con 3 campos:**
   - Concepto: TARIFA
   - Descripción: Cuota X - Mes Año
   - Período: Mes Año
✅ **MONTO PAGADO:** Bs 50,00 (solo la cuota)

❌ **NO debe mostrar:**
- ❌ Instalación
- ❌ Depósito
- ❌ Total de Bs 450,00

## 📝 Casos de Uso

### Caso 1: Cuota Mensual Normal

**Datos:**
- Cuota Nro: 11
- Concepto: tarifa
- Monto: Bs 50,00
- Fecha vencimiento: 20/10/2026
- Fecha pago: 20/10/2025

**Recibo generado:**
```
RECIBO DE PAGO - CUOTA MENSUAL

Recibo Nro: 145          Equipo: 0002
Cuota Nro: 11            Período: Octubre 2026

Detalle del Pago
Concepto: TARIFA
Descripción: Cuota 11 - Octubre 2026
Período: Octubre 2026

MONTO PAGADO: Bs 50,00
```

### Caso 2: Primera Cuota (Instalación)

**Datos:**
- Cuota Nro: 1
- Concepto: instalacion
- Monto: Bs 300,00
- Fecha vencimiento: 20/10/2025

**Recibo generado:**
```
RECIBO DE PAGO - CUOTA MENSUAL

Recibo Nro: 135          Equipo: 0002
Cuota Nro: 1             Período: Octubre 2025

Detalle del Pago
Concepto: INSTALACION
Descripción: Cuota 1 - Octubre 2025
Período: Octubre 2025

MONTO PAGADO: Bs 300,00
```

### Caso 3: Cuota de Depósito

**Datos:**
- Cuota Nro: 1
- Concepto: deposito
- Monto: Bs 100,00

**Recibo generado:**
```
RECIBO DE PAGO - CUOTA MENSUAL

Recibo Nro: 136          Equipo: 0002
Cuota Nro: 1             Período: Octubre 2025

Detalle del Pago
Concepto: DEPOSITO
Descripción: Cuota 1 - Octubre 2025
Período: Octubre 2025

MONTO PAGADO: Bs 100,00
```

## 🔐 Seguridad

### Validaciones Implementadas

1. **Autenticación:** Requiere token JWT válido
   ```javascript
   requireAuth
   ```

2. **Autorización:** Solo administradores
   ```javascript
   requireRole('administrador')
   ```

3. **Validación de parámetro:**
   ```javascript
   [param('id').isInt({ min: 1 })]
   ```

4. **Cuota pagada:**
   ```javascript
   if (!cuota.pagado) {
     return res.status(400).json({ mensaje: 'Esta cuota aún no ha sido pagada' });
   }
   ```

## 🐛 Manejo de Errores

### Error 404: Cuota No Encontrada

```json
{
  "mensaje": "Cuota no encontrada"
}
```

**Causa:** El `id_cuota` no existe en la base de datos.

### Error 400: Cuota No Pagada

```json
{
  "mensaje": "Esta cuota aún no ha sido pagada"
}
```

**Causa:** Se intentó generar recibo de una cuota con `pagado=0`.

### Error 500: Error en Servidor

```json
{
  "mensaje": "Error en servidor"
}
```

**Causa:** Error en la consulta SQL o generación del PDF.

## 📊 Comparación de Endpoints

### Endpoint Antiguo (General)

**URL:** `GET /eolicos/:id/recibo`

**Uso:** Recibo general del alquiler (contrato completo)

**Muestra:**
- Instalación: Bs 300,00
- Depósito: Bs 100,00
- Tarifa mensual: Bs 50,00
- **Total: Bs 450,00**

**Cuándo usar:** Para generar el recibo del **contrato inicial** al asignar el equipo.

### Endpoint Nuevo (Específico)

**URL:** `GET /cuotas/:id/recibo`

**Uso:** Recibo de una cuota mensual específica

**Muestra:**
- Solo el monto de esa cuota: Bs 50,00
- Mes al que corresponde: Octubre 2026

**Cuándo usar:** Para generar recibo de **cada pago mensual**.

## ✅ Checklist de Verificación

Después de reiniciar el backend y limpiar caché:

- [ ] El backend se reinició sin errores
- [ ] El endpoint `/cuotas/:id/recibo` existe
- [ ] El botón PDF aparece en cuotas pagadas
- [ ] Hacer clic abre el PDF en nueva pestaña
- [ ] El título dice "RECIBO DE PAGO - CUOTA MENSUAL"
- [ ] Muestra el número de cuota (ej: "Cuota Nro: 11")
- [ ] Muestra el período (ej: "Octubre 2026")
- [ ] Muestra la fecha de pago real
- [ ] Muestra el método de pago
- [ ] El monto es SOLO de esa cuota (Bs 50,00)
- [ ] NO aparece instalación ni depósito
- [ ] El PDF cabe en una sola página
- [ ] Se puede descargar e imprimir correctamente

## 🚀 Mejoras Futuras (Opcional)

### 1. Agregar Código QR de Verificación

```javascript
const QRCode = require('qrcode');

const qrData = `https://tudominio.com/verificar/${cuota.id_cuota}`;
const qrImage = await QRCode.toDataURL(qrData);

doc.image(qrImage, W - MARGIN - 80, footerY - 60, { width: 70 });
```

### 2. Agregar Saldo Pendiente

```javascript
// Consultar cuotas pendientes
const sqlPendientes = `
  SELECT SUM(monto) as saldo_pendiente 
  FROM cuotas 
  WHERE alquiler_id = ? AND pagado = 0
`;

doc.text(`Saldo pendiente: ${dinero(saldoPendiente)}`, ...);
```

### 3. Enviar Recibo por Email Automáticamente

```javascript
const nodemailer = require('nodemailer');

// Después de generar el PDF
const mailOptions = {
  from: 'sistema@energia-eolica.com',
  to: cliente.email,
  subject: `Recibo de Pago - Cuota ${cuota.numero}`,
  text: `Adjunto encontrará el recibo de su pago.`,
  attachments: [{ 
    filename: `recibo_cuota_${cuota.numero}.pdf`, 
    content: pdfBuffer 
  }]
};

transporter.sendMail(mailOptions);
```

### 4. Historial de Recibos

Crear una tabla `recibos_generados` para llevar registro:

```sql
CREATE TABLE recibos_generados (
  id_recibo INT PRIMARY KEY AUTO_INCREMENT,
  cuota_id INT,
  fecha_generacion DATETIME,
  generado_por INT,
  FOREIGN KEY (cuota_id) REFERENCES cuotas(id_cuota)
);
```

---

**Autor**: GitHub Copilot  
**Fecha**: 20 de octubre de 2025  
**Archivos modificados:**
- `backend/index.js` - Nuevo endpoint `/cuotas/:id/recibo`
- `frontend/src/pages/Eolicos.js` - Actualizado para usar nuevo endpoint
**Líneas agregadas:** ~180 líneas (backend)
**Cambio clave:** Recibo específico por cuota que solo muestra el monto de esa cuota y el mes al que corresponde
