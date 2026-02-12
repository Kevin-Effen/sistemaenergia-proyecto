# 📱 Guía: Acceder al Sistema desde Dispositivo Móvil

## 📋 Configuración Completada

Se ha configurado el sistema para ser accesible desde tu dispositivo móvil en la red local.

### 🔧 Cambios Realizados

#### 1. Frontend (`package.json`)
- ✅ Agregado script `start:network` para exponer el servidor en la red

#### 2. Frontend (`.env.local`)
- ✅ Configurada la URL del backend: `http://192.168.0.9:3001`

#### 3. Backend (`index.js`)
- ✅ CORS actualizado para permitir acceso desde:
  - `localhost:3000` (desarrollo local)
  - `192.168.0.9:3000` (red local)
  - Cualquier IP de la red `192.168.0.x`

---

## 🚀 Cómo Acceder desde tu Móvil

### Paso 1: Asegúrate que Backend y Frontend estén corriendo

**Backend:**
```powershell
cd backend
npm start
```

Espera el mensaje:
```
[backend] listening on http://localhost:3001
Conexión a base de datos establecida
```

**Frontend:**
```powershell
cd frontend
npm run start:network
```

Espera el mensaje:
```
Compiled successfully!

You can now view frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.0.9:3000
```

---

### Paso 2: Conecta tu Móvil a la Misma Red WiFi

**IMPORTANTE:** Tu móvil debe estar conectado a la **misma red WiFi** que tu computadora.

---

### Paso 3: Accede desde el Navegador del Móvil

Abre el navegador de tu móvil (Chrome, Safari, Firefox, etc.) y ve a:

```
http://192.168.0.9:3000
```

---

## 🔍 Solución de Problemas

### ❌ Problema 1: "No se puede acceder a este sitio"

**Causa:** El firewall de Windows está bloqueando las conexiones.

**Solución:**

1. Abre **Windows Defender Firewall**
2. Haz clic en **"Permitir una aplicación a través del firewall"**
3. Haz clic en **"Cambiar configuración"**
4. Busca **"Node.js"** en la lista
5. Marca las casillas **"Privada"** y **"Pública"**
6. Haz clic en **"Aceptar"**

**O ejecuta este comando en PowerShell como Administrador:**

```powershell
New-NetFirewallRule -DisplayName "Node.js Backend" -Direction Inbound -Program "C:\Program Files\nodejs\node.exe" -Action Allow

New-NetFirewallRule -DisplayName "React Dev Server" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

---

### ❌ Problema 2: El móvil se conecta pero no carga nada

**Causa:** El frontend no se inició con el script correcto.

**Solución:**

Asegúrate de usar `npm run start:network` en lugar de `npm start`:

```powershell
cd frontend
npm run start:network
```

---

### ❌ Problema 3: "CORS policy error" en la consola del móvil

**Causa:** La IP de tu computadora cambió.

**Solución:**

1. Verifica tu IP actual:
   ```powershell
   ipconfig | Select-String "IPv4"
   ```

2. Si la IP cambió, actualiza:
   - `frontend/.env.local` → `REACT_APP_API_BASE`
   - `backend/index.js` → En el array `allowedOrigins`

3. Reinicia backend y frontend

---

### ❌ Problema 4: La página carga pero no hace login

**Causa:** El backend no es accesible desde el móvil.

**Solución:**

1. Verifica que el backend esté corriendo en `0.0.0.0`:
   ```
   [backend] listening on http://localhost:3001
   ```

2. Prueba acceder desde el móvil directamente a:
   ```
   http://192.168.0.9:3001/health
   ```
   
   Deberías ver:
   ```json
   {"ok":true,"service":"backend","time":"..."}
   ```

3. Si no funciona, revisa el firewall (ver Problema 1)

---

## 📊 Información de Red

**IP de tu Computadora:** `192.168.0.9`

**URLs de Acceso:**

| Servicio | URL Interna | URL Red Local (Móvil) |
|----------|-------------|-----------------------|
| Frontend | http://localhost:3000 | http://192.168.0.9:3000 |
| Backend  | http://localhost:3001 | http://192.168.0.9:3001 |

---

## 🔒 Seguridad

### Advertencia

Esta configuración permite acceso desde cualquier dispositivo en tu red local (192.168.0.x). 

**Recomendaciones:**

1. ✅ Solo usar en redes WiFi **privadas y confiables**
2. ❌ **NO** usar en redes WiFi públicas (cafeterías, aeropuertos, etc.)
3. ✅ Cerrar los servidores cuando no los uses
4. ✅ Para producción, usar HTTPS con certificados SSL

---

## 🧪 Prueba de Conexión Rápida

### Desde tu Móvil:

1. **Probar Backend:**
   - Abre: `http://192.168.0.9:3001/health`
   - Debes ver: `{"ok":true,"service":"backend",...}`

2. **Probar Frontend:**
   - Abre: `http://192.168.0.9:3000`
   - Debes ver: La página de login del sistema

3. **Hacer Login:**
   - Usuario: `admin` (o tu usuario administrador)
   - Contraseña: Tu contraseña
   - Si funciona, ¡listo! 🎉

---

## 📱 Responsividad del Sistema

El módulo de **Alquileres** (`/eolicos`) ya tiene diseño responsive implementado:

✅ Tabla responsive con scroll horizontal en móviles
✅ Modales adaptados a pantallas pequeñas
✅ Botones táctiles optimizados
✅ Cards de cuotas con scroll optimizado
✅ Layout flexible que se adapta al tamaño de pantalla

---

## 🔄 Volver a Desarrollo Local

Cuando quieras trabajar solo en tu computadora sin acceso desde móvil:

1. **Frontend:** Usa `npm start` en lugar de `npm run start:network`

2. **Backend:** No requiere cambios (ya funciona en ambos modos)

3. **Opcional:** Comenta la configuración en `.env.local`:
   ```env
   # REACT_APP_API_BASE=http://192.168.0.9:3001
   REACT_APP_API_BASE=http://localhost:3001
   ```

---

## 📝 Comandos Rápidos

### Iniciar todo para acceso móvil:

```powershell
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend (nueva terminal)
cd frontend
npm run start:network
```

### Detener todo:

En cada terminal:
```
Ctrl + C
```

---

## 🎯 Checklist de Verificación

Antes de intentar conectar desde el móvil:

- [ ] Backend corriendo en puerto 3001
- [ ] Frontend corriendo con `npm run start:network`
- [ ] Móvil conectado a la misma red WiFi que la PC
- [ ] Firewall de Windows permite Node.js
- [ ] IP de la PC es `192.168.0.9` (verificar con `ipconfig`)
- [ ] Puedes acceder a `http://192.168.0.9:3001/health` desde el navegador de la PC

Si todos los puntos están ✅, deberías poder acceder desde el móvil sin problemas.

---

## 💡 Tips Adicionales

### Para iOS (iPhone/iPad):
- Safari funciona mejor
- Si no carga, intenta en modo privado

### Para Android:
- Chrome funciona mejor
- Habilita "Desktop site" si algún elemento no se ve bien

### Performance:
- El sistema puede ser un poco más lento en móvil debido a la red WiFi
- Si es muy lento, acércate al router WiFi

### Debugging:
- En Chrome móvil: Menu → Más herramientas → DevTools remoto
- En Safari iOS: Configuración → Safari → Avanzado → Web Inspector

---

**¡Disfruta usando el sistema desde tu móvil!** 📱✨
