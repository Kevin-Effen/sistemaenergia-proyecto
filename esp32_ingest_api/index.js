// index.js
// ESP32 Ingest API (INA219, PZEM-008) -> MySQL lecturas_resumen
// Modo multi-tenant por dispositivo (eólico).
// --------------------------------------------------------------
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mysql from 'mysql2/promise';

const app = express();
const PORT = process.env.PORT || 3002;

// ---- Seguridad & parsing
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(express.json({ limit: '64kb' }));

// ---- Rate limit
const limiter = rateLimit({
  windowMs: 10 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// ---- Pool MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: +(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'esp32_writer',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sistema_energia_eolica',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  supportBigNumbers: true,
  decimalNumbers: true
});

// ---- Health
app.get('/api/v1/health', (_req, res) => {
  res.json({ ok: true, service: 'esp32-ingest-api', time: new Date().toISOString() });
});

// ---- Helpers
function toNumber(x){ if(x===null||typeof x==='undefined') return null; const n=Number(x); return Number.isFinite(n)?n:null; }
function clamp(n,min,max){ return Math.min(Math.max(n,min),max); }

// ---- Auth flexible (nuevo: dispositivo; legacy: x-api-key + usuario_id)
async function requireIngestAuth(req, res, next) {
  try {
    // Nuevo modo por dispositivo
    const code = req.get('X-Device-Code') || req.get('X-Device-Serial') || (req.body && req.body.device_code);
    const key  = req.get('X-Device-Key')  || req.get('X-Device-Token')  || (req.body && req.body.device_key);

    if (code && key) {
      const [rows] = await pool.query(
        `SELECT id_eolico, codigo, usuario_id, habilitado, device_key
           FROM eolicos
          WHERE codigo = ?
          LIMIT 1`,
        [code]
      );
      if (!rows.length)   return res.status(404).json({ ok:false, error:'device_not_found' });
      const dev = rows[0];
      if (!dev.habilitado) return res.status(403).json({ ok:false, error:'device_disabled' });
      if (!dev.device_key || String(dev.device_key) !== String(key))
        return res.status(401).json({ ok:false, error:'invalid_device_key' });
      if (!dev.usuario_id) return res.status(409).json({ ok:false, error:'device_not_assigned' });

      req.ingest = { modo:'device', usuario_id: dev.usuario_id, eolico_id: dev.id_eolico, codigo: dev.codigo };
      return next();
    }

    // Modo legacy (compatibilidad temporal)
    if (String(process.env.INGEST_ALLOW_LEGACY || '1') === '1') {
      const apiKey = req.get('x-api-key') || req.query.api_key;
      if (apiKey && apiKey === (process.env.INGEST_API_KEY || '')) {
        const uid = toNumber(req.body && req.body.usuario_id);
        if (!uid) return res.status(400).json({ ok:false, error:'invalid_user_in_legacy' });

        let eolico_id = null;
        const ecode = req.body && req.body.eolico_codigo;
        if (ecode) {
          const [r2] = await pool.query(`SELECT id_eolico FROM eolicos WHERE codigo=? LIMIT 1`, [ecode]);
          if (r2.length) eolico_id = r2[0].id_eolico;
        }

        req.ingest = { modo:'legacy', usuario_id: uid, eolico_id };
        return next();
      }
    }

    return res.status(401).json({ ok:false, error:'missing_or_invalid_credentials' });
  } catch (err) {
    console.error('requireIngestAuth error:', err);
    res.status(500).json({ ok:false, error:'server_error' });
  }
}

// ---- Ingesta
app.post('/api/v1/lecturas', requireIngestAuth, async (req, res) => {
  try {
    let { voltaje, bateria, consumo, fecha_lectura } = req.body || {};
    const v = toNumber(voltaje), b = toNumber(bateria), c = toNumber(consumo);
    if (v===null || b===null || c===null)
      return res.status(400).json({ ok:false, error:'invalid_body', detalle:'voltaje, bateria y consumo son requeridos y numéricos' });

    let fechaSql = new Date();
    if (fecha_lectura) {
      const d = new Date(fecha_lectura);
      if (!isNaN(d.getTime())) fechaSql = d;
    }

    const sql = `
      INSERT INTO lecturas_resumen (usuario_id, eolico_id, voltaje, bateria, consumo, fecha_lectura)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const params = [
      req.ingest.usuario_id,
      req.ingest.eolico_id,
      v,
      clamp(b, 0, 100),
      c,
      fechaSql
    ];

    const [result] = await pool.query(sql, params);

    res.json({
      ok: true,
      id_lectura: result.insertId,
      eolico_id: req.ingest.eolico_id,
      usuario_id: req.ingest.usuario_id,
      voltaje: v,
      bateria: clamp(b,0,100),
      consumo: c,
      fecha_lectura: fechaSql.toISOString(),
      modo: req.ingest.modo
    });
  } catch (e) {
    console.error('POST /lecturas error:', e);
    res.status(500).json({ ok:false, error:'server_error' });
  }
});

// ---- Última lectura por usuario (útil para pruebas)
app.get('/api/v1/lecturas/ultimo/:usuario_id', async (req, res) => {
  try {
    const uid = Number(req.params.usuario_id);
    if (!Number.isFinite(uid)) return res.status(400).json({ ok:false, error:'invalid_user' });
    const [rows] = await pool.query(
      `SELECT id_lectura, usuario_id, eolico_id, voltaje, bateria, consumo, fecha_lectura
         FROM lecturas_resumen
        WHERE usuario_id = ?
        ORDER BY fecha_lectura DESC, id_lectura DESC
        LIMIT 1`,
      [uid]
    );
    if (!rows.length) return res.status(404).json({ ok:false, error:'no_data' });
    res.json({ ok:true, data: rows[0] });
  } catch (e) {
    console.error('GET ultimo error:', e);
    res.status(500).json({ ok:false, error:'server_error' });
  }
});

app.listen(PORT, () => {
  console.log(`[esp32-ingest-api] listening on :${PORT}`);
});
