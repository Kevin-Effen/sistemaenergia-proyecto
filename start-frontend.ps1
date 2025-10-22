# ============================================================
# 📱 Script de Inicio - Frontend con QR (Acceso Móvil)
# Sistema de Energía Eólica
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "📱 Iniciando Frontend con QR para móvil..." -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Ir al directorio frontend
Set-Location -Path "$PSScriptRoot\frontend"

# Iniciar con el script que genera QR
npm run start:mobile

# Si falla, mantener ventana abierta
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Error al iniciar el frontend" -ForegroundColor Red
    Write-Host "Presiona cualquier tecla para cerrar..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
