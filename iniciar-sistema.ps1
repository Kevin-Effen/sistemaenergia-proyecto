# 🚀 INICIO RÁPIDO - Sistema Energía Eólica
# Script para iniciar Backend y Frontend automáticamente
# Uso: .\iniciar-sistema.ps1

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🚀 Sistema de Energía Eólica - Inicio Automático" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Función para detener procesos previos
function Stop-PreviousProcesses {
    Write-Host "🔧 Deteniendo procesos anteriores..." -ForegroundColor Yellow
    Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "✅ Procesos anteriores detenidos" -ForegroundColor Green
    Write-Host ""
}

# Función para verificar MySQL
function Test-MySQL {
    Write-Host "🔍 Verificando MySQL..." -ForegroundColor Yellow
    $mysqlService = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue
    if ($mysqlService -and $mysqlService.Status -eq "Running") {
        Write-Host "✅ MySQL está corriendo" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ MySQL no está corriendo" -ForegroundColor Red
        Write-Host "   Intenta: net start MySQL80" -ForegroundColor Yellow
        return $false
    }
    Write-Host ""
}

# Función para iniciar Backend
function Start-Backend {
    Write-Host "🔧 Iniciando Backend..." -ForegroundColor Yellow
    $backendPath = Join-Path $PSScriptRoot "backend"
    
    if (Test-Path $backendPath) {
        Set-Location $backendPath
        Write-Host "   📂 Directorio: $backendPath" -ForegroundColor Gray
        
        # Iniciar backend en nueva ventana
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "node index.js" -WindowStyle Normal
        
        Start-Sleep -Seconds 3
        Write-Host "✅ Backend iniciado en puerto 3001" -ForegroundColor Green
        Write-Host "   📍 http://localhost:3001" -ForegroundColor Cyan
        Write-Host ""
    } else {
        Write-Host "❌ No se encontró la carpeta backend" -ForegroundColor Red
        Write-Host ""
    }
}

# Función para iniciar Frontend
function Start-Frontend {
    Write-Host "🔧 Iniciando Frontend..." -ForegroundColor Yellow
    $frontendPath = Join-Path $PSScriptRoot "frontend"
    
    if (Test-Path $frontendPath) {
        Set-Location $frontendPath
        Write-Host "   📂 Directorio: $frontendPath" -ForegroundColor Gray
        
        # Configurar variable de entorno
        $env:REACT_APP_API_BASE = "http://localhost:3001"
        
        # Iniciar frontend en nueva ventana
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start" -WindowStyle Normal
        
        Start-Sleep -Seconds 5
        Write-Host "✅ Frontend iniciado en puerto 3000" -ForegroundColor Green
        Write-Host "   📍 http://localhost:3000" -ForegroundColor Cyan
        Write-Host ""
    } else {
        Write-Host "❌ No se encontró la carpeta frontend" -ForegroundColor Red
        Write-Host ""
    }
}

# Función principal
function Start-System {
    Clear-Host
    
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "🚀 Sistema de Energía Eólica" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
    
    # 1. Detener procesos previos
    Stop-PreviousProcesses
    
    # 2. Verificar MySQL
    if (-not (Test-MySQL)) {
        Write-Host "⚠️  Continuar sin MySQL? (S/N): " -ForegroundColor Yellow -NoNewline
        $response = Read-Host
        if ($response -ne "S" -and $response -ne "s") {
            Write-Host "❌ Inicio cancelado" -ForegroundColor Red
            return
        }
    }
    
    # 3. Iniciar Backend
    Start-Backend
    
    # 4. Iniciar Frontend
    Start-Frontend
    
    # 5. Resumen
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "✅ Sistema Iniciado Correctamente" -ForegroundColor Green
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📊 Accesos:" -ForegroundColor White
    Write-Host "   Frontend:  http://localhost:3000" -ForegroundColor Cyan
    Write-Host "   Backend:   http://localhost:3001" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔧 Comandos útiles:" -ForegroundColor White
    Write-Host "   Detener todo: Get-Process node | Stop-Process -Force" -ForegroundColor Gray
    Write-Host "   Ver puertos: netstat -ano | findstr :3000" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 Abre tu navegador en: http://localhost:3000" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    
    # Abrir navegador automáticamente
    Start-Sleep -Seconds 3
    Write-Host "🌐 Abriendo navegador..." -ForegroundColor Yellow
    Start-Process "http://localhost:3000"
}

# Ejecutar
Start-System
