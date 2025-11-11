// ====================== IMPORTS ======================
require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const http = require('http');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // ✅ usar bcryptjs (como en tu proyecto original)
const { body, param, validationResult } = require('express-validator');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const { Parser } = require('json2csv');
// const { genDeviceKey } = require('./helpers');
const { showConnectionInfo } = require('./qr-helper');
const crypto = require('crypto'); // util para generar device_key

// --- util para generar device_key (reemplaza al helpers) ---
function genDeviceKey() {
  return crypto.randomBytes(32).toString('hex'); // 64 caracteres hex
}

// ====================== APP & CONFIG ======================
const app = express();
const PORT = process.env.PORT || 3001;

// CORS (una sola vez, usando las opciones)
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000', // dominio permitido
  credentials: true, // permite cookies/autenticación
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

app.use(express.json());
app.disable('x-powered-by');

// ====================== DB CONNECTION ======================
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'sistema_energia_eolica',
  multipleStatements: true,
});

db.connect((err) => {
  if (err) {
    console.error('❌ Error conectando a MySQL:', err.message);
    process.exit(1);
  } else {
    console.log('✅ Conectado a MySQL');
  }
});

// ====================== HELPERS ======================
function firmarToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || 'devsecret', {
    expiresIn: process.env.JWT_EXPIRES || '4h',
  });
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const [, token] = auth.split(' ');
  if (!token) return res.status(401).json({ error: 'Token faltante' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function requireRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    const rolUser = (req.user.rol || '').toLowerCase().trim();
    const ok = rolesPermitidos.map((r) => r.toLowerCase().trim()).includes(rolUser);
    if (!ok) return res.status(403).json({ error: 'Sin permisos' });
    next();
  };
}

const toNullIfEmpty = (v) => {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  return v;
};

function toBOB(v) {
  return Number(v || 0).toLocaleString('es-BO', {
    style: 'currency',
    currency: 'BOB',
    minimumFractionDigits: 2,
  });
}

// ====================== HEALTH CHECK ======================
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

// ====================== AUTH ======================
app.post(
  '/login',
  [
    body('usuario').isString().trim().isLength({ min: 3, max: 120 }),
    body('contrasena').isString().isLength({ min: 3, max: 100 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errores: errors.array() });
    }

    const { usuario, contrasena } = req.body;

    // IP y user-agent para bitácora
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().slice(0, 45);
    const agente = (req.headers['user-agent'] || '').slice(0, 255);

    const sql = `
      SELECT 
        c.id_cuenta,
        c.usuario,
        c.contrasena AS hash,
        c.intentos_fallidos,
        c.bloqueado_hasta,
        r.nombre_rol,
        u.nombres,
        u.primer_apellido,
        u.segundo_apellido
      FROM cuentas c
      JOIN usuarios u ON u.cuenta_id = c.id_cuenta
      JOIN roles r    ON r.id_rol    = u.rol_id
      WHERE c.usuario = ?
      LIMIT 1
    `;

    db.query(sql, [usuario], async (err, rows) => {
      if (err) {
        console.error('Error SQL /login:', err);
        return res.status(500).json({ success: false, mensaje: 'Error de servidor' });
      }

      // Usuario no existe
      if (!rows || rows.length === 0) {
        db.query(
          'INSERT INTO bitacora_accesos (usuario_intento, ip, agente_usuario, exito, motivo) VALUES (?, ?, ?, 0, ?)',
          [usuario, ip, agente, 'usuario_no_encontrado']
        );
        return res.status(401).json({ success: false, mensaje: 'Usuario o contraseña incorrectos' });
      }

      const u = rows[0];

      // ¿Cuenta bloqueada temporalmente?
      if (u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date()) {
        db.query(
          'INSERT INTO bitacora_accesos (cuenta_id, usuario_intento, ip, agente_usuario, exito, motivo) VALUES (?, ?, ?, ?, 0, ?)',
          [u.id_cuenta, u.usuario, ip, agente, 'bloqueado']
        );
        return res.status(423).json({
          success: false,
          mensaje: 'Cuenta bloqueada temporalmente. Intente más tarde.',
        });
      }

      const ok = await bcrypt.compare(contrasena, u.hash);
      if (!ok) {
        const fails = (u.intentos_fallidos || 0) + 1;

        if (fails >= 5) {
          db.query(
            'UPDATE cuentas SET intentos_fallidos = 0, bloqueado_hasta = DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id_cuenta = ?',
            [u.id_cuenta]
          );
        } else {
          db.query('UPDATE cuentas SET intentos_fallidos = ? WHERE id_cuenta = ?', [fails, u.id_cuenta]);
        }

        db.query(
          'INSERT INTO bitacora_accesos (cuenta_id, usuario_intento, ip, agente_usuario, exito, motivo) VALUES (?, ?, ?, ?, 0, ?)',
          [u.id_cuenta, u.usuario, ip, agente, 'contrasena_incorrecta']
        );

        return res.status(401).json({
          success: false,
          mensaje: fails >= 5
            ? 'Demasiados intentos. Cuenta bloqueada 15 minutos.'
            : 'Usuario o contraseña incorrectos',
        });
      }

      // Login OK → resetear intentos y registrar acceso
      db.query(
        'UPDATE cuentas SET intentos_fallidos = 0, bloqueado_hasta = NULL, ultimo_acceso = NOW() WHERE id_cuenta = ?',
        [u.id_cuenta]
      );
      db.query(
        'INSERT INTO bitacora_accesos (cuenta_id, usuario_intento, ip, agente_usuario, exito, motivo) VALUES (?, ?, ?, ?, 1, ?)',
        [u.id_cuenta, u.usuario, ip, agente, 'login_ok']
      );

      const rol = (u.nombre_rol || '').toLowerCase().trim();
      const token = firmarToken({ cuenta_id: u.id_cuenta, rol });

      const nombre_completo =
        [u.nombres, u.primer_apellido, u.segundo_apellido].filter(Boolean).join(' ').trim() || u.usuario;

      return res.json({
        success: true,
        token,
        rol,
        usuario: u.usuario,
        nombre: nombre_completo,
      });
    });
  }
);

