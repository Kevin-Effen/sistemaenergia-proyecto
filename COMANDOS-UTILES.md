# ⚡ COMANDOS ÚTILES - Referencia Rápida

**Proyecto:** SISTEMAENERGIA008  
**Última actualización:** 17 de octubre de 2025

---

## 🚀 INICIO DEL SISTEMA

### Inicio Automático (Recomendado)
```powershell
cd "c:\Users\kevin\Desktop\INCOS 2025\PROYECTO  SOCIO-PRODUCTIVO\SOFTWARE EOLICO\VERSIONES\sistemaenergia008"
.\start-dev.ps1
```

### Inicio Manual

#### Backend (Terminal 1)
```powershell
cd "c:\Users\kevin\Desktop\INCOS 2025\PROYECTO  SOCIO-PRODUCTIVO\SOFTWARE EOLICO\VERSIONES\sistemaenergia008\backend"
npm start
```

#### Frontend (Terminal 2)
```powershell
cd "c:\Users\kevin\Desktop\INCOS 2025\PROYECTO  SOCIO-PRODUCTIVO\SOFTWARE EOLICO\VERSIONES\sistemaenergia008\frontend"
npm start
```

---

## 💾 BASE DE DATOS

### Backup
```powershell
# Crear backup con timestamp
mysqldump -u root -p sistema_energia_eolica > "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

# Backup simple
mysqldump -u root -p sistema_energia_eolica > backup.sql
```

### Restaurar
```powershell
mysql -u root -p sistema_energia_eolica < backup.sql
```

### Importar estructura inicial
```powershell
mysql -u root -p sistema_energia_eolica < sistema_energia_eolica.sql
```

### Conectar a MySQL
```powershell
mysql -u root -p
```

### Queries útiles
```sql
-- Ver base de datos actual
USE sistema_energia_eolica;

-- Ver todas las tablas
SHOW TABLES;

-- Ver usuarios
SELECT c.id_cuenta, c.usuario, r.nombre_rol 
FROM cuentas c
JOIN usuarios u ON u.cuenta_id = c.id_cuenta
JOIN roles r ON r.id_rol = u.rol_id;

-- Ver equipos eólicos
SELECT * FROM eolicos;

-- Ver últimos accesos
SELECT * FROM bitacora_accesos ORDER BY creado_en DESC LIMIT 20;

-- Desbloquear cuenta
UPDATE cuentas 
SET intentos_fallidos = 0, bloqueado_hasta = NULL 
WHERE usuario = 'email@usuario.com';

-- Ver cuotas pendientes
SELECT * FROM cuotas WHERE pagado = 0;
```

---

## 🔍 VERIFICACIÓN DEL SISTEMA

### Verificar puertos
```powershell
# Ver qué proceso está usando puerto 3001 (backend)
Get-NetTCPConnection -LocalPort 3001

# Ver qué proceso está usando puerto 3000 (frontend)
Get-NetTCPConnection -LocalPort 3000

# Liberar puerto si está ocupado
$process = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($process) { Stop-Process -Id $process -Force }
```

### Health check
```powershell
# Verificar backend
curl http://localhost:3001/health

# O en navegador
# http://localhost:3001/health
```

### Verificar servicios de MySQL
```powershell
Get-Service -Name MySQL*
```

---

## 🔧 GIT

### Verificar estado
```powershell
cd "c:\Users\kevin\Desktop\INCOS 2025\PROYECTO  SOCIO-PRODUCTIVO\SOFTWARE EOLICO\VERSIONES\sistemaenergia008"
git status
```

### Crear backup checkpoint
```powershell
git add .
git commit -m "Checkpoint antes de modificar [DESCRIPCIÓN]"
```

### Crear branch para nueva funcionalidad
```powershell
git branch feature/nombre-funcionalidad
git checkout feature/nombre-funcionalidad
```

### Ver ramas disponibles
```powershell
git branch -a
```

### Cambiar de rama
```powershell
git checkout nombre-rama
```

### Ver historial
```powershell
git log --oneline --graph --all
```

### Deshacer último commit (mantener cambios)
```powershell
git reset --soft HEAD~1
```

### Ver diferencias
```powershell
git diff
```

### Publicar branch
```powershell
git push -u origin feature/nombre-funcionalidad
```

---

## 📦 NPM

### Instalar dependencias

#### Backend
```powershell
cd backend
npm install
```

#### Frontend
```powershell
cd frontend
npm install
```

### Agregar nueva dependencia

#### Backend
```powershell
cd backend
npm install nombre-paquete
```

#### Frontend
```powershell
cd frontend
npm install nombre-paquete
```

### Ver dependencias instaladas
```powershell
npm list --depth=0
```

