# 🌐 SOLUCIÓN: API para Recibir Datos del Equipo Eólico (IoT)

## ⚠️ PROBLEMAS DETECTADOS

### 1. **Estructura de Base de Datos Inconsistente**

**Tabla actual:** `lecturas_resumen`
```sql
CREATE TABLE `lecturas_resumen` (
  `id_lectura` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `usuario_id` smallint(5) unsigned NOT NULL,  ← Solo tiene usuario_id
  `voltaje` decimal(10,2) DEFAULT NULL,
  `bateria` decimal(5,2) DEFAULT NULL,
  `consumo` decimal(12,2) DEFAULT NULL,
  `fecha_lectura` datetime NOT NULL DEFAULT current_timestamp(),
  ...
)
```

**Problema:**
- ❌ No tiene campo `eolico_id` 
- ❌ No tiene campo `cuenta_id`
- ❌ Código del backend usa `l.eolico_id` y `lr.cuenta_id` que **NO EXISTEN**

### 2. **No Existe Endpoint para IoT**
- ❌ No hay `POST /api/lecturas` para recibir datos del ESP32/Arduino
- ❌ No hay autenticación por `device_key` (API Key del dispositivo)

---

## ✅ SOLUCIÓN COMPLETA

### PASO 1: Actualizar Estructura de Base de Datos

**Opción A: Agregar columnas necesarias**
```sql
-- Agregar eolico_id y cuenta_id a lecturas_resumen
ALTER TABLE `lecturas_resumen`
  ADD COLUMN `eolico_id` smallint(5) unsigned DEFAULT NULL AFTER `usuario_id`,
  ADD COLUMN `cuenta_id` smallint(5) unsigned DEFAULT NULL AFTER `eolico_id`,
  ADD KEY `eolico_id` (`eolico_id`),
  ADD KEY `cuenta_id` (`cuenta_id`),
  ADD CONSTRAINT `fk_lectura_eolico` FOREIGN KEY (`eolico_id`) REFERENCES `eolicos` (`id_eolico`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_lectura_cuenta` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentas` (`id_cuenta`) ON DELETE CASCADE;
```

**Opción B: Migrar datos existentes** (si ya tienes lecturas)
```sql
-- Llenar eolico_id y cuenta_id basado en usuario_id existente
UPDATE lecturas_resumen lr
INNER JOIN usuarios u ON u.id_usuario = lr.usuario_id
INNER JOIN eolicos e ON e.usuario_id = u.id_usuario
SET lr.eolico_id = e.id_eolico, lr.cuenta_id = u.cuenta_id
WHERE lr.eolico_id IS NULL;
```

---

### PASO 2: Crear Endpoint de Recepción IoT

**Archivo:** `backend/index.js`

Agrega este endpoint **ANTES** de la línea `app.listen`:

```javascript
/* =========================================================
   API IoT - Recepción de Lecturas desde Equipos Eólicos
========================================================= */

/**
 * POST /api/iot/lectura
 * 
 * Recibe datos del equipo eólico (ESP32/Arduino)
 * Autenticación: device_key (generada en eolicos.device_key)
 * 
 * Body JSON:
 * {
 *   "device_key": "abc123xyz456...",
 *   "voltaje": 13.5,
 *   "bateria": 87.2,
 *   "consumo": 45.8
 * }
 */
app.post('/api/iot/lectura', 
  [
    body('device_key').isString().notEmpty().withMessage('device_key requerido'),
    body('voltaje').optional().isFloat({ min: 0, max: 50 }).withMessage('Voltaje inválido (0-50V)'),
    body('bateria').optional().isFloat({ min: 0, max: 100 }).withMessage('Batería inválida (0-100%)'),
    body('consumo').optional().isFloat({ min: 0, max: 1000 }).withMessage('Consumo inválido (0-1000W)')
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ [IoT] Validación fallida:', errors.array());
      return res.status(400).json({ error: 'Datos inválidos', detalles: errors.array() });
    }

    const { device_key, voltaje, bateria, consumo } = req.body;

    // 1. Buscar equipo eólico por device_key
    const sqlEolico = `
      SELECT e.id_eolico, e.codigo, e.activo, e.habilitado, e.usuario_id,
             u.cuenta_id
      FROM eolicos e
      INNER JOIN usuarios u ON u.id_usuario = e.usuario_id
      WHERE e.device_key = ?
      LIMIT 1
    `;

    db.query(sqlEolico, [device_key], (err, rows) => {
      if (err) {
        console.error('❌ [IoT] Error en DB:', err);
        return res.status(500).json({ error: 'Error en servidor' });
      }

      if (!rows || rows.length === 0) {
        console.log('⚠️ [IoT] device_key no encontrado:', device_key);
        return res.status(401).json({ error: 'Autenticación fallida - device_key inválido' });
      }

      const eolico = rows[0];

      // 2. Verificar que el equipo esté activo y habilitado
      if (!eolico.activo || !eolico.habilitado) {
        console.log('⚠️ [IoT] Equipo deshabilitado:', eolico.codigo);
        return res.status(403).json({ 
          error: 'Equipo deshabilitado', 
          codigo: eolico.codigo,
          mensaje: 'El equipo no está autorizado para enviar datos'
        });
      }

      // 3. Insertar lectura en la base de datos
      const sqlInsert = `
        INSERT INTO lecturas_resumen (usuario_id, eolico_id, cuenta_id, voltaje, bateria, consumo, fecha_lectura)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `;

      const valores = [
        eolico.usuario_id,
        eolico.id_eolico,
        eolico.cuenta_id,
        voltaje || null,
        bateria || null,
        consumo || null
      ];

      db.query(sqlInsert, valores, (errInsert, result) => {
        if (errInsert) {
          console.error('❌ [IoT] Error al insertar lectura:', errInsert);
          return res.status(500).json({ error: 'No se pudo guardar la lectura' });
        }

        console.log(`✅ [IoT] Lectura guardada - Equipo: ${eolico.codigo} | ID: ${result.insertId} | V:${voltaje}V B:${bateria}% C:${consumo}W`);

        // 4. Respuesta exitosa
        res.status(201).json({
          success: true,
          mensaje: 'Lectura recibida correctamente',
          id_lectura: result.insertId,
          equipo: eolico.codigo,
          timestamp: new Date().toISOString()
        });
      });
    });
  }
);
```

---

### PASO 3: Código Arduino/ESP32

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Configuración WiFi
const char* ssid = "TU_WIFI";
const char* password = "TU_PASSWORD";

// Configuración del servidor
const char* serverURL = "http://TU_IP:3001/api/iot/lectura";
const char* deviceKey = "OBTENER_DESDE_BACKEND"; // Ver tabla eolicos.device_key

// Pines de sensores (ejemplo)
#define PIN_VOLTAJE 34
#define PIN_BATERIA 35
#define PIN_CONSUMO 32

void setup() {
  Serial.begin(115200);
  
  // Conectar WiFi
  WiFi.begin(ssid, password);
  Serial.print("Conectando a WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" ✅ Conectado!");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Leer sensores
  float voltaje = leerVoltaje();
  float bateria = leerBateria();
  float consumo = leerConsumo();

  // Enviar datos al servidor
  enviarLectura(voltaje, bateria, consumo);

  delay(60000); // Enviar cada 1 minuto
}

float leerVoltaje() {
  int raw = analogRead(PIN_VOLTAJE);
  // Convertir lectura analógica a voltaje real (0-50V)
  return (raw / 4095.0) * 50.0;
}

float leerBateria() {
  int raw = analogRead(PIN_BATERIA);
  // Convertir a porcentaje (0-100%)
  return (raw / 4095.0) * 100.0;
}

float leerConsumo() {
  int raw = analogRead(PIN_CONSUMO);
  // Convertir a watts (0-1000W)
  return (raw / 4095.0) * 1000.0;
}

void enviarLectura(float v, float b, float c) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverURL);
    http.addHeader("Content-Type", "application/json");

    // Crear JSON
    StaticJsonDocument<256> doc;
    doc["device_key"] = deviceKey;
    doc["voltaje"] = v;
    doc["bateria"] = b;
    doc["consumo"] = c;

    String jsonData;
    serializeJson(doc, jsonData);

    // Enviar POST
    int httpCode = http.POST(jsonData);

    if (httpCode > 0) {
      String response = http.getString();
      Serial.println("✅ Respuesta (" + String(httpCode) + "): " + response);
    } else {
      Serial.println("❌ Error HTTP: " + String(httpCode));
    }

    http.end();
  } else {
    Serial.println("⚠️ WiFi desconectado");
  }
}
```

---

## 🔐 SEGURIDAD

### 1. **Autenticación por device_key**
- Cada equipo tiene una clave única en `eolicos.device_key`
- Se genera automáticamente al crear el equipo
- El ESP32 la envía en cada petición

### 2. **Validación de Estado**
- Solo acepta datos si `eolicos.activo = 1` y `habilitado = 1`
- Previene lecturas de equipos desautorizados

### 3. **Validación de Rangos**
- Voltaje: 0-50V
- Batería: 0-100%
- Consumo: 0-1000W

### 4. **Rate Limiting** (recomendado)
```javascript
// Instalar: npm install express-rate-limit
const rateLimit = require('express-rate-limit');

const iotLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 5, // máximo 5 peticiones por minuto por IP
  message: 'Demasiadas lecturas desde este dispositivo'
});

app.post('/api/iot/lectura', iotLimiter, [...validaciones], (req, res) => {
  // ...
});
```

---

## 📊 TESTING

### Probar con cURL:
```bash
curl -X POST http://localhost:3001/api/iot/lectura \
  -H "Content-Type: application/json" \
  -d '{
    "device_key": "TU_DEVICE_KEY_AQUI",
    "voltaje": 13.5,
    "bateria": 87.2,
    "consumo": 45.8
  }'
```

### Probar con Postman:
```
POST http://localhost:3001/api/iot/lectura
Headers:
  Content-Type: application/json
Body (raw JSON):
{
  "device_key": "abc123xyz456",
  "voltaje": 13.5,
  "bateria": 87.2,
  "consumo": 45.8
}
```

---

## 🔄 RESPUESTAS

### ✅ Éxito (201 Created):
```json
{
  "success": true,
  "mensaje": "Lectura recibida correctamente",
  "id_lectura": 1234,
  "equipo": "0001",
  "timestamp": "2025-10-23T15:30:00.000Z"
}
```

### ❌ device_key inválido (401):
```json
{
  "error": "Autenticación fallida - device_key inválido"
}
```

### ❌ Equipo deshabilitado (403):
```json
{
  "error": "Equipo deshabilitado",
  "codigo": "0001",
  "mensaje": "El equipo no está autorizado para enviar datos"
}
```

### ❌ Datos inválidos (400):
```json
{
  "error": "Datos inválidos",
  "detalles": [
    {
      "msg": "Voltaje inválido (0-50V)",
      "param": "voltaje",
      "location": "body"
    }
  ]
}
```

---

## 📝 CHECKLIST DE IMPLEMENTACIÓN

- [ ] Ejecutar ALTER TABLE para agregar `eolico_id` y `cuenta_id`
- [ ] Migrar datos existentes (si aplica)
- [ ] Agregar endpoint `/api/iot/lectura` en `backend/index.js`
- [ ] Reiniciar backend
- [ ] Probar con cURL/Postman
- [ ] Obtener `device_key` desde la tabla `eolicos`
- [ ] Programar ESP32/Arduino con el código
- [ ] Verificar lecturas en dashboard

---

## 🎯 RESULTADO FINAL

Una vez implementado:
1. ✅ El equipo eólico envía datos cada 1 minuto
2. ✅ Backend valida autenticación y estado
3. ✅ Lecturas se guardan en `lecturas_resumen`
4. ✅ Dashboard muestra datos en tiempo real
5. ✅ Alertas se generan automáticamente (voltaje > 15V, batería < 20%, consumo > 80W)
6. ✅ Sin cambios adicionales en el frontend

---

**¿Quieres que implemente estos cambios en tu sistema?** 🚀
