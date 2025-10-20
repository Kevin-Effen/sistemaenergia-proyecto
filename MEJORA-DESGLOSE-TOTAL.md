# 💰 MEJORA: Desglose Detallado del Total

## 📋 Cambio Solicitado

El usuario solicitó que en lugar de mostrar solo:
```
Total del Alquiler: Bs 450,00
```

Se muestre un **desglose detallado** explicando por qué se está cobrando ese monto.

## ✅ Solución Implementada

### Nuevo Diseño del Recibo

**ANTES:**
```
Información del Alquiler
┌────────────────────────────┐
│ Nro. de alquiler: 20       │
│ Fecha de inicio: 19/10/2025│
└────────────────────────────┘

───────────────────────────────

Total del Alquiler:  Bs 450,00
```

**DESPUÉS:**
```
Información del Alquiler
┌────────────────────────────┐
│ Nro. de alquiler: 20       │
│ Fecha de inicio: 19/10/2025│
└────────────────────────────┘

───────────────────────────────

Detalle del Pago

Tarifa mensual                      Bs 50,00
  Uso del sistema eólico

Instalación                        Bs 300,00
  Instalación y puesta en marcha

Depósito                           Bs 100,00
  Garantía reembolsable

───────────────────────────────

TOTAL A PAGAR:                     Bs 450,00
```

## 🎨 Características del Nuevo Diseño

### 1. Sección "Detalle del Pago"

```javascript
doc.font('Helvetica-Bold').fontSize(12).text('Detalle del Pago', MARGIN, y);
```

Encabezado claro que indica que se mostrará un desglose.

### 2. Función `mostrarDetalle()`

```javascript
const mostrarDetalle = (concepto, monto, descripcion = '') => {
  if (Number(monto) > 0) {  // ← Solo muestra si el monto es mayor a 0
    // Concepto (izquierda)
    doc.font('Helvetica').fontSize(10).fillColor('#333');
    doc.text(concepto, MARGIN + 10, y, { width: 200 });
    
    // Descripción (debajo del concepto, más pequeña)
    if (descripcion) {
      doc.font('Helvetica').fontSize(9).fillColor('#666');
      doc.text(descripcion, MARGIN + 10, y + 12, { width: 200 });
    }
    
    // Monto (derecha, alineado)
    doc.font('Helvetica').fontSize(10).fillColor('#000');
    doc.text(dinero(monto), W - MARGIN - 120, y, { 
      width: 120, 
      align: 'right' 
    });
    
    y += descripcion ? 30 : 22;  // Espacio variable según tenga descripción
  }
};
```

**Características:**
- ✅ **Solo muestra conceptos con monto > 0** (si tarifa = 0, no aparece)
- ✅ **Concepto en negrita** tamaño 10
- ✅ **Descripción en gris** tamaño 9 (más pequeño)
- ✅ **Monto alineado a la derecha** para fácil lectura
- ✅ **Espaciado inteligente** según tenga o no descripción

### 3. Conceptos Mostrados

```javascript
mostrarDetalle('Tarifa mensual', r.tarifa_mes, 'Uso del sistema eólico');
mostrarDetalle('Instalación', r.costo_instalacion, 'Instalación y puesta en marcha');
mostrarDetalle('Depósito', r.deposito, 'Garantía reembolsable');
```

**Nota:** El `costo_operativo_dia` **no se incluye** en el detalle porque generalmente no forma parte del pago inicial del alquiler (se cobra después según uso).

### 4. Total Destacado

```javascript
// Línea separadora
doc.moveTo(MARGIN, y).lineTo(W - MARGIN, y).stroke('#DDDDDD');

// Total en tamaño grande y negrita
doc.font('Helvetica-Bold').fontSize(14).text('TOTAL A PAGAR:', MARGIN, y);
doc.font('Helvetica-Bold').fontSize(14).text(dinero(totalInicial), 
  W - MARGIN - 150, y, { width: 150, align: 'right' });
```

