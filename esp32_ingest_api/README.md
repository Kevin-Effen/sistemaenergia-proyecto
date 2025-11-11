# ESP32 Ingest API

API mínima para recibir lecturas desde ESP32 (INA219, PZEM-008) y guardarlas en `lecturas_resumen`.

## 1) Requisitos

- Node.js 18+ (probado con 20/22)
- MySQL/MariaDB con la base `sistema_energia_eolica` y tabla `lecturas_resumen`

## 2) Instalación

```bash
cd esp32_ingest_api
npm install
cp .env.example .env
# edita .env con tus credenciales y un INGEST_API_KEY fuerte
npm start
```

Endpoint de salud:
```
GET http://localhost:3002/api/v1/health
```

## 3) Seguridad (DB y API Key)

Crea un usuario de BD con permisos mínimos (ver `grants.sql`) y configura `INGEST_API_KEY` en `.env`.
El ESP32 enviará este token en el header `x-api-key`.

## 4) Insertar lectura (POST)

```
POST /api/v1/lecturas
Headers:
  Content-Type: application/json
  x-api-key: <tu_clave>
Body:
{
  "usuario_id": 6,
  "voltaje": 12.7,
  "bateria": 83.4,
  "consumo": 45.8,
  "fecha_lectura": "2025-10-05T17:34:00Z"   // opcional
}
```

Respuesta 201:
```json
{ "ok": true, "id_lectura": 123, ... }
```

## 5) Última lectura (GET)
```
GET /api/v1/lecturas/ultimo/6
```

## 6) Postman

Importa `postman_collection.json` y prueba:
- Health
- Insert lectura (con x-api-key)
- Última lectura

## 7) Índices recomendados

```sql
CREATE INDEX idx_lecturas_usuario_fecha
  ON lecturas_resumen (usuario_id, fecha_lectura);
```

## 8) Producción

- Ejecuta como servicio (pm2 o NSSM/Microsoft Service) y firewall únicamente para tu LAN/ESP32.
- Rotación de logs, backups, y monitoreo básico.