// Quién soy (básico)
app.get('/me', requireAuth, (req, res) => {
  res.json({ cuenta_id: req.user.cuenta_id, rol: req.user.rol });
});

// Detalle del usuario logueado
app.get('/me-detalle', requireAuth, (req, res) => {
  const cuentaId = req.user.cuenta_id;

  const sql = `
    SELECT 
      c.id_cuenta,
      c.usuario AS login,
      r.nombre_rol AS rol,
      u.id_usuario,
      u.nombres,
      u.primer_apellido,
      u.segundo_apellido,
      u.telefono,
      u.direccion,
      u.fecha_nacimiento,
      u.email
    FROM usuarios u
    JOIN cuentas c ON c.id_cuenta = u.cuenta_id
    JOIN roles r   ON r.id_rol    = u.rol_id
    WHERE u.cuenta_id = ?
    LIMIT 1
  `;

  db.query(sql, [cuentaId], (err, rows) => {
    if (err) return res.status(500).json({ mensaje: 'Error en servidor' });
    if (!rows || rows.length === 0) return res.status(404).json({ mensaje: 'No encontrado' });

    const u = rows[0];
    const nombre_completo = [u.nombres, u.primer_apellido, u.segundo_apellido]
      .filter(Boolean)
      .join(' ')
      .trim();

    res.json({
      cuenta_id: u.id_cuenta,
      id_usuario: u.id_usuario,
      login: u.login,
      rol: (u.rol || '').toLowerCase(),
      nombres: u.nombres,
      primer_apellido: u.primer_apellido,
      segundo_apellido: u.segundo_apellido,
      telefono: u.telefono,
      direccion: u.direccion,
      fecha_nacimiento: u.fecha_nacimiento,
      email: u.email || null,
      nombre_completo,
    });
  });
});

// ====================== ENDPOINT: última lectura por código ======================
app.get('/api/v1/lecturas/ultima', (req, res) => {
  const code = (req.query.code || '').trim();
  if (!code) return res.status(400).json({ error: 'Falta el parámetro code' });

  const sql = `
    SELECT e.usuario_id
    FROM eolicos e
    WHERE e.codigo = ?
    LIMIT 1
  `;
  db.query(sql, [code], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Error en servidor' });
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'No se encontró el dispositivo' });
    const usuario_id = rows[0].usuario_id;

    const sqlLect = `
      SELECT voltaje, bateria, consumo, fecha_lectura
      FROM lecturas_resumen
      WHERE usuario_id = ?
      ORDER BY fecha_lectura DESC
      LIMIT 1
    `;
    db.query(sqlLect, [usuario_id], (err2, lectRows) => {
      if (err2) return res.status(500).json({ error: 'Error en servidor' });
      if (!lectRows || lectRows.length === 0)
        return res.status(404).json({ error: 'No se encontraron lecturas para el dispositivo' });
      res.json(lectRows[0]);
    });
  });
});


// ====================== RESUMEN / ALERTAS ======================