### Actualizar dependencias (con cuidado)
```powershell
npm update
```

---

## 🔐 GESTIÓN DE .ENV

### Crear archivo .env backend
```powershell
cd backend
New-Item -ItemType File -Name .env -Force
```

Contenido:
```env
PORT=3001
HOST=0.0.0.0
DB_HOST=localhost
DB_USER=root
DB_PASS=
DB_NAME=sistema_energia_eolica
JWT_SECRET=tu_clave_secreta_super_segura_cambiala_en_produccion
JWT_EXPIRES=4h
CORS_ORIGIN=http://localhost:3000
```

### Crear archivo .env frontend
```powershell
cd frontend
New-Item -ItemType File -Name .env -Force
```

Contenido:
```env
REACT_APP_API_BASE=http://localhost:3001
```

---

## 🧹 LIMPIEZA

### Limpiar node_modules y reinstalar

#### Backend
```powershell
cd backend
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

#### Frontend
```powershell
cd frontend
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
```

### Limpiar caché de npm
```powershell
npm cache clean --force
```

---

## 🐛 DEBUGGING

### Ver logs de backend
```powershell
cd backend
npm start
# Los logs aparecerán en la terminal
```

### Ver logs de frontend
```powershell
cd frontend
npm start
# Los logs aparecerán en la terminal
```

### Ver logs de MySQL
```powershell
# En MySQL
SHOW ENGINE INNODB STATUS;

# Ver errores recientes
SHOW WARNINGS;
```

---

## 🔍 BÚSQUEDA EN CÓDIGO

### Buscar texto en archivos
```powershell
# Buscar en backend
cd backend
Select-String -Path "*.js" -Pattern "requireAuth" -Recurse

# Buscar en frontend
cd frontend\src
Select-String -Path "*.js","*.jsx" -Pattern "useState" -Recurse
```

### Buscar en toda la carpeta
```powershell
cd "c:\Users\kevin\Desktop\INCOS 2025\PROYECTO  SOCIO-PRODUCTIVO\SOFTWARE EOLICO\VERSIONES\sistemaenergia008"
Select-String -Path * -Pattern "LOGIN" -Recurse
```

---

## 📊 INFORMACIÓN DEL SISTEMA

### Ver versión de Node
```powershell
node --version
```

### Ver versión de npm
```powershell
npm --version
```

### Ver versión de MySQL
```powershell
mysql --version
```

### Ver información del proyecto

#### Backend
```powershell
cd backend
npm list
```

#### Frontend
```powershell
cd frontend
npm list
```

---

## 🚨 SOLUCIÓN RÁPIDA DE PROBLEMAS

### Backend no inicia
```powershell
# 1. Verificar que MySQL está corriendo
Get-Service -Name MySQL*

# 2. Liberar puerto 3001
$process = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($process) { Stop-Process -Id $process -Force }

# 3. Verificar .env existe
Test-Path backend\.env

# 4. Reinstalar dependencias
cd backend
Remove-Item -Recurse -Force node_modules
npm install
npm start
```

### Frontend no inicia
```powershell
# 1. Liberar puerto 3000
$process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($process) { Stop-Process -Id $process -Force }

# 2. Verificar .env existe
Test-Path frontend\.env

# 3. Reinstalar dependencias
cd frontend
Remove-Item -Recurse -Force node_modules
npm install
npm start
```

### Error de conexión a BD
```powershell
# 1. Verificar MySQL está corriendo
Get-Service -Name MySQL* | Start-Service

# 2. Verificar credenciales en backend/.env
cat backend\.env | Select-String -Pattern "DB_"

# 3. Probar conexión manual
mysql -u root -p -e "USE sistema_energia_eolica; SHOW TABLES;"
```

### Login no funciona
```sql
-- En MySQL, verificar usuarios
USE sistema_energia_eolica;
SELECT c.usuario, c.intentos_fallidos, c.bloqueado_hasta, r.nombre_rol
FROM cuentas c
JOIN usuarios u ON u.cuenta_id = c.id_cuenta
JOIN roles r ON r.id_rol = u.rol_id;

-- Desbloquear si es necesario
UPDATE cuentas SET intentos_fallidos = 0, bloqueado_hasta = NULL;
```

---

## 📝 CREAR NUEVA FUNCIONALIDAD (Quick Start)

### 1. Preparación
```powershell
# Backup BD
mysqldump -u root -p sistema_energia_eolica > "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

# Git checkpoint
git add .
git commit -m "Checkpoint antes de nueva funcionalidad"
git branch feature/mi-nueva-funcionalidad
git checkout feature/mi-nueva-funcionalidad
```

### 2. Base de datos (si necesitas nueva tabla)
```powershell
# Crear archivo SQL
New-Item -ItemType File -Name "agregar_mi_tabla.sql"

