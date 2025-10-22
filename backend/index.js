// index.js
// =========================================================
// Cargar variables de entorno
// =========================================================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult, param } = require('express-validator');
const { Parser } = require('json2csv');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');

// --- util para generar device_key ---
function genDeviceKey() {
  return crypto.randomBytes(32).toString('hex'); // 64 hex
}


const app = express();
const PORT = process.env.PORT || 3001;

// Habilitar CORS explícitamente para el frontend
// Permitir acceso desde cualquier red local (adaptable a diferentes WiFi)
app.use(cors({ 
  origin: function (origin, callback) {
    // Permitir requests sin origin (como apps móviles, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Permitir localhost
    if (origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    
    // Permitir cualquier IP de red local (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    if (origin.match(/^http:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)[\d.]+:\d+$/)) {
      return callback(null, true);
    }
    
    // Permitir CORS_ORIGIN personalizado
    if (process.env.CORS_ORIGIN && origin === process.env.CORS_ORIGIN) {
      return callback(null, true);
    }
    
    callback(new Error('No permitido por CORS'));
  },
  credentials: true 
}));
app.use(express.json());

// Endpoint de salud
app.get('/health', (_req, res) => res.json({ ok: true, service: 'backend' }));

/* =========================================================
   Seguridad básica y parsing
========================================================= */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(express.json({ limit: '1mb' }));

// Rate limit para login y recuperación
app.use('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));
const forgotLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/forgot-password', forgotLimiter);
app.use('/reset-password', forgotLimiter);

/* =========================================================
   Conexión MySQL
========================================================= */
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'sistema_energia_eolica',
  multipleStatements: false,
});

db.connect((err) => {
  if (err) console.error('❌ Error al conectar con la BD:', err);
  else console.log('✅ Conectado a MySQL (sistema_energia_eolica)');
});

/* =========================================================
   Mailer opcional (SMTP)
========================================================= */
let mailer = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  mailer = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  console.log('📧 SMTP habilitado para recuperación de contraseña');
} else {
  console.log('ℹ️ SMTP no configurado. Los enlaces de reset se imprimirán en consola.');
}

/* =========================================================
   Helpers / Sanitizadores
========================================================= */
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
    req.user = payload; // { cuenta_id, rol }
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

// Sanitizador: "" -> null
const toNullIfEmpty = (v) => {
  if (v === undefined || v === null) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  return v;
};

/* =========================================================
   /login — bcrypt + JWT + bloqueo + bitácora
========================================================= */
app.post(
  '/login',
  [
    body('usuario').isString().trim().isLength({ min: 3, max: 120 }),
    body('contrasena').isString().isLength({ min: 3, max: 100 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errores: errors.array() });

    const { usuario, contrasena } = req.body;
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
      if (err) return res.status(500).json({ success: false, mensaje: 'Error de servidor' });

      if (!rows || rows.length === 0) {
        db.query(
          'INSERT INTO bitacora_accesos (usuario_intento, ip, agente_usuario, exito, motivo) VALUES (?, ?, ?, 0, ?)',
          [usuario, ip, agente, 'usuario_no_encontrado']
        );
        return res.status(401).json({ success: false, mensaje: 'Usuario o contraseña incorrectos' });
      }

      const u = rows[0];

      if (u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date()) {
        db.query(
          'INSERT INTO bitacora_accesos (cuenta_id, usuario_intento, ip, agente_usuario, exito, motivo) VALUES (?, ?, ?, ?, 0, ?)',
          [u.id_cuenta, u.usuario, ip, agente, 'bloqueado']
        );
        return res.status(423).json({ success: false, mensaje: 'Cuenta bloqueada temporalmente. Intente más tarde.' });
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
          mensaje: fails >= 5 ? 'Demasiados intentos. Cuenta bloqueada 15 minutos.' : 'Usuario o contraseña incorrectos',
        });
      }

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

      // Construir nombre completo
      const nombre_completo = [u.nombres, u.primer_apellido, u.segundo_apellido]
        .filter(Boolean)
        .join(' ')
        .trim() || u.usuario;

      res.json({ 
        success: true, 
        token, 
        rol, 
        usuario: u.usuario,
        nombre: nombre_completo
      });
    });
  }
);

// Verificar sesión
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
    const nombre_completo = [u.nombres, u.primer_apellido, u.segundo_apellido].filter(Boolean).join(' ').trim();

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

/* =========================================================
   Recuperación de contraseña (Forgot / Reset)
========================================================= */
app.post('/forgot-password', [body('usuario').isString().trim().isLength({ min: 3, max: 120 })], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

  const { usuario } = req.body;

  const sql = `
    SELECT c.id_cuenta, c.usuario, u.email
    FROM cuentas c
    JOIN usuarios u ON u.cuenta_id = c.id_cuenta
    WHERE c.usuario = ?
    LIMIT 1
  `;
  db.query(sql, [usuario], async (err, rows) => {
    if (err) return res.status(500).json({ mensaje: 'Error en servidor' });

    const generic = { mensaje: 'Si el usuario existe, te enviaremos un enlace de recuperación.' };
    if (!rows || rows.length === 0) return res.json(generic);

    const u = rows[0];
    const token = crypto.randomBytes(20).toString('hex');
    db.query(
      'UPDATE cuentas SET reset_token=?, reset_expires=DATE_ADD(NOW(), INTERVAL 15 MINUTE) WHERE id_cuenta=?',
      [token, u.id_cuenta],
      async (e2) => {
        if (e2) return res.status(500).json({ mensaje: 'No se pudo generar el token' });

        const base = process.env.APP_BASE_URL || 'http://localhost:3000';
        const resetUrl = `${base}/reset-password/${token}`;
        const destino = (u.email || u.usuario || '').trim();

        if (mailer && destino) {
          try {
            await mailer.sendMail({
              from: `"Sistema Eólico" <${process.env.SMTP_USER}>`,
              to: destino,
              subject: 'Recupera tu contraseña',
              html: `
                <p>Hola ${u.usuario},</p>
                <p>Usa este enlace para restablecer tu contraseña (expira en 15 minutos):</p>
                <p><a href="${resetUrl}">${resetUrl}</a></p>
              `,
            });
          } catch {
            console.log('[RESET LINK]', resetUrl);
          }
        } else {
          console.log('[RESET LINK]', resetUrl);
        }
        return res.json(generic);
      }
    );
  });
});

app.post(
  '/reset-password',
  [body('token').isString().trim().isLength({ min: 10 }), body('nueva_contrasena').isString().isLength({ min: 8, max: 100 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });
    const { token, nueva_contrasena } = req.body;

    const find = `
      SELECT id_cuenta
      FROM cuentas
      WHERE reset_token = ?
        AND reset_expires IS NOT NULL
        AND reset_expires > NOW()
      LIMIT 1
    `;
    db.query(find, [token], async (err, rows) => {
      if (err) return res.status(500).json({ mensaje: 'Error en servidor' });
      if (!rows || rows.length === 0) return res.status(400).json({ mensaje: 'Token inválido o expirado' });

      const idCuenta = rows[0].id_cuenta;
      const hash = await bcrypt.hash(nueva_contrasena, 12);

      db.query(
        'UPDATE cuentas SET contrasena = ?, reset_token=NULL, reset_expires=NULL WHERE id_cuenta = ?',
        [hash, idCuenta],
        (e2) => {
          if (e2) return res.status(500).json({ mensaje: 'No se pudo actualizar la contraseña' });
          return res.json({ mensaje: 'Contraseña actualizada correctamente' });
        }
      );
    });
  }
);