// Resumen de lecturas (para dashboard)
app.get('/resumen', requireAuth, (req, res) => {
  const esAdmin = (req.user.rol || '').toLowerCase() === 'administrador';
  const userId = req.query.userId ? Number(req.query.userId) : null;

  // Usuario normal: solo sus propios datos
  if (!esAdmin) {
    const sql = `
      SELECT lr.*
      FROM lecturas_resumen lr
      JOIN usuarios u ON u.id_usuario = lr.usuario_id
      WHERE u.cuenta_id = ?
      ORDER BY lr.fecha_lectura DESC
      LIMIT 100
    `;
    db.query(sql, [req.user.cuenta_id], (err, rows) => {
      if (err) return res.status(500).send('Error en servidor');
      res.json(rows || []);
    });
    return;
  }

  // Admin filtrando por usuario específico
  if (Number.isInteger(userId) && userId > 0) {
    const sqlAdmFiltrado = `
      SELECT * 
      FROM lecturas_resumen 
      WHERE usuario_id = ?
      ORDER BY fecha_lectura DESC
      LIMIT 100
    `;
    db.query(sqlAdmFiltrado, [userId], (err, rows) => {
      if (err) return res.status(500).send('Error en servidor');
      res.json(rows || []);
    });
    return;
  }

  // Admin: todos
  db.query('SELECT * FROM lecturas_resumen ORDER BY fecha_lectura DESC LIMIT 100', (err, rows) => {
    if (err) return res.status(500).send('Error en servidor');
    res.json(rows || []);
  });
});

// Alertas rápidas (batería, voltaje, etc.)
app.get('/alertas', requireAuth, (req, res) => {
  const esAdmin = (req.user.rol || '').toLowerCase() === 'administrador';
  const where = `(
    (lr.bateria IS NOT NULL AND lr.bateria < 20)
    OR (lr.voltaje IS NOT NULL AND lr.voltaje < 10)
  )`;

  if (!esAdmin) {
    const sql = `
      SELECT lr.voltaje, lr.bateria, lr.consumo, lr.fecha_lectura
      FROM lecturas_resumen lr
      JOIN usuarios u ON u.id_usuario = lr.usuario_id
      WHERE u.cuenta_id = ? AND ${where}
      ORDER BY lr.fecha_lectura DESC
      LIMIT 10
    `;
    db.query(sql, [req.user.cuenta_id], (err, rows) => {
      if (err) return res.status(500).send('Error en servidor');
      res.json(rows || []);
    });
    return;
  }

  const sqlAdmin = `
    SELECT lr.voltaje, lr.bateria, lr.consumo, lr.fecha_lectura
    FROM lecturas_resumen lr
    WHERE ${where}
    ORDER BY lr.fecha_lectura DESC
    LIMIT 10
  `;
  db.query(sqlAdmin, (err, rows) => {
    if (err) return res.status(500).send('Error en servidor');
    res.json(rows || []);
  });
});

// Alertas por rango de fechas (vista cliente)
app.get('/alertas/rango', requireAuth, (req, res) => {
  const { desde, hasta, soloAlertas } = req.query;

  if (!desde || !hasta) {
    return res.status(400).json({ error: 'Se requieren parámetros desde y hasta' });
  }

  const alertaCondition =
    soloAlertas === 'true'
      ? `AND (
           (lr.bateria IS NOT NULL AND lr.bateria < 20) 
        OR (lr.voltaje IS NOT NULL AND lr.voltaje > 15)
        OR (lr.consumo IS NOT NULL AND lr.consumo > 80)
        )`
      : '';

  const sql = `
    SELECT lr.voltaje, lr.bateria, lr.consumo, lr.fecha_lectura
    FROM lecturas_resumen lr
    JOIN usuarios u ON u.id_usuario = lr.usuario_id
    WHERE u.cuenta_id = ?
      AND DATE(lr.fecha_lectura) >= ?
      AND DATE(lr.fecha_lectura) <= ?
      ${alertaCondition}
    ORDER BY lr.fecha_lectura DESC
  `;

  db.query(sql, [req.user.cuenta_id, desde, hasta], (err, rows) => {
    if (err) {
      console.error('Error en /alertas/rango:', err);
      return res.status(500).json({ error: 'Error en servidor' });
    }
    res.json(rows || []);
  });
});

// Alertas por rango (vista admin, puede ver todos)
app.get('/alertas/admin-rango', requireAuth, requireRole('administrador'), (req, res) => {
  const { desde, hasta, soloAlertas } = req.query;

  if (!desde || !hasta) {
    return res.status(400).json({ error: 'Se requieren parámetros desde y hasta' });
  }

  const alertaCondition =
    soloAlertas === 'true'
      ? `AND (
           (lr.bateria IS NOT NULL AND lr.bateria < 20) 
        OR (lr.voltaje IS NOT NULL AND lr.voltaje > 15)
        OR (lr.consumo IS NOT NULL AND lr.consumo > 80)
        )`
      : '';

  const sql = `
    SELECT 
      lr.voltaje, 
      lr.bateria, 
      lr.consumo, 
      lr.fecha_lectura,
      c.usuario AS login,
      r.nombre_rol AS rol
    FROM lecturas_resumen lr
    JOIN usuarios u ON u.id_usuario = lr.usuario_id
    LEFT JOIN cuentas c ON c.id_cuenta = u.cuenta_id
    LEFT JOIN roles   r ON r.id_rol    = u.rol_id
    WHERE DATE(lr.fecha_lectura) >= ?
      AND DATE(lr.fecha_lectura) <= ?
      ${alertaCondition}
    ORDER BY lr.fecha_lectura DESC
  `;

  db.query(sql, [desde, hasta], (err, rows) => {
    if (err) {
      console.error('Error en /alertas/admin-rango:', err);
      return res.status(500).json({ error: 'Error en servidor' });
    }
    res.json(rows || []);
  });
});


