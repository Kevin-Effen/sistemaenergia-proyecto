# 📱 GUÍA RÁPIDA - Acceso Móvil con QR

## 🎯 Solución en 3 Pasos

### ✨ Sin Configurar IPs Manualmente
### ✨ Funciona en Cualquier Red WiFi
### ✨ Código QR Automático

---

## 🚀 PASO 1: Iniciar Servidores

### Opción Fácil (Recomendada):
```
🖱️ Doble clic en: start-mobile.ps1
```

Se abrirán 2 ventanas:
- Ventana 1: **Backend** con su QR
- Ventana 2: **Frontend** con su QR

---

## 📲 PASO 2: Escanear QR

1. Conecta tu móvil a la **misma WiFi** que tu PC
2. Abre la app de **Cámara** del móvil
3. Apunta al **QR del Frontend** (ventana 2)
4. Toca la notificación que aparece

---

## ✅ PASO 3: ¡Listo!

El sistema se abrirá en el navegador de tu móvil.

---

## 📸 Ejemplo Visual

```
Ventana Frontend:

============================================================
🚀 Frontend React - Sistema de Energía Eólica
============================================================

📱 Acceso desde Móvil:
   http://192.168.1.105:3000
   
📲 Escanea este QR:

  ███████████████████
  ██ ▄▄▄▄▄ █ ▄▄▄▄▄ ██
  ██ █   █ █ █   █ ██
  ██ █▄▄▄█ █ █▄▄▄█ ██
  ██▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄██
  ...
  
============================================================
```

---

## 🌐 Cambio de Red

### ¿Estás en casa hoy y mañana en la universidad?

**No hay problema** ✅

1. Cierra los servidores (Ctrl+C en ambas ventanas)
2. Vuelve a ejecutar `start-mobile.ps1`
3. Escanea el **nuevo QR** que se genera

**La IP se detecta automáticamente** cada vez.

---

## 🔥 Firewall (Solo Primera Vez)

Si es la primera vez, ejecuta **como Administrador**:

```powershell
New-NetFirewallRule -DisplayName "Node.js" -Direction Inbound -Program "C:\Program Files\nodejs\node.exe" -Action Allow

New-NetFirewallRule -DisplayName "React Dev" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
```

---

## 📁 Archivos

| Archivo | Función |
|---------|---------|
| `start-mobile.ps1` | ⭐ Inicia todo con QR |
| `start-backend.ps1` | Solo backend |
| `start-frontend.ps1` | Solo frontend |

---

## 💡 Tips

✅ **El QR es único para cada red** - No lo guardes
✅ **Amplía la terminal** si el QR se ve pequeño
✅ **Usa Windows Terminal** para mejor visualización
✅ **Verifica la WiFi** - Móvil y PC deben estar en la misma

---

## 🎓 Para Presentaciones en Clase

1. Conecta tu laptop a la WiFi de la universidad
2. Ejecuta `start-mobile.ps1`
3. **Proyecta el QR** en la pantalla
4. Tus compañeros escanean y listo 🎉

---

## 🆘 Ayuda Rápida

**Problema:** No puedo escanear el QR
**Solución:** Usa la URL que aparece arriba del QR

**Problema:** El móvil no se conecta
**Solución:** Verifica que estén en la misma WiFi

**Problema:** Error de CORS
**Solución:** Reinicia ambos servidores

---

**Ver documentación completa:** [ACCESO-MOVIL-QR-DINAMICO.md](./ACCESO-MOVIL-QR-DINAMICO.md)