**Características:**
- ✅ Línea separadora antes del total
- ✅ Texto "TOTAL A PAGAR:" en mayúsculas para énfasis
- ✅ Tamaño de fuente 14 (más grande que el resto)
- ✅ Monto alineado a la derecha

## 📊 Ejemplo Visual

### Caso 1: Alquiler Completo (todos los conceptos)

```
Detalle del Pago

Tarifa mensual                      Bs 50,00
  Uso del sistema eólico

Instalación                        Bs 300,00
  Instalación y puesta en marcha

Depósito                           Bs 100,00
  Garantía reembolsable

───────────────────────────────────────────

TOTAL A PAGAR:                     Bs 450,00
```

### Caso 2: Solo Tarifa Mensual

```
Detalle del Pago

Tarifa mensual                      Bs 50,00
  Uso del sistema eólico

───────────────────────────────────────────

TOTAL A PAGAR:                      Bs 50,00
```

### Caso 3: Instalación + Depósito (sin tarifa)

```
Detalle del Pago

Instalación                        Bs 300,00
  Instalación y puesta en marcha

Depósito                           Bs 100,00
  Garantía reembolsable

───────────────────────────────────────────

TOTAL A PAGAR:                     Bs 400,00
```

## 🎯 Ventajas del Nuevo Diseño

### 1. Transparencia
El cliente puede ver **exactamente qué está pagando** sin tener que preguntar.

### 2. Profesionalismo
El recibo parece más completo y profesional, similar a facturas comerciales.

### 3. Flexibilidad
Solo se muestran los conceptos que tienen valor, evitando líneas de "Bs 0,00".

### 4. Claridad
Las descripciones ayudan a entender cada concepto:
- "Tarifa mensual" → "Uso del sistema eólico"
- "Instalación" → "Instalación y puesta en marcha"
- "Depósito" → "Garantía reembolsable"

### 5. Espacio Optimizado
Sigue cabiendo en una sola página gracias al espaciado inteligente.

## 🔍 Comparación de Tamaños de Fuente

| Elemento | Tamaño | Peso |
|----------|--------|------|
| **Header empresa** | 18 | Bold |
| **Título "RECIBO DE PAGO"** | 16 | Bold |
| **Sección "Detalle del Pago"** | 12 | Bold |
| **Concepto** (Tarifa, Instalación) | 10 | Normal |
| **Descripción** (texto gris) | 9 | Normal |
| **Monto** (Bs 50,00) | 10 | Normal |
| **"TOTAL A PAGAR:"** | 14 | Bold |
| **Total (Bs 450,00)** | 14 | Bold |
| **Observaciones** | 10 | Normal |
| **Firmas** | 10 | Normal |
| **Pie de página** | 9 | Normal |

## 🧪 Cómo Probar

### Paso 1: Reiniciar el Backend

**IMPORTANTE:** El backend debe reiniciarse para que los cambios tomen efecto.

```bash
# Detener el backend actual (Ctrl+C)
cd backend
npm start
```

### Paso 2: Limpiar Caché y Recargar

```bash
# En el navegador:
Ctrl + F5  (hard refresh)
```

### Paso 3: Generar el Recibo

1. Ve a `/eolicos`
2. Haz clic en **"Acciones"** → **"Ver Cuotas"**
3. Haz clic en **"📄 PDF"** de una cuota pagada

### Paso 4: Verificar el Desglose

El PDF debe mostrar:

✅ **Sección "Detalle del Pago"**
✅ **Lista de conceptos con sus montos:**
   - Tarifa mensual: Bs 50,00
   - Instalación: Bs 300,00
   - Depósito: Bs 100,00
✅ **Descripción gris debajo de cada concepto**
✅ **Línea separadora**
✅ **"TOTAL A PAGAR: Bs 450,00"** en tamaño grande

## 🎨 Código Clave

### Lógica de Visualización Condicional

```javascript
const mostrarDetalle = (concepto, monto, descripcion = '') => {
  if (Number(monto) > 0) {  // ← Solo si monto > 0
    // Mostrar concepto, descripción y monto
  }
  // Si monto = 0, no se muestra nada
};
```