/* =========================================================
   MÓDULO EÓLICOS (admin)
========================================================= */

// Lista
app.get('/eolicos', requireAuth, requireRole('administrador'), (req, res) => {
  const sql = `
    SELECT 
      e.id_eolico,
      e.codigo,
      e.tarifa_mes,
      e.costo_instalacion,
      e.activo,
      e.habilitado,
      e.usuario_id,
      e.fecha_creacion,
      IFNULL(u.nombres, '') AS nombres,
      IFNULL(u.primer_apellido, '') AS primer_apellido,
      IFNULL(u.segundo_apellido, '') AS segundo_apellido,
      IFNULL(c.usuario, '') AS login
    FROM eolicos e
    LEFT JOIN usuarios u ON u.id_usuario = e.usuario_id
    LEFT JOIN cuentas c  ON c.id_cuenta  = u.cuenta_id
    ORDER BY e.id_eolico ASC
  `;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ mensaje: 'Error en servidor' });
    res.json(rows || []);
  });
});

// Generar código único
async function generarCodigoUnico() {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT codigo FROM eolicos WHERE codigo REGEXP '^[0-9]{4}$' ORDER BY codigo DESC LIMIT 1`,
      (err, rows) => {
        if (err) return reject(err);
        let nuevoNumero = 1;
        if (rows && rows.length > 0) nuevoNumero = parseInt(rows[0].codigo, 10) + 1;
        const codigo = String(nuevoNumero).padStart(4, '0');
        resolve(codigo);
      }
    );
  });
}

// Crear eólico
app.post(
  '/eolicos',
  requireAuth,
  requireRole('administrador'),
  [
    body('tarifa_mes').optional().isFloat({ min: 0 }),
    body('costo_instalacion').optional().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

    try {
      const codigo = await generarCodigoUnico();
      const tarifa_mes = Number(req.body.tarifa_mes ?? 0);
      const costo_instalacion = Number(req.body.costo_instalacion ?? 0);

      const sql = `
        INSERT INTO eolicos (codigo, tarifa_mes, costo_instalacion, activo, habilitado)
        VALUES (?, ?, ?, 0, 0)
      `;
      db.query(sql, [codigo, tarifa_mes, costo_instalacion], (err, r) => {
        if (err) return res.status(500).json({ mensaje: 'Error al crear eólico' });
        res.status(201).json({ id_eolico: r.insertId, codigo, mensaje: 'Eólico creado exitosamente' });
      });
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al generar código único' });
    }
  }
);

// Rotar device_key
app.put(
  '/eolicos/:id/rotar-key',
  requireAuth,
  requireRole('administrador'),
  [param('id').isInt({ min: 1 })],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

    const eolicoId = Number(req.params.id);
    const newKey = genDeviceKey();

    db.query('UPDATE eolicos SET device_key=? WHERE id_eolico=?', [newKey, eolicoId], (err) => {
      if (err) return res.status(500).json({ mensaje: 'Error en servidor' });
      res.json({ ok: true, device_key: newKey });
    });
  }
);

// Actualizar costos de equipo y aplicar a alquiler activo
app.put(
  '/eolicos/:id/costos',
  requireAuth,
  requireRole('administrador'),
  [
    param('id').isInt({ min: 1 }),
    body('tarifa_mes').optional().isFloat({ min: 0 }),
    body('costo_instalacion').optional().isFloat({ min: 0 }),
    body('deposito').optional().isFloat({ min: 0 }),
    body('aplicar_alquiler_activo').optional(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

    const id = Number(req.params.id);
    const toNum = (v) => (v === '' || v === null || v === undefined ? 0 : Number(v));
    const tarifa_mes = toNum(req.body.tarifa_mes);
    const costo_instalacion = toNum(req.body.costo_instalacion);
    const deposito = toNum(req.body.deposito);

    const aplicar =
      req.body.aplicar_alquiler_activo === undefined ||
      req.body.aplicar_alquiler_activo === null ||
      req.body.aplicar_alquiler_activo === true ||
      req.body.aplicar_alquiler_activo === 'true' ||
      req.body.aplicar_alquiler_activo === 1 ||
      req.body.aplicar_alquiler_activo === '1';

    const sqlE = `
      UPDATE eolicos
      SET tarifa_mes = ?, costo_instalacion = ?
      WHERE id_eolico = ?
    `;
    db.query(sqlE, [tarifa_mes, costo_instalacion, id], (err, rE) => {
      if (err) return res.status(500).json({ mensaje: 'No se pudo actualizar costos del equipo' });
      if (rE.affectedRows === 0) return res.status(404).json({ mensaje: 'Eólico no encontrado' });

      if (!aplicar) {
        return res.json({ mensaje: 'Costos actualizados (solo equipo)' });
      }

      const campos = ['tarifa_mes = ?', 'costo_instalacion = ?'];
      const valores = [tarifa_mes, costo_instalacion];
      if (!Number.isNaN(deposito) && deposito >= 0) {
        campos.push('deposito = ?');
        valores.push(deposito);
      }

      const sqlA = `
        UPDATE alquileres
        SET ${campos.join(', ')}
        WHERE eolico_id = ? AND estado = 'activo'
      `;
      valores.push(id);

      db.query(sqlA, valores, (e2, rA) => {
        if (e2)
          return res.status(500).json({
            mensaje: 'Costos del equipo actualizados, pero no se pudo actualizar el alquiler activo',
          });
        if (rA.affectedRows === 0)
          return res.json({
            mensaje: 'Costos del equipo actualizados. No se encontró alquiler ACTIVO para este equipo.',
          });
        res.json({
          mensaje: 'Costos actualizados (equipo + alquiler activo)',
          filas_actualizadas: rA.affectedRows,
        });
      });
    });
  }
);

// Asignar eólico a usuario
app.put(
  '/eolicos/:id/asignar',
  requireAuth,
  requireRole('administrador'),
  [param('id').isInt({ min: 1 }), body('usuario_id').isInt({ min: 1 })],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

    const eolico_id = Number(req.params.id);
    const usuario_id = Number(req.body.usuario_id);

    db.beginTransaction((txErr) => {
      if (txErr) return res.status(500).json({ mensaje: 'No se pudo iniciar transacción' });

      db.query(
        "UPDATE alquileres SET estado='finalizado', fecha_fin=NOW() WHERE eolico_id=? AND estado='activo'",
        [eolico_id],
        (e1) => {
          if (e1)
            return db.rollback(() =>
              res.status(500).json({ mensaje: 'Error cerrando alquiler previo del eólico' })
            );

          db.query(
            "UPDATE alquileres SET estado='finalizado', fecha_fin=NOW() WHERE usuario_id=? AND estado='activo'",
            [usuario_id],
            (e2) => {
              if (e2)
                return db.rollback(() =>
                  res.status(500).json({ mensaje: 'Error cerrando alquiler previo del usuario' })
                );

              db.query(
                'UPDATE eolicos SET usuario_id=?, activo=1, habilitado=1 WHERE id_eolico=?',
                [usuario_id, eolico_id],
                (e3) => {
                  if (e3)
                    return db.rollback(() =>
                      res.status(500).json({ mensaje: 'Error actualizando eólico' })
                    );

                  db.query(
                    "INSERT INTO alquileres (eolico_id, usuario_id, estado) VALUES (?, ?, 'activo')",
                    [eolico_id, usuario_id],
                    (e4) => {
                      if (e4)
                        return db.rollback(() =>
                          res.status(500).json({ mensaje: 'Error creando alquiler' })
                        );
                      db.commit((cErr) => {
                        if (cErr)
                          return db.rollback(() =>
                            res.status(500).json({ mensaje: 'Error al confirmar' })
                          );
                        res.json({ mensaje: 'Equipo asignado y alquiler abierto' });
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  }
);

// Desasignar
app.put(
  '/eolicos/:id/desasignar',
  requireAuth,
  requireRole('administrador'),
  [param('id').isInt({ min: 1 })],
  (req, res) => {
    const eolico_id = Number(req.params.id);
    db.beginTransaction((txErr) => {
      if (txErr) return res.status(500).json({ mensaje: 'No se pudo iniciar transacción' });

      db.query(
        'UPDATE eolicos SET usuario_id=NULL, activo=0, habilitado=0 WHERE id_eolico=?',
        [eolico_id],
        (e1) => {
          if (e1) return db.rollback(() => res.status(500).json({ mensaje: 'Error al desasignar' }));

          db.query(
            "UPDATE alquileres SET estado='finalizado', fecha_fin=NOW() WHERE eolico_id=? AND estado='activo'",
            [eolico_id],
            (e2) => {
              if (e2)
                return db.rollback(() =>
                  res.status(500).json({ mensaje: 'Error al cerrar alquiler' })
                );
              db.commit((cErr) => {
                if (cErr)
                  return db.rollback(() =>
                    res.status(500).json({ mensaje: 'Error al confirmar' })
                  );
                res.json({ mensaje: 'Equipo desasignado y alquiler finalizado' });
              });
            }
          );
        }
      );
    });
  }
);

// Toggle ACTIVO
app.put(
  '/eolicos/:id/toggle',
  requireAuth,
  requireRole('administrador'),
  [param('id').isInt({ min: 1 }), body('activo').isBoolean()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

    const eolico_id = Number(req.params.id);
    const activo = !!req.body.activo;

    db.query('SELECT usuario_id FROM eolicos WHERE id_eolico=?', [eolico_id], (e1, r1) => {
      if (e1) return res.status(500).json({ mensaje: 'Error en servidor' });
      if (!r1?.length) return res.status(404).json({ mensaje: 'Eólico no encontrado' });
      if (!r1[0].usuario_id)
        return res.status(400).json({ mensaje: 'Primero asigna este eólico a un usuario' });

      db.query('UPDATE eolicos SET activo=? WHERE id_eolico=?', [activo ? 1 : 0, eolico_id], (e2) => {
        if (e2) return res.status(500).json({ mensaje: 'No se pudo actualizar el estado' });
        res.json({ mensaje: `Eólico ${activo ? 'activado' : 'desactivado'}` });
      });
    });
  }
);

// ====================== CUOTAS ======================
function getAlquilerActivo(eolicoId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        a.*, e.codigo, e.tarifa_mes AS e_tarifa_mes,
        e.costo_instalacion AS e_costo_instalacion,
        u.nombres, u.primer_apellido, u.segundo_apellido,
        c.usuario AS login
      FROM alquileres a
      JOIN eolicos e ON e.id_eolico = a.eolico_id
      LEFT JOIN usuarios u ON u.id_usuario = a.usuario_id
      LEFT JOIN cuentas c ON c.id_cuenta = u.cuenta_id
      WHERE a.eolico_id=? AND a.estado='activo'
      LIMIT 1
    `;
    db.query(sql, [eolicoId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows?.[0] || null);
    });
  });
}

