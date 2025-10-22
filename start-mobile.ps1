# ============================================================
# 🌐 Script de Inicio Completo - Sistema de Energía Eólica
# Inicia Backend + Frontend con códigos QR
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🌐 Sistema de Energía Eólica" -ForegroundColor Green
Write-Host "   Iniciando Backend + Frontend con QR" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Función para verificar si un puerto está en uso
function Test-Port {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
    return $connection.TcpTestSucceeded
}

# Verificar si los puertos están disponibles
Write-Host "🔍 Verificando puertos..." -ForegroundColor Yellow

if (Test-Port -Port 3001) {
    Write-Host "⚠️  Puerto 3001 (Backend) ya está en uso" -ForegroundColor Red
    Write-Host "   ¿Deseas continuar de todos modos? (S/N): " -NoNewline -ForegroundColor Yellow
    $respuesta = Read-Host
    if ($respuesta -ne "S" -and $respuesta -ne "s") {
        exit
    }
}

if (Test-Port -Port 3000) {
    Write-Host "⚠️  Puerto 3000 (Frontend) ya está en uso" -ForegroundColor Red
    Write-Host "   ¿Deseas continuar de todos modos? (S/N): " -NoNewline -ForegroundColor Yellow
    $respuesta = Read-Host
    if ($respuesta -ne "S" -and $respuesta -ne "s") {
        exit
    }
}

Write-Host "✅ Puertos disponibles" -ForegroundColor Green
Write-Host ""

# Iniciar Backend en nueva ventana
Write-Host "🚀 Iniciando Backend API..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-File", "$PSScriptRoot\start-backend.ps1"
Start-Sleep -Seconds 3

# Iniciar Frontend en nueva ventana
Write-Host "📱 Iniciando Frontend con QR..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-File", "$PSScriptRoot\start-frontend.ps1"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "✅ Servidores iniciándose en ventanas separadas" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Instrucciones:" -ForegroundColor Yellow
Write-Host "   1. Espera a que ambos servidores terminen de cargar" -ForegroundColor White
Write-Host "   2. Busca el código QR en la ventana del Frontend" -ForegroundColor White
Write-Host "   3. Escanea el QR con tu móvil" -ForegroundColor White
Write-Host "   4. Asegúrate de estar en la misma red WiFi" -ForegroundColor White
Write-Host ""
Write-Host "🔗 URLs de acceso:" -ForegroundColor Yellow
Write-Host "   PC - Frontend:  http://localhost:3000" -ForegroundColor White
Write-Host "   PC - Backend:   http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tip: Los códigos QR se mostrarán en las ventanas individuales" -ForegroundColor Cyan
Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar esta ventana..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