Esta lógica evita mostrar líneas como:
```
❌ Tarifa mensual: Bs 0,00
```

### Espaciado Dinámico

```javascript
y += descripcion ? 30 : 22;
//   ↑ Si hay descripción: 30px de espacio
//   ↑ Si NO hay descripción: 22px de espacio
```

Esto permite un diseño limpio y compacto.

## 📏 Verificación de Espacio en Página

Con el nuevo desglose, la distribución es:

```
Header:                92px
Título + Meta:         ~80px
Cajas Cliente/Equipo:  ~90px
Info Alquiler:         ~80px
Detalle del Pago:      ~150px (3 conceptos con descripción)
Observaciones:         ~50px
Firmas:                ~60px
Pie:                   ~30px
─────────────────────────
TOTAL:                ~632px

Altura A4:            842px
Margen sobrante:      210px ✅
```

**Conclusión:** Aún cabe cómodamente en una sola página.

## 🚀 Mejoras Futuras (Opcional)

### 1. Agregar Fecha de Vencimiento

```javascript
doc.text(`Fecha de vencimiento: ${fechaL(fechaVencimiento)}`, ...);
```

### 2. Agregar Método de Pago

```javascript
doc.text(`Método de pago: Efectivo`, ...);
```

### 3. Agregar Número de Cuota

```javascript
doc.text(`Cuota Nro: 1 de 12`, ...);
```

### 4. Agregar Saldo Pendiente

```javascript
doc.text(`Saldo pendiente: Bs 450,00`, ...);
```

## ✅ Checklist de Verificación

Después de reiniciar el backend, confirmar:

- [ ] El backend se reinició sin errores
- [ ] El PDF se genera correctamente
- [ ] Aparece la sección **"Detalle del Pago"**
- [ ] Se muestran **3 conceptos** (Tarifa, Instalación, Depósito)
- [ ] Cada concepto tiene su **descripción en gris**
- [ ] Los montos están **alineados a la derecha**
- [ ] Hay una **línea separadora** antes del total
- [ ] El total dice **"TOTAL A PAGAR:"** en mayúsculas
- [ ] El monto total es **Bs 450,00**
- [ ] Todo cabe en **una sola página**
- [ ] El PDF se puede descargar e imprimir correctamente

## 🐛 Troubleshooting

### Si no aparece el desglose:

**Causa:** El backend no se reinició correctamente

**Solución:**
```bash
# 1. Verificar que el backend esté corriendo
# 2. Detener con Ctrl+C
# 3. Reiniciar: npm start
# 4. Esperar mensaje: "Servidor corriendo en puerto 3001"
```

### Si los montos son Bs 0,00:

**Causa:** Los valores en la base de datos son 0 o NULL

**Solución:**
```sql
-- Verificar valores en la base de datos
SELECT tarifa_mes, costo_instalacion, deposito 
FROM eolicos 
WHERE id_eolico = 2;

-- Actualizar si es necesario
UPDATE eolicos 
SET tarifa_mes = 50, 
    costo_instalacion = 300, 
    deposito = 100 
WHERE id_eolico = 2;
```

### Si el PDF tiene 2 páginas:

**Causa:** El desglose agregó demasiado contenido

**Solución:** Reducir el tamaño de fuente o espaciado:
```javascript
// Cambiar:
y += descripcion ? 30 : 22;
// Por:
y += descripcion ? 25 : 18;
```

---

**Autor**: GitHub Copilot  
**Fecha**: 20 de octubre de 2025  
**Archivo modificado**: `backend/index.js`  
**Líneas modificadas**: ~1600-1650  
**Cambio clave:**
- Agregada sección "Detalle del Pago"
- Función `mostrarDetalle()` para mostrar conceptos condicionalmente
- Total renombrado a "TOTAL A PAGAR:" con mayor énfasis
- Solo se muestran conceptos con monto > 0