// Listar cuotas del alquiler activo
app.get(
  '/eolicos/:id/cuotas',
  requireAuth,
  requireRole('administrador'),
  [param('id').isInt({ min: 1 })],
  async (req, res) => {
    const eolicoId = Number(req.params.id);
    try {
      const alq = await getAlquilerActivo(eolicoId);
      if (!alq) return res.status(404).json({ mensaje: 'Este eólico no tiene alquiler ACTIVO.' });

      db.query(
        'SELECT * FROM cuotas WHERE alquiler_id=? ORDER BY fecha_vencimiento ASC, numero ASC',
        [alq.id_alquiler],
        (err, cuotas) => {
          if (err) return res.status(500).json({ mensaje: 'Error consultando cuotas' });
          const alquiler = {
            id_alquiler: alq.id_alquiler,
            eolico_id: alq.eolico_id,
            codigo: alq.codigo,
            login: alq.login,
            nombres: alq.nombres,
            primer_apellido: alq.primer_apellido,
            fecha_inicio: alq.fecha_inicio,
          };
          res.json({ alquiler, cuotas: cuotas || [] });
        }
      );
    } catch {
      res.status(500).json({ mensaje: 'Error en servidor' });
    }
  }
);

// Marcar cuota pagada
app.put(
  '/cuotas/:id/pagar',
  requireAuth,
  requireRole('administrador'),
  [
    param('id').isInt({ min: 1 }),
    body('metodo_pago').optional({ nullable: true }).isString().isLength({ max: 40 }),
    body('observaciones').optional({ nullable: true }).isString().isLength({ max: 255 }),
  ],
  (req, res) => {
    const id = Number(req.params.id);
    const { metodo_pago = null, observaciones = null } = req.body;
    const sql = `
      UPDATE cuotas
      SET pagado=1, fecha_pago=NOW(), metodo_pago=?, observaciones=?
      WHERE id_cuota=? AND pagado=0
    `;
    db.query(sql, [metodo_pago, observaciones, id], (err, r) => {
      if (err) return res.status(500).json({ mensaje: 'No se pudo actualizar la cuota' });
      if (r.affectedRows === 0) return res.status(404).json({ mensaje: 'Cuota no encontrada o ya pagada' });
      res.json({ mensaje: 'Cuota marcada como pagada' });
    });
  }
);
/* =========================================================
   RECIBOS PDF — EÓLICO Y CUOTAS
========================================================= */