# Editar y ejecutar
mysql -u root -p sistema_energia_eolica < agregar_mi_tabla.sql
```

### 3. Backend (agregar endpoint)
Editar: `backend/index.js`

### 4. Frontend (crear página)
```powershell
cd frontend\src\pages
New-Item -ItemType File -Name "MiNuevaPagina.js"
```

### 5. Testing
```powershell
# Iniciar sistema
.\start-dev.ps1

# Probar login funciona
# Probar nueva funcionalidad
```

---

## 🔄 WORKFLOW COMPLETO DE DESARROLLO

```powershell
# 1. Preparación
cd "c:\Users\kevin\Desktop\INCOS 2025\PROYECTO  SOCIO-PRODUCTIVO\SOFTWARE EOLICO\VERSIONES\sistemaenergia008"
mysqldump -u root -p sistema_energia_eolica > backup.sql
git checkout -b feature/nueva-funcionalidad

# 2. Desarrollo
# (Editar archivos según GUIA-NUEVOS-MODULOS.md)

# 3. Testing
.\start-dev.ps1
# Probar todo

# 4. Commit
git add .
git commit -m "feat: Agregar nueva funcionalidad X"
git push -u origin feature/nueva-funcionalidad

# 5. Merge (cuando todo funcione)
git checkout main
git merge feature/nueva-funcionalidad
git push origin main
```

---

## 📚 ACCESO RÁPIDO A DOCUMENTACIÓN

### Abrir documentos
```powershell
cd "c:\Users\kevin\Desktop\INCOS 2025\PROYECTO  SOCIO-PRODUCTIVO\SOFTWARE EOLICO\VERSIONES\sistemaenergia008"

# Documento principal
notepad README-DOCUMENTACION.md

# Revisión técnica
notepad REVISION-TECNICA-COMPLETA.md

# Checklist
notepad CHECKLIST-SEGURIDAD.md

# Arquitectura
notepad ARQUITECTURA-MAPA.md

# Guía de desarrollo
notepad GUIA-NUEVOS-MODULOS.md

# Resumen rápido
notepad RESUMEN-VISUAL-RAPIDO.md
```

---

## 🎯 ATAJOS ÚTILES

### Todo en uno - Iniciar desarrollo
```powershell
# Navegar al proyecto
cd "c:\Users\kevin\Desktop\INCOS 2025\PROYECTO  SOCIO-PRODUCTIVO\SOFTWARE EOLICO\VERSIONES\sistemaenergia008"

# Iniciar sistema
.\start-dev.ps1
```

### Todo en uno - Backup y checkpoint
```powershell
# Backup BD + Git commit
mysqldump -u root -p sistema_energia_eolica > "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"
git add .
git commit -m "Checkpoint $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
```

### Todo en uno - Limpieza completa
```powershell
# Backend
cd backend
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# Frontend
cd ..\frontend
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json

# Reinstalar todo
cd ..\backend
npm install
cd ..\frontend
npm install
```

---

## 💡 TIPS DE PRODUCTIVIDAD

### Crear alias en PowerShell
```powershell
# Abrir perfil de PowerShell
notepad $PROFILE

# Agregar alias
Set-Alias energia "cd 'c:\Users\kevin\Desktop\INCOS 2025\PROYECTO  SOCIO-PRODUCTIVO\SOFTWARE EOLICO\VERSIONES\sistemaenergia008'"

# Guardar y recargar
. $PROFILE

# Ahora puedes usar:
energia
```

### Crear función de inicio rápido
```powershell
# En $PROFILE agregar:
function Start-Energia {
    cd "c:\Users\kevin\Desktop\INCOS 2025\PROYECTO  SOCIO-PRODUCTIVO\SOFTWARE EOLICO\VERSIONES\sistemaenergia008"
    .\start-dev.ps1
}

# Guardar y usar:
Start-Energia
```

---

## 🎨 VS CODE

### Abrir proyecto en VS Code
```powershell
cd "c:\Users\kevin\Desktop\INCOS 2025\PROYECTO  SOCIO-PRODUCTIVO\SOFTWARE EOLICO\VERSIONES\sistemaenergia008"
code .
```

### Extensiones recomendadas
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- MySQL (por Jun Han)
- GitLens
- Auto Rename Tag
- Path Intellisense

---

**Última actualización:** 17 de octubre de 2025  
**Nota:** Guarda este archivo en tus marcadores para acceso rápido

---

> 💡 **TIP:** Imprime o guarda este documento como referencia rápida mientras desarrollas
