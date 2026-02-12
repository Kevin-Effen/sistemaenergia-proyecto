# ============================================================
# 🚀 Script de Inicio - Backend con QR
# Sistema de Energía Eólica
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🚀 Iniciando Backend API..." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Ir al directorio backend
Set-Location -Path "$PSScriptRoot\backend"

# Iniciar el servidor
npm start

# Si falla, mantener ventana abierta
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Error al iniciar el backend" -ForegroundColor Red
    Write-Host "Presiona cualquier tecla para cerrar..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