// Recibo del EÓLICO
app.get('/eolicos/:id/recibo', requireAuth, requireRole('administrador'), (req, res) => {
  const id = Number(req.params.id || 0);
  const sql = `
    SELECT 
      e.id_eolico, e.codigo, e.activo, e.habilitado, e.fecha_creacion,
      u.nombres, u.primer_apellido, u.segundo_apellido,
      a.id_alquiler, a.fecha_inicio, a.estado,
      a.tarifa_mes, a.costo_instalacion, a.deposito
    FROM eolicos e
    LEFT JOIN usuarios u ON u.id_usuario = e.usuario_id
    LEFT JOIN alquileres a ON a.eolico_id = e.id_eolico AND a.estado='activo'
    WHERE e.id_eolico=? LIMIT 1
  `;

  db.query(sql, [id], (err, rows) => {
    if (err) return res.status(500).json({ mensaje: 'Error en servidor' });
    if (!rows || !rows.length) return res.status(404).json({ mensaje: 'Eólico no encontrado' });

    const r = rows[0];
    const dinero = (v) => Number(v || 0).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' });
    const fechaL = (d) => new Date(d).toLocaleString('es-BO');
    const nombreCliente = [r.nombres, r.primer_apellido, r.segundo_apellido].filter(Boolean).join(' ') || '—';

    const EMP = {
      nombre: process.env.RECIBO_EMPRESA || 'Sistema de Energía Eólica',
      direccion: process.env.RECIBO_DIRECCION || 'Calle Manuel Virreira, Cochabamba',
      telefono: process.env.RECIBO_TELEFONO || '+591 69529957',
      nit: process.env.RECIBO_NIT || '123456789',
      logo: process.env.RECIBO_LOGO_PATH || null,
    };

    const totalInicial = Number(r.tarifa_mes || 0) + Number(r.costo_instalacion || 0) + Number(r.deposito || 0);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="recibo_${r.codigo}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    // HEADER
    doc.rect(0, 0, doc.page.width, 80).fill('#1565C0');
    if (EMP.logo && fs.existsSync(EMP.logo)) {
      try { doc.image(EMP.logo, 40, 18, { fit: [50, 50] }); } catch {}
    }
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(18)
      .text(EMP.nombre, 100, 22, { width: doc.page.width - 160 });
    doc.font('Helvetica').fontSize(10)
      .text(`Tel: ${EMP.telefono} | NIT: ${EMP.nit}`, 100, 44)
      .text(new Date().toLocaleString('es-BO'), doc.page.width - 180, 22, { width: 140, align: 'right' });
    doc.fillColor('#000');
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(16).text('RECIBO DE PAGO - ALQUILER', 40, 110);

    // INFORMACIÓN GENERAL
    doc.font('Helvetica').fontSize(11);
    doc.text(`Cliente: ${nombreCliente}`, 40, 140);
    doc.text(`Código equipo: ${r.codigo}`);
    doc.text(`Estado: ${r.activo ? 'Activo' : 'Inactivo'}`);
    doc.text(`Inicio de alquiler: ${r.fecha_inicio ? fechaL(r.fecha_inicio) : '—'}`);
    doc.moveDown(1.5);

    doc.text('DETALLE DEL PAGO:', 40);
    doc.text(`Tarifa mensual: ${dinero(r.tarifa_mes)}`);
    doc.text(`Costo de instalación: ${dinero(r.costo_instalacion)}`);
    doc.text(`Depósito: ${dinero(r.deposito)}`);

    doc.moveDown(1);
    doc.font('Helvetica-Bold').fontSize(13).text(`TOTAL A PAGAR: ${dinero(totalInicial)}`);

    doc.moveDown(2);
    doc.font('Helvetica').fontSize(10)
      .text('Observaciones: Este documento es un comprobante de pago del alquiler. Los montos pueden variar según contrato y condiciones particulares.',
        40, doc.y, { width: 520 });

    doc.moveDown(3);
    const fy = doc.y + 20;
    doc.moveTo(60, fy).lineTo(220, fy).stroke();
    doc.text('Recibí conforme', 60, fy + 6, { width: 160, align: 'center' });
    doc.moveTo(360, fy).lineTo(520, fy).stroke();
    doc.text('Entregué conforme', 360, fy + 6, { width: 160, align: 'center' });

    doc.fontSize(9).fillColor('#777').text('Documento generado por el Sistema de Energía Eólica', 40, fy + 40, {
      width: 520,
      align: 'center',
    });

    doc.end();
  });
});

