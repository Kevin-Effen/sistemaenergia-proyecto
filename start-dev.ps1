# ========================================
# Script de inicio para Sistema Eólico
# ========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Sistema de Energía Eólica - DEV" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Función para verificar si un puerto está en uso
function Test-Port {
    param([int]$Port)
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return $null -ne $connection
}

# Función para matar proceso en un puerto
function Stop-ProcessOnPort {
    param([int]$Port)
    $process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -First 1
    if ($process) {
        Write-Host "🔴 Deteniendo proceso en puerto $Port (PID: $process)..." -ForegroundColor Yellow
        Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

# Limpiar puertos si están ocupados
Write-Host "🔍 Verificando puertos..." -ForegroundColor Yellow
if (Test-Port 3001) {
    Write-Host "⚠️  Puerto 3001 ocupado" -ForegroundColor Red
    Stop-ProcessOnPort 3001
}
if (Test-Port 3000) {
    Write-Host "⚠️  Puerto 3000 ocupado" -ForegroundColor Red
    Stop-ProcessOnPort 3000
}

Write-Host ""
Write-Host "✅ Puertos liberados" -ForegroundColor Green
Write-Host ""

# Verificar archivos .env
Write-Host "🔍 Verificando archivos de configuración..." -ForegroundColor Yellow

$backendEnv = ".\backend\.env"
$frontendEnv = ".\frontend\.env"

if (-not (Test-Path $backendEnv)) {
    Write-Host "⚠️  Creando backend/.env..." -ForegroundColor Yellow
    @"
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=sistema_energia_eolica
JWT_SECRET=tu_clave_secreta_super_segura_cambiala_en_produccion
"@ | Out-File -FilePath $backendEnv -Encoding UTF8
}

if (-not (Test-Path $frontendEnv)) {
    Write-Host "⚠️  Creando frontend/.env..." -ForegroundColor Yellow
    "REACT_APP_API_BASE=http://localhost:3001" | Out-File -FilePath $frontendEnv -Encoding UTF8
}

Write-Host "✅ Archivos .env verificados" -ForegroundColor Green
Write-Host ""

# Iniciar Backend
Write-Host "🚀 Iniciando Backend (Puerto 3001)..." -ForegroundColor Cyan
$backendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '.\backend'; Write-Host '🟢 BACKEND INICIADO' -ForegroundColor Green; npm start" -PassThru

Start-Sleep -Seconds 5

# Verificar que el backend inició
if (Test-Port 3001) {
    Write-Host "✅ Backend corriendo en http://localhost:3001" -ForegroundColor Green
} else {
    Write-Host "❌ Error: Backend no pudo iniciar" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Iniciar Frontend
Write-Host "🚀 Iniciando Frontend (Puerto 3000)..." -ForegroundColor Cyan
$frontendJob = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '.\frontend'; Write-Host '🟢 FRONTEND INICIADO' -ForegroundColor Green; npm start" -PassThru

Start-Sleep -Seconds 8

# Verificar que el frontend inició
if (Test-Port 3000) {
    Write-Host "✅ Frontend corriendo en http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "⚠️  Frontend puede tardar en compilar..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ SISTEMA INICIADO CORRECTAMENTE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📌 Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "📌 Backend:  http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "Para detener el sistema, cierra ambas ventanas de PowerShell" -ForegroundColor Yellow
Write-Host ""