/* =========================================================
   USUARIOS — admin
========================================================= */
app.get('/usuarios', requireAuth, requireRole('administrador'), (req, res) => {
  const busqueda = (req.query.busqueda || '').toString().trim();

  let sql = `
    SELECT 
      u.*,
      c.usuario,
      r.nombre_rol,
      e.id_eolico      AS eolico_id,
      e.codigo         AS eolico_codigo,
      e.activo         AS eolico_activo,
      e.habilitado     AS eolico_habilitado
    FROM usuarios u
    JOIN cuentas c ON c.id_cuenta = u.cuenta_id
    JOIN roles   r ON r.id_rol    = u.rol_id
    LEFT JOIN eolicos e ON e.usuario_id = u.id_usuario
  `;
  const params = [];

  if (busqueda) {
    sql += `
      WHERE 
        u.id_usuario LIKE ?
        OR c.usuario LIKE ?
        OR u.nombres LIKE ?
        OR u.primer_apellido LIKE ?
        OR u.segundo_apellido LIKE ?
        OR u.ci LIKE ?
        OR u.telefono LIKE ?
        OR u.direccion LIKE ?
        OR e.codigo LIKE ?
    `;
    const like = `%${busqueda}%`;
    params.push(like, like, like, like, like, like, like, like, like);
  }

  sql += ' ORDER BY u.id_usuario ASC';

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// Crear usuario
app.post(
  '/usuarios',
  requireAuth,
  requireRole('administrador'),
  [
    body('usuario')
      .isEmail()
      .withMessage('usuario debe ser un correo válido')
      .isLength({ max: 120 })
      .customSanitizer((v) => String(v || '').toLowerCase().trim()),

    body('contrasena').isString().isLength({ min: 8, max: 100 }),
    body('rol').isString().trim().isIn(['administrador', 'usuario']),

    body('nombres').customSanitizer(toNullIfEmpty).optional({ nullable: true }).isString().trim().isLength({ max: 60 }),
    body('primer_apellido').customSanitizer(toNullIfEmpty).optional({ nullable: true }).isString().trim().isLength({ max: 60 }),
    body('segundo_apellido').customSanitizer(toNullIfEmpty).optional({ nullable: true }).isString().trim().isLength({ max: 60 }),
    body('ci').customSanitizer(toNullIfEmpty).optional({ nullable: true }).isString().trim().isLength({ max: 20 }),
    body('telefono').customSanitizer(toNullIfEmpty).optional({ nullable: true }).isString().trim().isLength({ max: 25 }),
    body('direccion').customSanitizer(toNullIfEmpty).optional({ nullable: true }).isString().trim().isLength({ max: 255 }),

    body('fecha_nacimiento').customSanitizer(toNullIfEmpty).optional({ nullable: true }).isISO8601().toDate(),

    body('email')
      .customSanitizer(toNullIfEmpty)
      .optional({ nullable: true })
      .isEmail()
      .isLength({ max: 120 })
      .customSanitizer((v) => (v ? String(v).toLowerCase().trim() : null)),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

    const {
      usuario,
      contrasena,
      rol,
      nombres,
      primer_apellido,
      segundo_apellido,
      ci,
      telefono,
      direccion,
      fecha_nacimiento,
      email,
    } = req.body;

    db.query('SELECT id_rol FROM roles WHERE nombre_rol = ? LIMIT 1', [rol], async (e1, rRol) => {
      if (e1) return res.status(500).json({ mensaje: 'Error buscando rol' });
      if (!rRol.length) return res.status(400).json({ mensaje: 'Rol inválido' });
      const rol_id = rRol[0].id_rol;

      db.query('SELECT id_cuenta FROM cuentas WHERE usuario = ? LIMIT 1', [usuario], async (e2, rDup) => {
        if (e2) return res.status(500).json({ mensaje: 'Error verificando usuario' });
        if (rDup.length) return res.status(409).json({ mensaje: 'El usuario ya existe' });

        const hash = await bcrypt.hash(contrasena, 12);

        db.beginTransaction((txErr) => {
          if (txErr) return res.status(500).json({ mensaje: 'No se pudo iniciar la transacción' });

          db.query('INSERT INTO cuentas (usuario, contrasena) VALUES (?, ?)', [usuario, hash], (e3, rCta) => {
            if (e3) {
              db.rollback(() => {});
              return res.status(500).json({ mensaje: 'Error creando cuenta' });
            }

            const cuenta_id = rCta.insertId;
            const sqlU = `
              INSERT INTO usuarios
                (cuenta_id, rol_id, nombres, primer_apellido, segundo_apellido, ci, fecha_nacimiento, telefono, direccion, email)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const emailFinal = email || usuario;
            db.query(
              sqlU,
              [
                cuenta_id,
                rol_id,
                nombres || null,
                primer_apellido || null,
                segundo_apellido || null,
                ci || null,
                fecha_nacimiento || null,
                telefono || null,
                direccion || null,
                emailFinal || null,
              ],
              (e4) => {
                if (e4) {
                  console.error('Error creando usuario (MySQL):', e4);
                  db.rollback(() => {});
                  return res.status(500).json({ mensaje: 'Error creando usuario' });
                }

                const detalle = JSON.stringify({ usuario, rol });
                db.query(
                  'INSERT INTO auditoria_usuarios (actor_cuenta_id, accion, objetivo_cuenta_id, detalle) VALUES (?, "CREAR", ?, ?)',
                  [req.user.cuenta_id, cuenta_id, detalle],
                  (e5) => {
                    if (e5) {
                      db.rollback(() => {});
                      return res.status(500).json({ mensaje: 'Error de auditoría' });
                    }
                    db.commit((cErr) => {
                      if (cErr) {
                        db.rollback(() =>
                          res.status(500).json({ mensaje: 'Error al confirmar transacción' })
                        );
                        return;
                      }
                      res.status(201).json({ mensaje: 'Usuario creado correctamente' });
                    });
                  }
                );
              }
            );
          });
        });
      });
    });
  }
);

// Actualizar usuario
app.put(
  '/usuarios/:id',
  requireAuth,
  requireRole('administrador'),
  [
    param('id').isInt({ min: 1 }),

    body('nombres').customSanitizer(toNullIfEmpty).optional({ nullable: true }).isString().trim().isLength({ max: 60 }),
    body('primer_apellido').customSanitizer(toNullIfEmpty).optional({ nullable: true }).isString().trim().isLength({ max: 60 }),
    body('segundo_apellido').customSanitizer(toNullIfEmpty).optional({ nullable: true }).isString().trim().isLength({ max: 60 }),
    body('ci').customSanitizer(toNullIfEmpty).optional({ nullable: true }).isString().trim().isLength({ max: 20 }),
    body('telefono').customSanitizer(toNullIfEmpty).optional({ nullable: true }).isString().trim().isLength({ max: 25 }),
    body('direccion').customSanitizer(toNullIfEmpty).optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
    body('fecha_nacimiento').customSanitizer(toNullIfEmpty).optional({ nullable: true }).isISO8601().toDate(),
    body('rol').customSanitizer(toNullIfEmpty).optional({ nullable: true }).isString().trim().isIn(['administrador', 'usuario']),
    body('email').customSanitizer(toNullIfEmpty).optional({ nullable: true }).isEmail().isLength({ max: 120 }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

    const { id } = req.params;
    const {
      nombres,
      primer_apellido,
      segundo_apellido,
      ci,
      fecha_nacimiento,
      telefono,
      direccion,
      rol,
      email,
    } = req.body;

    if (!rol) {
      const sql = `
        UPDATE usuarios SET 
          nombres = ?, 
          primer_apellido = ?, 
          segundo_apellido = ?, 
          ci = ?, 
          fecha_nacimiento = ?, 
          telefono = ?, 
          direccion = ?,
          email = ?
        WHERE id_usuario = ?
      `;
      db.query(
        sql,
        [
          nombres || null,
          primer_apellido || null,
          segundo_apellido || null,
          ci || null,
          fecha_nacimiento || null,
          telefono || null,
          direccion || null,
          email || null,
          id,
        ],
        (err) => {
          if (err) {
            console.error('Error actualizando usuario (MySQL):', err);
            return res.status(500).send(err);
          }
          res.sendStatus(200);
        }
      );
      return;
    }

    db.beginTransaction((txErr) => {
      if (txErr) return res.status(500).json({ mensaje: 'No se pudo iniciar la transacción' });

      db.query('SELECT id_rol FROM roles WHERE nombre_rol = ? LIMIT 1', [rol], (e1, rRol) => {
        if (e1) {
          db.rollback(() => {});
          return res.status(500).json({ mensaje: 'Error buscando rol' });
        }
        if (!rRol.length) {
          db.rollback(() => {});
          return res.status(400).json({ mensaje: 'Rol inválido' });
        }

        const rol_id = rRol[0].id_rol;
        const sql = `
          UPDATE usuarios SET 
            rol_id = ?, 
            nombres = ?, 
            primer_apellido = ?, 
            segundo_apellido = ?, 
            ci = ?, 
            fecha_nacimiento = ?, 
            telefono = ?, 
            direccion = ?,
            email = ?
          WHERE id_usuario = ?
        `;
        db.query(
          sql,
          [
            rol_id,
            nombres || null,
            primer_apellido || null,
            segundo_apellido || null,
            ci || null,
            fecha_nacimiento || null,
            telefono || null,
            direccion || null,
            email || null,
            id,
          ],
          (e2) => {
            if (e2) {
              db.rollback(() => {});
              return res.status(500).json({ mensaje: 'Error al actualizar usuario' });
            }

            const detalle = JSON.stringify({ id_usuario: id, nuevo_rol: rol });
            db.query(
              'INSERT INTO auditoria_usuarios (actor_cuenta_id, accion, objetivo_cuenta_id, detalle) VALUES (?, "ACTUALIZAR", NULL, ?)',
              [req.user.cuenta_id, detalle],
              (e3) => {
                if (e3) {
                  db.rollback(() => {});
                  return res.status(500).json({ mensaje: 'Error de auditoría' });
                }
                db.commit((cErr) => {
                  if (cErr) return db.rollback(() => res.status(500).json({ mensaje: 'Error al confirmar transacción' }));
                  res.sendStatus(200);
                });
              }
            );
          }
        );
      });
    });
  }
);

// Eliminar usuario
app.delete('/usuarios/:id', requireAuth, requireRole('administrador'), [param('id').isInt({ min: 1 })], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

  const { id } = req.params;
  db.query('DELETE FROM usuarios WHERE id_usuario = ?', [id], (err) => {
    if (err) return res.status(500).send(err);
    res.sendStatus(200);
  });
});

/* =========================================================
   Resumen / Alertas
========================================================= */
app.get('/resumen', requireAuth, (req, res) => {
  const esAdmin = (req.user.rol || '').toLowerCase() === 'administrador';
  const userId = req.query.userId ? Number(req.query.userId) : null;

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
      res.json(rows);
    });
    return;
  }

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
      res.json(rows);
    });
    return;
  }

  db.query('SELECT * FROM lecturas_resumen ORDER BY fecha_lectura DESC LIMIT 100', (err, rows) => {
    if (err) return res.status(500).send('Error en servidor');
    res.json(rows);
  });
});

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
      res.json(rows);
    });
    return;
  }

  const sqlAdmin = `
    SELECT voltaje, bateria, consumo, fecha_lectura
    FROM lecturas_resumen lr
    WHERE ${where}
    ORDER BY fecha_lectura DESC
    LIMIT 10
  `;
  db.query(sqlAdmin, (err, rows) => {
    if (err) return res.status(500).send('Error en servidor');
    res.json(rows);
  });
});

/* =========================================================
   Alertas con rango de fechas (para usuarios)
========================================================= */
app.get('/alertas/rango', requireAuth, (req, res) => {
  const { desde, hasta, soloAlertas } = req.query;
  
  // Validación de parámetros
  if (!desde || !hasta) {
    return res.status(400).json({ error: 'Se requieren parámetros desde y hasta' });
  }

  // Construir condición de alertas si se requiere
  const alertaCondition = soloAlertas === 'true' 
    ? `AND ((lr.bateria IS NOT NULL AND lr.bateria < 20) OR (lr.voltaje IS NOT NULL AND lr.voltaje < 10))`
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
    res.json(rows);
  });
});

/* =========================================================
   Alertas con rango de fechas (para administradores)
========================================================= */
app.get('/alertas/admin-rango', requireAuth, requireRole('administrador'), (req, res) => {
  const { desde, hasta, soloAlertas } = req.query;
  
  // Validación de parámetros
  if (!desde || !hasta) {
    return res.status(400).json({ error: 'Se requieren parámetros desde y hasta' });
  }

  // Construir condición de alertas si se requiere
  const alertaCondition = soloAlertas === 'true'
    ? `AND ((lr.bateria IS NOT NULL AND lr.bateria < 20) OR (lr.voltaje IS NOT NULL AND lr.voltaje < 10))`
    : '';

  const sql = `
    SELECT 
      lr.voltaje, 
      lr.bateria, 
      lr.consumo, 
      lr.fecha_lectura,
      c.usuario as login,
      r.nombre_rol as rol
    FROM lecturas_resumen lr
    JOIN usuarios u ON u.id_usuario = lr.usuario_id
    JOIN cuentas c ON c.id_cuenta = u.cuenta_id
    JOIN roles r ON r.id_rol = u.rol_id
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
    res.json(rows);
  });
});

/* =========================================================
   Reporte CSV (usuarios)
========================================================= */
app.get('/reporte-usuarios', requireAuth, requireRole('administrador'), (req, res) => {
  db.query(
    'SELECT nombres, primer_apellido, segundo_apellido, ci, fecha_nacimiento, telefono, direccion, email FROM usuarios',
    (err, results) => {
      if (err) return res.status(500).send('Error en servidor');
      const fields = ['nombres', 'primer_apellido', 'segundo_apellido', 'ci', 'fecha_nacimiento', 'telefono', 'direccion', 'email'];
      const csv = new Parser({ fields }).parse(results);
      res.header('Content-Type', 'text/csv');
      res.attachment('reporte_usuarios.csv');
      res.send(csv);
    }
  );
});

/* =========================================================
   MÓDULO EÓLICOS (admin)
========================================================= */

// Lista (incluye tarifa mensual y costos)
app.get('/eolicos', requireAuth, requireRole('administrador'), (req, res) => {
  const sql = `
    SELECT 
      e.id_eolico,
      e.codigo,
      e.tarifa_mes,
      e.costo_instalacion,
      e.deposito,
      e.costo_operativo_dia,
      e.activo,
      e.habilitado,
      e.usuario_id,
      e.fecha_creacion,
      u.nombres,
      u.primer_apellido,
      u.segundo_apellido,
      c.usuario AS login
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

// Crear (acepta tarifa mensual y costos)
// =========================================================
// Crear un nuevo eólico (ADMIN) - Código generado automáticamente
// =========================================================

// Función helper para generar código único
async function generarCodigoUnico() {
  return new Promise((resolve, reject) => {
    // Obtener el último código numérico usado
    db.query(
      `SELECT codigo FROM eolicos WHERE codigo REGEXP '^[0-9]{4}$' ORDER BY codigo DESC LIMIT 1`,
      (err, rows) => {
        if (err) return reject(err);
        
        let nuevoNumero = 1;
        if (rows && rows.length > 0) {
          const ultimoCodigo = rows[0].codigo;
          nuevoNumero = parseInt(ultimoCodigo, 10) + 1;
        }
        
        // Formatear con padding de ceros (ej: 0001, 0002, 0003...)
        const codigoGenerado = String(nuevoNumero).padStart(4, '0');
        
        // Verificar que no exista (por si acaso)
        db.query('SELECT id_eolico FROM eolicos WHERE codigo=?', [codigoGenerado], (err2, rows2) => {
          if (err2) return reject(err2);
          if (rows2 && rows2.length > 0) {
            // Si existe, intentar con el siguiente
            const siguienteNumero = nuevoNumero + 1;
            const siguienteCodigo = String(siguienteNumero).padStart(4, '0');
            resolve(siguienteCodigo);
          } else {
            resolve(codigoGenerado);
          }
        });
      }
    );
  });
}

app.post(
  '/eolicos',
  requireAuth,
  requireRole('administrador'),
  [
    body('tarifa_mes').optional().isFloat({ min: 0 }),
    body('costo_instalacion').optional().isFloat({ min: 0 }),
    body('deposito').optional().isFloat({ min: 0 }),
    body('costo_operativo_dia').optional().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

    try {
      // Generar código único automáticamente
      const codigo = await generarCodigoUnico();
      
      const tarifa_mes = Number(req.body.tarifa_mes ?? 0);
      const costo_instalacion = Number(req.body.costo_instalacion ?? 0);
      const deposito = Number(req.body.deposito ?? 0);
      const costo_operativo_dia = Number(req.body.costo_operativo_dia ?? 0);

      const sql = `
        INSERT INTO eolicos (codigo, tarifa_mes, costo_instalacion, deposito, costo_operativo_dia)
        VALUES (?, ?, ?, ?, ?)
      `;
      db.query(sql, [codigo, tarifa_mes, costo_instalacion, deposito, costo_operativo_dia], (err, r) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ mensaje: 'Error de duplicado. Intente nuevamente.' });
          return res.status(500).json({ mensaje: 'Error al crear eólico' });
        }
        res.status(201).json({ id_eolico: r.insertId, codigo: codigo, mensaje: 'Eólico creado exitosamente' });
      });
    } catch (error) {
      console.error('Error generando código:', error);
      res.status(500).json({ mensaje: 'Error al generar código único' });
    }
  }
);

// =========================================================
// Rotar la device_key (ADMIN)
// =========================================================
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

    db.query(
      'UPDATE eolicos SET device_key=? WHERE id_eolico=?',
      [newKey, eolicoId],
      (err) => {
        if (err) return res.status(500).json({ mensaje: 'Error en servidor' });
        // devolvemos la nueva clave para que el admin la copie al ESP32
        res.json({ ok: true, device_key: newKey });
      }
    );
  }
);

// Actualizar SOLO costos/tarifa (y opcionalmente el alquiler activo)
app.put(
  '/eolicos/:id/costos',
  requireAuth,
  requireRole('administrador'),
  [
    param('id').isInt({ min: 1 }),
    body('tarifa_mes').optional().isFloat({ min: 0 }),
    body('costo_instalacion').optional().isFloat({ min: 0 }),
    body('deposito').optional().isFloat({ min: 0 }),
    body('costo_operativo_dia').optional().isFloat({ min: 0 }),
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
    const costo_operativo_dia = toNum(req.body.costo_operativo_dia);

    const raw = req.body.aplicar_alquiler_activo;
    const aplicar = raw === undefined || raw === null ? true : raw === true || raw === 'true' || raw === 1 || raw === '1';

    const sqlE = `
      UPDATE eolicos
      SET tarifa_mes = ?, costo_instalacion = ?, deposito = ?, costo_operativo_dia = ?
      WHERE id_eolico = ?
    `;
    db.query(sqlE, [tarifa_mes, costo_instalacion, deposito, costo_operativo_dia, id], (err, rE) => {
      if (err) return res.status(500).json({ mensaje: 'No se pudo actualizar costos del equipo' });
      if (rE.affectedRows === 0) return res.status(404).json({ mensaje: 'Eólico no encontrado' });

      if (!aplicar) {
        return res.json({ mensaje: 'Costos actualizados (solo equipo)' });
      }

      const sqlA = `
        UPDATE alquileres
        SET tarifa_mes = ?, costo_instalacion = ?, deposito = ?
        WHERE eolico_id = ? AND estado = 'activo'
      `;
      db.query(sqlA, [tarifa_mes, costo_instalacion, deposito, id], (e2, rA) => {
        if (e2) {
          return res.status(500).json({
            mensaje: 'Costos del equipo actualizados, pero no se pudo actualizar el alquiler activo',
          });
        }
        if (rA.affectedRows === 0) {
          return res.json({
            mensaje: 'Costos del equipo actualizados. No se encontró alquiler ACTIVO para este equipo.',
          });
        }
        res.json({ mensaje: 'Costos actualizados (equipo + alquiler activo)', filas_actualizadas: rA.affectedRows });
      });
    });
  }
);

// Asignar (cierra alquileres activos previos y abre uno nuevo)
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

      // 1) Finalizar alquiler activo de este eólico (si hay)
      db.query("UPDATE alquileres SET estado='finalizado', fecha_fin=NOW() WHERE eolico_id=? AND estado='activo'", [eolico_id], (e1) => {
        if (e1) return db.rollback(() => res.status(500).json({ mensaje: 'Error cerrando alquiler previo del eólico' }));

        // 2) Finalizar alquiler activo del usuario (si tiene otro eólico)
        db.query("UPDATE alquileres SET estado='finalizado', fecha_fin=NOW() WHERE usuario_id=? AND estado='activo'", [usuario_id], (e2) => {
          if (e2) return db.rollback(() => res.status(500).json({ mensaje: 'Error cerrando alquiler previo del usuario' }));

          // 3) Asignar eólico a usuario y habilitar
          db.query('UPDATE eolicos SET usuario_id=?, activo=1, habilitado=1 WHERE id_eolico=?', [usuario_id, eolico_id], (e3) => {
            if (e3) return db.rollback(() => res.status(500).json({ mensaje: 'Error actualizando eólico' }));

            // 4) Abrir nuevo alquiler (sin snapshot explícito)
            db.query("INSERT INTO alquileres (eolico_id, usuario_id, estado) VALUES (?, ?, 'activo')", [eolico_id, usuario_id], (e4) => {
              if (e4) return db.rollback(() => res.status(500).json({ mensaje: 'Error creando alquiler' }));
              db.commit((cErr) => {
                if (cErr) return db.rollback(() => res.status(500).json({ mensaje: 'Error al confirmar' }));
                res.json({ mensaje: 'Equipo asignado y alquiler abierto' });
              });
            });
          });
        });
      });
    });
  }
);

// Desasignar (cierra alquiler y limpia asignación)
app.put('/eolicos/:id/desasignar', requireAuth, requireRole('administrador'), [param('id').isInt({ min: 1 })], (req, res) => {
  const eolico_id = Number(req.params.id);

  db.beginTransaction((txErr) => {
    if (txErr) return res.status(500).json({ mensaje: 'No se pudo iniciar transacción' });

    // 1) Apagar y quitar usuario
    db.query('UPDATE eolicos SET usuario_id=NULL, activo=0, habilitado=0 WHERE id_eolico=?', [eolico_id], (e1) => {
      if (e1) return db.rollback(() => res.status(500).json({ mensaje: 'Error al desasignar' }));

      // 2) Finalizar alquiler activo
      db.query("UPDATE alquileres SET estado='finalizado', fecha_fin=NOW() WHERE eolico_id=? AND estado='activo'", [eolico_id], (e2) => {
        if (e2) return db.rollback(() => res.status(500).json({ mensaje: 'Error al cerrar alquiler' }));
        db.commit((cErr) => {
          if (cErr) return db.rollback(() => res.status(500).json({ mensaje: 'Error al confirmar' }));
          res.json({ mensaje: 'Equipo desasignado y alquiler finalizado' });
        });
      });
    });
  });
});

// Toggle ACTIVO (on/off)
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
      if (!r1[0].usuario_id) return res.status(400).json({ mensaje: 'Primero asigna este eólico a un usuario' });

      db.query('UPDATE eolicos SET activo=? WHERE id_eolico=?', [activo ? 1 : 0, eolico_id], (e2) => {
        if (e2) return res.status(500).json({ mensaje: 'No se pudo actualizar el estado' });
        res.json({ mensaje: `Eólico ${activo ? 'activado' : 'desactivado'}` });
      });
    });
  }
);

// Asignar por código
app.post(
  '/eolicos/asignar-por-codigo',
  requireAuth,
  requireRole('administrador'),
  [body('codigo').isString().trim().isLength({ min: 3, max: 20 }), body('usuario_id').isInt({ min: 1 })],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

    const codigo = String(req.body.codigo).trim().toUpperCase();
    const usuario_id = Number(req.body.usuario_id);

    db.query('SELECT id_eolico, usuario_id FROM eolicos WHERE codigo=? LIMIT 1', [codigo], (e0, r0) => {
      if (e0) return res.status(500).json({ mensaje: 'Error buscando eólico' });
      if (!r0?.length) return res.status(404).json({ mensaje: 'No existe un eólico con ese código.' });

      const eolico_id = r0[0].id_eolico;

      db.beginTransaction((txErr) => {
        if (txErr) return res.status(500).json({ mensaje: 'No se pudo iniciar transacción' });

        // 1) cerrar alquiler activo del eólico
        db.query("UPDATE alquileres SET estado='finalizado', fecha_fin=NOW() WHERE eolico_id=? AND estado='activo'", [eolico_id], (e1) => {
          if (e1) return db.rollback(() => res.status(500).json({ mensaje: 'Error cerrando alquiler previo del eólico' }));

          // 2) cerrar alquiler activo del usuario (si tiene otro)
          db.query("UPDATE alquileres SET estado='finalizado', fecha_fin=NOW() WHERE usuario_id=? AND estado='activo'", [usuario_id], (e2) => {
            if (e2) return db.rollback(() => res.status(500).json({ mensaje: 'Error cerrando alquiler previo del usuario' }));

            // 3) asignar y habilitar
            db.query('UPDATE eolicos SET usuario_id=?, activo=1, habilitado=1 WHERE id_eolico=?', [usuario_id, eolico_id], (e3) => {
              if (e3) return db.rollback(() => res.status(500).json({ mensaje: 'Error actualizando eólico' }));

              // 4) abrir nuevo alquiler (simple)
              db.query("INSERT INTO alquileres (eolico_id, usuario_id, estado) VALUES (?, ?, 'activo')", [eolico_id, usuario_id], (e4) => {
                if (e4) return db.rollback(() => res.status(500).json({ mensaje: 'Error creando alquiler' }));
                db.commit((cErr) => {
                  if (cErr) return db.rollback(() => res.status(500).json({ mensaje: 'Error al confirmar' }));
                  res.json({ mensaje: 'Eólico asignado por código y alquiler abierto' });
                });
              });
            });
          });
        });
      });
    });
  }
);

/* =========================================================
   CUOTAS — plan de pagos
========================================================= */
function toBOB(n) {
  return Number(n || 0).toLocaleString('es-BO', {
    style: 'currency',
    currency: 'BOB',
    minimumFractionDigits: 2,
  });
}

// Alquiler ACTIVO (con fallback a costos del eólico)
function getAlquilerActivo(eolicoId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        a.*,
        e.codigo,
        e.tarifa_mes          AS e_tarifa_mes,
        e.costo_instalacion   AS e_costo_instalacion,
        e.deposito            AS e_deposito,
        u.nombres, u.primer_apellido, u.segundo_apellido,
        c.usuario AS login
      FROM alquileres a
      JOIN eolicos e ON e.id_eolico = a.eolico_id
      LEFT JOIN usuarios u ON u.id_usuario = a.usuario_id
      LEFT JOIN cuentas  c ON c.id_cuenta  = u.cuenta_id
      WHERE a.eolico_id=? AND a.estado='activo'
      LIMIT 1
    `;
    db.query(sql, [eolicoId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows && rows[0] ? rows[0] : null);
    });
  });
}

// 🔹 LISTAR cuotas del alquiler ACTIVO de un eólico
app.get(
  '/eolicos/:id/cuotas',
  requireAuth,
  requireRole('administrador'),
  [param('id').isInt({ min: 1 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

    const eolicoId = Number(req.params.id);
    try {
      const alq = await getAlquilerActivo(eolicoId);
      if (!alq) return res.status(404).json({ mensaje: 'Este eólico no tiene alquiler ACTIVO.' });

      db.query(
        'SELECT * FROM cuotas WHERE alquiler_id=? ORDER BY fecha_vencimiento ASC, numero ASC',
        [alq.id_alquiler],
        (err, cuotas) => {
          if (err) return res.status(500).json({ mensaje: 'Error consultando cuotas' });

          // Formateo mínimo de respuesta (frontend espera { alquiler, cuotas })
          const alquiler = {
            id_alquiler: alq.id_alquiler,
            eolico_id: alq.eolico_id,
            codigo: alq.codigo,
            login: alq.login,
            nombres: alq.nombres,
            primer_apellido: alq.primer_apellido,
            fecha_inicio: alq.fecha_inicio,
          };

          res.json({
            alquiler,
            cuotas: cuotas || [],
          });
        }
      );
    } catch (e) {
      console.error(e);
      res.status(500).json({ mensaje: 'Error en servidor' });
    }
  }
);

// Generar plan de cuotas
app.post(
  '/eolicos/:id/cuotas/generar',
  requireAuth,
  requireRole('administrador'),
  [
    param('id').isInt({ min: 1 }),
    body('concepto').isIn(['tarifa', 'instalacion', 'deposito', 'operativo', 'otro']),
    body('numero_cuotas').isInt({ min: 1, max: 120 }),
    body('primera_fecha').optional().isISO8601(),
    body('periodicidad').optional().isIn(['mensual', 'semanal', 'diaria']),
    body('monto_total').optional().isFloat({ gt: 0 }),
    body('descripcion').optional({ nullable: true }).isString().isLength({ max: 120 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errores: errors.array() });

    const eolicoId = Number(req.params.id);
    const { concepto, numero_cuotas, periodicidad = 'mensual', descripcion = '' } = req.body;
    let { primera_fecha, monto_total } = req.body;

    try {
      const alq = await getAlquilerActivo(eolicoId);
      if (!alq) return res.status(404).json({ mensaje: 'Este eólico no tiene alquiler ACTIVO.' });

      const n = Number(numero_cuotas);
      const snapTarifa = alq.tarifa_mes ?? alq.e_tarifa_mes ?? 0;
      const snapInstal = alq.costo_instalacion ?? alq.e_costo_instalacion ?? 0;
      const snapDep = alq.deposito ?? alq.e_deposito ?? 0;

      // ✅ Si no envías monto_total, lo calculamos automáticamente para estos conceptos
      if (!monto_total) {
        if (concepto === 'tarifa') monto_total = Number(snapTarifa) * n;
        else if (concepto === 'instalacion') monto_total = Number(snapInstal);
        else if (concepto === 'deposito') monto_total = Number(snapDep);
        else monto_total = 0; // operativo/otro — requiere monto_total explícito
      }
      monto_total = Number(monto_total || 0);
      if (monto_total <= 0) {
        return res
          .status(400)
          .json({ mensaje: 'monto_total inválido. Para "operativo" u "otro" debes especificarlo explícitamente.' });
      }

      // Evitar duplicados por concepto
      db.query(
        'SELECT 1 FROM cuotas WHERE alquiler_id=? AND concepto=? LIMIT 1',
        [alq.id_alquiler, concepto],
        (e0, r0) => {
          if (e0) return res.status(500).json({ mensaje: 'Error validando cuotas' });
          if (r0.length) return res.status(409).json({ mensaje: 'Ya existe un plan de cuotas para este concepto.' });

          // Reparto exacto: n-1 cuotas iguales y la última con el redondeo restante
          const montoBase = Math.floor((monto_total / n) * 100) / 100;
          const resto = Number((monto_total - montoBase * (n - 1)).toFixed(2));
          const start = primera_fecha ? new Date(primera_fecha) : new Date();

          const sumDate = (d, i) => {
            const x = new Date(d.getTime());
            if (periodicidad === 'diaria') x.setDate(x.getDate() + i);
            else if (periodicidad === 'semanal') x.setDate(x.getDate() + i * 7);
            else x.setMonth(x.getMonth() + i); // mensual (default)
            return x.toISOString().slice(0, 10);
          };

          const rows = [];
          for (let i = 1; i <= n; i++) {
            rows.push([
              alq.id_alquiler,
              concepto,
              i,
              descripcion ||
                (concepto === 'tarifa' ? `Tarifa mensual ${i}/${n} (${alq.codigo})` : `${concepto} ${i}/${n} (${alq.codigo})`),
              sumDate(start, i - 1),
              i < n ? montoBase : resto,
            ]);
          }

          db.query(
            'INSERT INTO cuotas (alquiler_id, concepto, numero, descripcion, fecha_vencimiento, monto) VALUES ?',
            [rows],
            (e1) => {
              if (e1) return res.status(500).json({ mensaje: 'No se pudo generar el plan de cuotas' });
              res.status(201).json({ mensaje: 'Plan de cuotas generado', cuotas_creadas: n, monto_total });
            }
          );
        }
      );
    } catch (e) {
      console.error(e);
      res.status(500).json({ mensaje: 'Error en servidor' });
    }
  }
);

// Marcar cuota como pagada
app.put(
  '/cuotas/:id/pagar',
  requireAuth,
  requireRole('administrador'),
  [param('id').isInt({ min: 1 }), body('metodo_pago').optional({ nullable: true }).isString().isLength({ max: 40 }), body('observaciones').optional({ nullable: true }).isString().isLength({ max: 255 })],
  (req, res) => {
    const id = Number(req.params.id);
    const { metodo_pago = null, observaciones = null } = req.body;
    const sql = `
      UPDATE cuotas SET pagado=1, fecha_pago=NOW(), metodo_pago=?, observaciones=?
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
   PDF: cuotas y recibo
========================================================= */
app.get('/eolicos/:id/cuotas/pdf', requireAuth, requireRole('administrador'), [param('id').isInt({ min: 1 })], async (req, res) => {
  const eolicoId = Number(req.params.id);

  const getAlquilerActivoLocal = () =>
    new Promise((resolve, reject) => {
      const sql = `
      SELECT a.*, e.codigo, u.nombres, u.primer_apellido, u.segundo_apellido, c.usuario AS login
      FROM alquileres a
      JOIN eolicos e ON e.id_eolico = a.eolico_id
      LEFT JOIN usuarios u ON u.id_usuario = a.usuario_id
      LEFT JOIN cuentas  c ON c.id_cuenta  = u.cuenta_id
      WHERE a.eolico_id=? AND a.estado='activo'
      LIMIT 1`;
      db.query(sql, [eolicoId], (err, rows) => (err ? reject(err) : resolve(rows?.[0] || null)));
    });

  try {
    const alq = await getAlquilerActivoLocal();
    if (!alq) return res.status(404).json({ mensaje: 'Este eólico no tiene alquiler ACTIVO.' });

    db.query('SELECT * FROM cuotas WHERE alquiler_id=? ORDER BY fecha_vencimiento ASC, numero ASC', [alq.id_alquiler], (err, cuotas = []) => {
      if (err) return res.status(500).json({ mensaje: 'Error consultando cuotas' });

      const total = cuotas.reduce((s, c) => s + Number(c.monto || 0), 0);
      const pagado = cuotas.filter((c) => c.pagado).reduce((s, c) => s + Number(c.monto || 0), 0);
      const pendiente = total - pagado;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="cuotas_${alq.codigo}.pdf"`);

      const doc = new PDFDocument({ size: 'A4', margin: 36 });
      doc.pipe(res);

      const LEFT = doc.page.margins.left;
      const RIGHT = doc.page.width - doc.page.margins.right;
      const INNER_W = RIGHT - LEFT;

      const COL_W = [40, 260, 100, 80, 60];
      const PADX = 6;
      const ROW_MIN_H = 20;
      const FOOTER_SPACE = 36;

      const drawPageHeader = () => {
        doc.rect(0, 0, doc.page.width, 70).fill('#0d6efd');
        doc.fillColor('#fff').font('Helvetica-Bold').fontSize(18).text('Sistema de Energía Eólica', LEFT, 18, { width: INNER_W });
        doc.font('Helvetica').fontSize(10).text(new Date().toLocaleString('es-BO'), RIGHT - 200, 18, { width: 200, align: 'right' });
        doc.font('Helvetica-Bold').fontSize(16).text('PLAN DE CUOTAS', LEFT, 42, { width: INNER_W });
        doc.fillColor('#000');
        return 84;
      };

      let y = drawPageHeader();

      const nombre = [alq.nombres, alq.primer_apellido].filter(Boolean).join(' ') || '—';
      doc.font('Helvetica').fontSize(11);
      doc.text(`Cliente: ${nombre}`, LEFT, y);
      doc.text(`Login: ${alq.login || '—'}`);
      doc.text(`Equipo: ${alq.codigo}  |  ID alquiler: ${alq.id_alquiler}`);
      doc.text(`Inicio del alquiler: ${new Date(alq.fecha_inicio).toLocaleString('es-BO')}`);
      y = doc.y + 10;

      const drawTableHeader = () => {
        doc.rect(LEFT, y, INNER_W, ROW_MIN_H).fill('#f1f3f5').fillColor('#000');
        doc.font('Helvetica-Bold').fontSize(10);
        let x = LEFT;
        const headers = ['#', 'Descripción', 'Vence', 'Monto (Bs.)', 'Estado'];
        headers.forEach((h, i) => {
          const opts = { width: COL_W[i], align: i === 3 ? 'right' : 'left' };
          doc.text(h, x + PADX, y + 5, opts);
          x += COL_W[i];
        });
        y += ROW_MIN_H;
        doc.fillColor('#000');
      };

      const ensureSpace = (needed) => {
        const bottomLimit = doc.page.height - doc.page.margins.bottom - FOOTER_SPACE;
        if (y + needed <= bottomLimit) return;
        doc.addPage();
        y = drawPageHeader();
        drawTableHeader();
      };

      drawTableHeader();
      doc.font('Helvetica').fontSize(10);

      cuotas.forEach((c, idx) => {
        const cells = [
          String(c.numero),
          c.descripcion || `${c.concepto} ${c.numero}`,
          new Date(c.fecha_vencimiento).toLocaleDateString('es-BO'),
          toBOB(c.monto),
          c.pagado ? 'Pagado' : 'Pendiente',
        ];

        const hDesc = doc.heightOfString(cells[1], { width: COL_W[1] - PADX * 2, align: 'left' });
        const rowH = Math.max(ROW_MIN_H, hDesc + 8);

        ensureSpace(rowH);

        if (idx % 2 === 0) {
          doc.rect(LEFT, y, INNER_W, rowH).fill('#fafafa').fillColor('#000');
        }

        let x = LEFT;
        cells.forEach((val, i) => {
          const align = i === 3 ? 'right' : 'left';
          const opts = { width: COL_W[i] - PADX * 2, align };
          doc.rect(x, y, COL_W[i], rowH).stroke('#e0e0e0');
          doc.text(val, x + PADX, y + 4, opts);
          x += COL_W[i];
        });

        y += rowH;
      });

      const labelW = COL_W[0] + COL_W[1] + COL_W[2];
      const montoW = COL_W[3] + COL_W[4];

      const drawTotalRow = (label, value) => {
        ensureSpace(ROW_MIN_H);
        doc.rect(LEFT, y, INNER_W, ROW_MIN_H).fill('#e9ecef').fillColor('#000');
        doc.font('Helvetica-Bold').fontSize(10).text(label, LEFT + PADX, y + 5, { width: labelW - PADX * 2, align: 'right' });
        doc.text(value, LEFT + labelW, y + 5, { width: montoW - PADX * 2, align: 'right' });
        y += ROW_MIN_H;
      };

      y += 8;
      drawTotalRow('TOTAL', toBOB(total));
      drawTotalRow('PAGADO', toBOB(pagado));
      drawTotalRow('PENDIENTE', toBOB(pendiente));

      ensureSpace(40);
      doc.moveDown(1);
      doc.font('Helvetica').fontSize(9).fillColor('#555').text(
        'Observación: reporte informativo. Los pagos se registran al marcar la cuota como pagada.',
        LEFT,
        y + 4,
        { width: INNER_W }
      );
      doc.end();
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error en servidor' });
  }
});

app.get('/eolicos/:id/recibo', requireAuth, requireRole('administrador'), (req, res) => {
  const id = Number(req.params.id || 0);

  const sql = `
    SELECT 
      e.id_eolico, e.codigo, e.activo, e.habilitado, e.fecha_creacion,
      e.tarifa_mes, e.costo_instalacion, e.deposito, e.costo_operativo_dia,
      u.nombres, u.primer_apellido, u.segundo_apellido,
      a.id_alquiler, a.fecha_inicio, a.estado
    FROM eolicos e
    LEFT JOIN usuarios u ON u.id_usuario = e.usuario_id
    LEFT JOIN alquileres a ON a.eolico_id = e.id_eolico AND a.estado='activo'
    WHERE e.id_eolico=? LIMIT 1
  `;

  db.query(sql, [id], (err, rows) => {
    if (err) return res.status(500).json({ mensaje: 'Error en servidor' });
    if (!rows || !rows.length) return res.status(404).json({ mensaje: 'Eólico no encontrado' });

    const r = rows[0];

    const dinero = (v) =>
      Number(v || 0).toLocaleString('es-BO', { style: 'currency', currency: 'BOB', minimumFractionDigits: 2 });
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

    const MARGIN = 40;
    const HEADER_H = 92;
    const BOX_H = 70; // Reducido de 88 a 70

    const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
    doc.pipe(res);

    const W = doc.page.width;

    // Header
    doc.save();
    doc.rect(0, 0, W, HEADER_H).fill('#1565C0');
    if (EMP.logo && fs.existsSync(EMP.logo)) {
      try {
        doc.image(EMP.logo, MARGIN, 18, { fit: [50, 50] });
      } catch {}
    }
    doc.fillColor('#FFFFFF');
    doc.font('Helvetica-Bold').fontSize(18).text(EMP.nombre, MARGIN + 64, 20, { width: W - (MARGIN * 2 + 64) });
    doc.font('Helvetica').fontSize(10).text(`Dirección: ${EMP.direccion}`, MARGIN + 64, 42, { width: W - (MARGIN * 2 + 64) }).text(
      `Tel: ${EMP.telefono}    NIT: ${EMP.nit}`,
      MARGIN + 64,
      56,
      { width: W - (MARGIN * 2 + 64) }
    );
    doc.font('Helvetica').fontSize(10).fillColor('#E3F2FD').text(new Date().toLocaleString('es-BO'), W - MARGIN - 200, 18, {
      width: 200,
      align: 'right',
    });
    doc.restore();

    doc.moveDown(2);

    // Título
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000').text('RECIBO DE PAGO - ALQUILER');
    doc.moveDown(0.3);

    // Meta
    const yMeta = doc.y + 4;
    doc.roundedRect(MARGIN, yMeta, W - MARGIN * 2, 50, 6).stroke('#CFD8DC');
    const half = (W - MARGIN * 2) / 2;
    doc.font('Helvetica').fontSize(11).fillColor('#000').text(`Código equipo: ${r.codigo}`, MARGIN + 8, yMeta + 10, {
      width: half - 16,
      lineGap: 3,
    }).text(`Estado: ${r.activo ? 'Activado' : 'Desactivado'}`, MARGIN + 8, yMeta + 28);
    doc.text(`Habilitado: ${r.habilitado ? 'Sí' : 'No'}`, MARGIN + half + 8, yMeta + 10, { width: half - 16, lineGap: 3 });
    doc.moveDown(3);

    // Cajas Cliente y Equipo
    const GAP = 14;
    const yBoxes = yMeta + 50 + GAP;
    doc.roundedRect(MARGIN, yBoxes, (W - MARGIN * 2) / 2 - 6, BOX_H, 6).stroke('#CFD8DC');
    doc.roundedRect(MARGIN + (W - MARGIN * 2) / 2 + 6, yBoxes, (W - MARGIN * 2) / 2 - 6, BOX_H, 6).stroke('#CFD8DC');

    doc.font('Helvetica-Bold').fontSize(12).text('Cliente', MARGIN + 8, yBoxes + 8);
    doc.font('Helvetica').fontSize(11).text(`Nombre: ${nombreCliente}`, MARGIN + 8, yBoxes + 28, { lineGap: 3 });

    doc.font('Helvetica-Bold').fontSize(12).text('Equipo', MARGIN + (W - MARGIN * 2) / 2 + 14, yBoxes + 8);
    doc.font('Helvetica').fontSize(11).text(`Creado: ${fechaL(r.fecha_creacion)}`, MARGIN + (W - MARGIN * 2) / 2 + 14, yBoxes + 28, {
      lineGap: 3,
    }).text(`Nro: ${r.id_eolico}`, MARGIN + (W - MARGIN * 2) / 2 + 14, yBoxes + 48, { lineGap: 3 });

    // Posicionar cursor
    doc.y = yBoxes + BOX_H + GAP + 10;

    // Alquiler activo
    let y = doc.y;
    doc.font('Helvetica-Bold').fontSize(12).text('Información del Alquiler', MARGIN, y);
    y += 22;
    
    doc.roundedRect(MARGIN, y, W - MARGIN * 2, 50, 6).fill('#F5F5F5').stroke('#CFD8DC');
    
    doc.font('Helvetica').fontSize(11).fillColor('#000');
    if (r.id_alquiler) {
      doc.text(`Nro. de alquiler: ${r.id_alquiler}`, MARGIN + 12, y + 12, { lineGap: 4 });
      doc.text(`Fecha de inicio: ${fechaL(r.fecha_inicio)}`, MARGIN + 12, y + 28, { lineGap: 4 });
    } else {
      doc.text('No existe un alquiler activo para este equipo.', MARGIN + 12, y + 20);
    }
    
    y += 70;

    // Detalle del Total
    doc.moveTo(MARGIN, y).lineTo(W - MARGIN, y).stroke('#DDDDDD');
    y += 15;
    
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#000').text('Detalle del Pago', MARGIN, y);
    y += 20;
    
    // Función auxiliar para mostrar línea de detalle
    const mostrarDetalle = (concepto, monto, descripcion = '') => {
      if (Number(monto) > 0) {
        doc.font('Helvetica').fontSize(10).fillColor('#333');
        doc.text(concepto, MARGIN + 10, y, { width: 200 });
        if (descripcion) {
          doc.font('Helvetica').fontSize(9).fillColor('#666').text(descripcion, MARGIN + 10, y + 12, { width: 200 });
        }
        doc.font('Helvetica').fontSize(10).fillColor('#000').text(dinero(monto), W - MARGIN - 120, y, { width: 120, align: 'right' });
        y += descripcion ? 30 : 22;
      }
    };
    
    // Mostrar cada concepto solo si tiene valor
    mostrarDetalle('Tarifa mensual', r.tarifa_mes, 'Uso del sistema eólico');
    mostrarDetalle('Instalación', r.costo_instalacion, 'Instalación y puesta en marcha');
    mostrarDetalle('Depósito', r.deposito, 'Garantía reembolsable');
    
    // Línea separadora antes del total
    y += 5;
    doc.moveTo(MARGIN, y).lineTo(W - MARGIN, y).stroke('#DDDDDD');
    y += 15;
    
    // Total destacado
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#000').text('TOTAL A PAGAR:', MARGIN, y);
    doc.font('Helvetica-Bold').fontSize(14).text(dinero(totalInicial), W - MARGIN - 150, y, { width: 150, align: 'right' });
    
    y += 35;

    // Observaciones
    doc.font('Helvetica').fontSize(10).fillColor('#555').text(
      'Observaciones: Este documento es un comprobante de pago del alquiler. Los montos pueden variar según contrato y condiciones particulares.',
      MARGIN,
      y,
      { width: W - MARGIN * 2, lineGap: 2 }
    );

    y += 50;

    // Firmas
    const fy = y + 20;
    doc.fillColor('#000').moveTo(MARGIN + 20, fy).lineTo(MARGIN + 220, fy).stroke('#424242');
    doc.font('Helvetica').fontSize(10).text('Recibí conforme', MARGIN + 20, fy + 6, { width: 200, align: 'center' });
    doc.moveTo(W - (MARGIN + 220), fy).lineTo(W - (MARGIN + 20), fy).stroke('#424242');
    doc.font('Helvetica').fontSize(10).text('Entregué conforme', W - (MARGIN + 220), fy + 6, { width: 200, align: 'center' });

    // Pie
    const footerY = fy + 40;
    doc.fontSize(9).fillColor('#777').text('Documento generado por el Sistema de Energía Eólica', MARGIN, footerY, {
      width: W - MARGIN * 2,
      align: 'center',
    });

    doc.end();
  });
});

// =========================================================
// Recibo de cuota individual (para cuotas mensuales)
// =========================================================
app.get('/cuotas/:id/recibo', requireAuth, requireRole('administrador'), [param('id').isInt({ min: 1 })], (req, res) => {
  const id_cuota = Number(req.params.id);

  const sql = `
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
    LIMIT 1
  `;

  db.query(sql, [id_cuota], (err, rows) => {
    if (err) return res.status(500).json({ mensaje: 'Error en servidor' });
    if (!rows || !rows.length) return res.status(404).json({ mensaje: 'Cuota no encontrada' });

    const cuota = rows[0];

    // Validar que la cuota esté pagada
    if (!cuota.pagado) {
      return res.status(400).json({ mensaje: 'Esta cuota aún no ha sido pagada' });
    }

    const dinero = (v) =>
      Number(v || 0).toLocaleString('es-BO', { style: 'currency', currency: 'BOB', minimumFractionDigits: 2 });
    const fechaL = (d) => new Date(d).toLocaleString('es-BO');
    const fechaCorta = (d) => new Date(d).toLocaleDateString('es-BO');
    const nombreCliente = [cuota.nombres, cuota.primer_apellido, cuota.segundo_apellido].filter(Boolean).join(' ') || '—';

    // Calcular el mes al que corresponde la cuota
    const fechaVencimiento = new Date(cuota.fecha_vencimiento);
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const mesNombre = meses[fechaVencimiento.getMonth()];
    const anio = fechaVencimiento.getFullYear();
    const periodoMes = `${mesNombre} ${anio}`;

    const EMP = {
      nombre: process.env.RECIBO_EMPRESA || 'Sistema de Energía Eólica',
      direccion: process.env.RECIBO_DIRECCION || 'Calle Manuel Virreira, Cochabamba',
      telefono: process.env.RECIBO_TELEFONO || '+591 69529957',
      nit: process.env.RECIBO_NIT || '123456789',
      logo: process.env.RECIBO_LOGO_PATH || null,
    };

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="recibo_cuota_${cuota.numero}.pdf"`);
    res.setHeader('Cache-Control', 'no-store');

    const MARGIN = 40;
    const HEADER_H = 92;
    const BOX_H = 70;

    const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
    doc.pipe(res);

    const W = doc.page.width;

    // Header
    doc.save();
    doc.rect(0, 0, W, HEADER_H).fill('#1565C0');
    if (EMP.logo && fs.existsSync(EMP.logo)) {
      try {
        doc.image(EMP.logo, MARGIN, 18, { fit: [50, 50] });
      } catch {}
    }
    doc.fillColor('#FFFFFF');
    doc.font('Helvetica-Bold').fontSize(18).text(EMP.nombre, MARGIN + 64, 20, { width: W - (MARGIN * 2 + 64) });
    doc.font('Helvetica').fontSize(10).text(`Dirección: ${EMP.direccion}`, MARGIN + 64, 42, { width: W - (MARGIN * 2 + 64) }).text(
      `Tel: ${EMP.telefono}    NIT: ${EMP.nit}`,
      MARGIN + 64,
      56,
      { width: W - (MARGIN * 2 + 64) }
    );
    doc.font('Helvetica').fontSize(10).fillColor('#E3F2FD').text(fechaL(new Date()), W - MARGIN - 200, 18, {
      width: 200,
      align: 'right',
    });
    doc.restore();

    doc.moveDown(2);

    // Título
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000').text('RECIBO DE PAGO - CUOTA MENSUAL');
    doc.moveDown(0.3);

    // Número de recibo
    const yMeta = doc.y + 4;
    doc.roundedRect(MARGIN, yMeta, W - MARGIN * 2, 50, 6).stroke('#CFD8DC');
    const half = (W - MARGIN * 2) / 2;
    doc.font('Helvetica').fontSize(11).fillColor('#000').text(`Recibo Nro: ${cuota.id_cuota}`, MARGIN + 8, yMeta + 10, {
      width: half - 16,
      lineGap: 3,
    }).text(`Cuota Nro: ${cuota.numero}`, MARGIN + 8, yMeta + 28);
    doc.text(`Equipo: ${cuota.equipo_codigo}`, MARGIN + half + 8, yMeta + 10, { width: half - 16, lineGap: 3 });
    doc.text(`Período: ${periodoMes}`, MARGIN + half + 8, yMeta + 28, { width: half - 16, lineGap: 3 });
    doc.moveDown(3);

    // Cajas Cliente e Información de Pago
    const GAP = 14;
    const yBoxes = yMeta + 50 + GAP;
    doc.roundedRect(MARGIN, yBoxes, (W - MARGIN * 2) / 2 - 6, BOX_H, 6).stroke('#CFD8DC');
    doc.roundedRect(MARGIN + (W - MARGIN * 2) / 2 + 6, yBoxes, (W - MARGIN * 2) / 2 - 6, BOX_H, 6).stroke('#CFD8DC');

    doc.font('Helvetica-Bold').fontSize(12).text('Cliente', MARGIN + 8, yBoxes + 8);
    doc.font('Helvetica').fontSize(11).text(`Nombre: ${nombreCliente}`, MARGIN + 8, yBoxes + 28, { lineGap: 3 });

    doc.font('Helvetica-Bold').fontSize(12).text('Información de Pago', MARGIN + (W - MARGIN * 2) / 2 + 14, yBoxes + 8);
    doc.font('Helvetica').fontSize(11).text(`Fecha de pago: ${fechaCorta(cuota.fecha_pago)}`, MARGIN + (W - MARGIN * 2) / 2 + 14, yBoxes + 28, {
      lineGap: 3,
    }).text(`Método: ${cuota.metodo_pago || 'Efectivo'}`, MARGIN + (W - MARGIN * 2) / 2 + 14, yBoxes + 48, { lineGap: 3 });

    // Posicionar cursor
    doc.y = yBoxes + BOX_H + GAP + 10;

    // Información del Concepto
    let y = doc.y;
    doc.font('Helvetica-Bold').fontSize(12).text('Detalle del Pago', MARGIN, y);
    y += 22;
    
    doc.roundedRect(MARGIN, y, W - MARGIN * 2, 80, 6).fill('#F5F5F5').stroke('#CFD8DC');
    
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000');
    doc.text('Concepto:', MARGIN + 12, y + 12);
    doc.font('Helvetica').fontSize(11);
    doc.text(cuota.concepto.toUpperCase(), MARGIN + 80, y + 12);
    
    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('Descripción:', MARGIN + 12, y + 32);
    doc.font('Helvetica').fontSize(11);
    doc.text(cuota.descripcion || `Cuota ${cuota.numero} - ${periodoMes}`, MARGIN + 80, y + 32);
    
    doc.font('Helvetica-Bold').fontSize(11);
    doc.text('Período:', MARGIN + 12, y + 52);
    doc.font('Helvetica').fontSize(11);
    doc.text(periodoMes, MARGIN + 80, y + 52);
    
    y += 90;

    // Total destacado
    y += 10;
    doc.moveTo(MARGIN, y).lineTo(W - MARGIN, y).stroke('#DDDDDD');
    y += 20;
    
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#000').text('MONTO PAGADO:', MARGIN, y);
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#1565C0').text(dinero(cuota.monto), W - MARGIN - 150, y, { width: 150, align: 'right' });
    
    y += 45;

    // Observaciones
    doc.font('Helvetica').fontSize(10).fillColor('#555').text(
      `Observaciones: ${cuota.observaciones || 'Pago correspondiente a la cuota mensual del servicio de energía eólica.'}`,
      MARGIN,
      y,
      { width: W - MARGIN * 2, lineGap: 2 }
    );

    y += 50;

    // Firmas
    const fy = y + 10;
    doc.fillColor('#000').moveTo(MARGIN + 20, fy).lineTo(MARGIN + 220, fy).stroke('#424242');
    doc.font('Helvetica').fontSize(10).text('Recibí conforme', MARGIN + 20, fy + 6, { width: 200, align: 'center' });
    doc.moveTo(W - (MARGIN + 220), fy).lineTo(W - (MARGIN + 20), fy).stroke('#424242');
    doc.font('Helvetica').fontSize(10).text('Entregué conforme', W - (MARGIN + 220), fy + 6, { width: 200, align: 'center' });

    // Pie
    const footerY = fy + 40;
    doc.fontSize(9).fillColor('#777').text(`Recibo generado el ${fechaL(new Date())} | Sistema de Energía Eólica`, MARGIN, footerY, {
      width: W - MARGIN * 2,
      align: 'center',
    });

    doc.end();
  });
});

// =========================================================
// Mis dispositivos (por cuenta del usuario logueado)
// =========================================================
app.get('/cliente/dispositivos', requireAuth, (req, res) => {
  const cuentaId = req.user.cuenta_id;

  const sql = `
    SELECT 
      e.id_eolico,
      e.codigo,
      e.habilitado,
      e.activo,
      e.fecha_creacion,
      u.id_usuario,
      CONCAT(u.nombres, ' ', u.primer_apellido) AS duenio
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

// Lecturas por dispositivo (código)
app.get('/cliente/lecturas', requireAuth, (req, res) => {
  const cuentaId = req.user.cuenta_id;
  const codigo = (req.query.codigo || '').trim();
  const limit = Math.min(Number(req.query.limit || 200), 1000);
  if (!codigo) return res.status(400).json({ mensaje: 'codigo es requerido' });

  const sql = `
    SELECT l.id_lectura, l.voltaje, l.bateria, l.consumo, l.fecha_lectura,
           e.id_eolico, e.codigo
    FROM lecturas_resumen l
    JOIN eolicos e  ON e.id_eolico = l.eolico_id
    JOIN usuarios u ON u.id_usuario = e.usuario_id
    WHERE u.cuenta_id = ? AND e.codigo = ?
    ORDER BY l.fecha_lectura DESC, l.id_lectura DESC
    LIMIT ?`;
  db.query(sql, [cuentaId, codigo, limit], (err, rows) => {
    if (err) return res.status(500).send('Error en servidor');
    res.json(rows || []);
  });
});

// --- Health (si no lo tienes) ---
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'backend', time: new Date().toISOString() });
});

// --- START SERVER (debe existir solo una vez y al final) ---
const http = require('http');
const { showConnectionInfo } = require('./qr-helper');
const HOST = process.env.HOST || '0.0.0.0';

const server = http.createServer(app);

server.listen(PORT, HOST, () => {
  // Mostrar información con código QR
  showConnectionInfo(PORT, 'Backend API');
});

server.on('error', (err) => {
  console.error('❌ Server listen error:', err.code || err.message, err);
});