// Recibo de cuota individual
app.get('/cuotas/:id/recibo', requireAuth, requireRole('administrador'), [param('id').isInt({ min: 1 })], (req, res) => {
  const id_cuota = Number(req.params.id);
  const sql = `
    SELECT 
      c.*, e.codigo AS equipo_codigo,
      u.nombres, u.primer_apellido, u.segundo_apellido,
      a.id_alquiler, a.fecha_inicio
    FROM cuotas c
    JOIN alquileres a ON a.id_alquiler = c.alquiler_id
    JOIN eolicos e ON e.id_eolico = a.eolico_id
    JOIN usuarios u ON u.id_usuario = a.usuario_id
    WHERE c.id_cuota = ?
    LIMIT 1
  `;
  db.query(sql, [id_cuota], (err, rows) => {
    if (err) return res.status(500).json({ mensaje: 'Error en servidor' });
    if (!rows || !rows.length) return res.status(404).json({ mensaje: 'Cuota no encontrada' });

    const c = rows[0];
    if (!c.pagado) return res.status(400).json({ mensaje: 'Esta cuota aún no ha sido pagada' });

    const dinero = (v) => Number(v || 0).toLocaleString('es-BO', { style: 'currency', currency: 'BOB' });
    const fechaL = (d) => new Date(d).toLocaleString('es-BO');
    const nombreCliente = [c.nombres, c.primer_apellido, c.segundo_apellido].filter(Boolean).join(' ') || '—';
    const EMP = {
      nombre: process.env.RECIBO_EMPRESA || 'Sistema de Energía Eólica',
      telefono: process.env.RECIBO_TELEFONO || '+591 69529957',
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="recibo_cuota_${c.numero}.pdf"`);
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    doc.rect(0, 0, doc.page.width, 80).fill('#1565C0');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(18)
      .text(EMP.nombre, 100, 22, { width: doc.page.width - 160 });
    doc.font('Helvetica').fontSize(10)
      .text(`Tel: ${EMP.telefono}`, 100, 44)
      .text(new Date().toLocaleString('es-BO'), doc.page.width - 180, 22, { width: 140, align: 'right' });

    doc.fillColor('#000');
    doc.moveDown(3);
    doc.font('Helvetica-Bold').fontSize(15).text('RECIBO DE PAGO - CUOTA MENSUAL', 40, 110);
    doc.font('Helvetica').fontSize(11);
    doc.text(`Cliente: ${nombreCliente}`, 40, 140);
    doc.text(`Equipo: ${c.equipo_codigo}`);
    doc.text(`Cuota N°: ${c.numero}`);
    doc.text(`Descripción: ${c.descripcion}`);
    doc.text(`Fecha de pago: ${fechaL(c.fecha_pago)}`);
    doc.moveDown(1.5);
    doc.font('Helvetica-Bold').fontSize(13).text(`MONTO PAGADO: ${dinero(c.monto)}`);

    doc.end();
  });
});

/* =========================================================
   CLIENTE — Dispositivos y Lecturas
========================================================= */

// Mis dispositivos
app.get('/cliente/dispositivos', requireAuth, (req, res) => {
  const cuentaId = req.user.cuenta_id;
  const sql = `
    SELECT 
      e.id_eolico, e.codigo, e.habilitado, e.activo, e.fecha_creacion,
      u.id_usuario, CONCAT(u.nombres, ' ', u.primer_apellido) AS duenio
    FROM eolicos e
    JOIN usuarios u ON u.id_usuario = e.usuario_id
    WHERE u.cuenta_id = ?
    ORDER BY e.fecha_creacion DESC, e.id_eolico DESC
  `;
  db.query(sql, [cuentaId], (err, rows) => {
    if (err) return res.status(500).send('Error en servidor');
    res.json(rows || []);
  });
});

// Lecturas del cliente
app.get('/cliente/lecturas', requireAuth, (req, res) => {
  const cuentaId = req.user.cuenta_id;
  const codigo = (req.query.codigo || '').trim();
  const limit = Math.min(Number(req.query.limit || 200), 1000);
  if (!codigo) return res.status(400).json({ mensaje: 'codigo es requerido' });

  const sqlDisp = `
    SELECT e.id_eolico, e.codigo, e.usuario_id
    FROM eolicos e
    JOIN usuarios u ON u.id_usuario = e.usuario_id
    WHERE u.cuenta_id = ? AND e.codigo = ?
    LIMIT 1
  `;
  db.query(sqlDisp, [cuentaId, codigo], (err, dispRows) => {
    if (err) return res.status(500).json({ mensaje: 'Error en servidor (dispositivo)' });
    if (!dispRows || !dispRows.length)
      return res.status(404).json({ mensaje: 'Dispositivo no encontrado o no vinculado al usuario' });

    const sqlLect = `
      SELECT l.id_lectura, l.voltaje, l.bateria, l.consumo, l.fecha_lectura
      FROM lecturas_resumen l
      WHERE l.usuario_id = ?
      ORDER BY l.fecha_lectura DESC
      LIMIT ?
    `;
    db.query(sqlLect, [dispRows[0].usuario_id, limit], (err2, rows) => {
      if (err2) return res.status(500).json({ mensaje: 'Error en servidor (lecturas)' });
      res.json(rows || []);
    });
  });
});

/* =========================================================
   START SERVER (único)
========================================================= */


const server = http.createServer(app);

server.listen(PORT, process.env.HOST || '0.0.0.0', () => {
  showConnectionInfo(PORT, 'Backend API');
});

server.on('error', (err) => {
  console.error('❌ Server listen error:', err.code || err.message, err);
});
