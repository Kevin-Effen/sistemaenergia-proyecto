# ============================================================
# 🔥 Configurar Firewall - Sistema de Energía Eólica
# EJECUTAR COMO ADMINISTRADOR
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🔥 Configurando Firewall de Windows" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si se ejecuta como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ ERROR: Este script debe ejecutarse como ADMINISTRADOR" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Pasos para ejecutar como administrador:" -ForegroundColor Yellow
    Write-Host "   1. Haz clic derecho en este archivo" -ForegroundColor White
    Write-Host "   2. Selecciona 'Ejecutar con PowerShell'" -ForegroundColor White
    Write-Host "   3. O abre PowerShell como Administrador y ejecuta:" -ForegroundColor White
    Write-Host "      cd '$PSScriptRoot'" -ForegroundColor Gray
    Write-Host "      .\configurar-firewall.ps1" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Presiona cualquier tecla para salir..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-Host "✅ Ejecutando con permisos de administrador" -ForegroundColor Green
Write-Host ""

# Regla 1: Node.js (Backend)
Write-Host "📝 Creando regla para Node.js (Backend)..." -ForegroundColor Cyan
try {
    # Eliminar regla anterior si existe
    Remove-NetFirewallRule -DisplayName "Node.js Server" -ErrorAction SilentlyContinue
    
    # Crear nueva regla
    New-NetFirewallRule -DisplayName "Node.js Server" `
        -Direction Inbound `
        -Program "C:\Program Files\nodejs\node.exe" `
        -Action Allow `
        -Profile Any `
        -Description "Permite acceso al backend Node.js desde red local" | Out-Null
    
    Write-Host "   ✅ Regla de Node.js creada exitosamente" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Error al crear regla de Node.js: $_" -ForegroundColor Yellow
}

Write-Host ""

# Regla 2: Puerto 3001 (Backend API)
Write-Host "📝 Creando regla para puerto 3001 (Backend)..." -ForegroundColor Cyan
try {
    # Eliminar regla anterior si existe
    Remove-NetFirewallRule -DisplayName "Backend API Port 3001" -ErrorAction SilentlyContinue
    
    # Crear nueva regla
    New-NetFirewallRule -DisplayName "Backend API Port 3001" `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort 3001 `
        -Action Allow `
        -Profile Any `
        -Description "Permite acceso al backend en puerto 3001" | Out-Null
    
    Write-Host "   ✅ Regla del puerto 3001 creada exitosamente" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Error al crear regla del puerto 3001: $_" -ForegroundColor Yellow
}

Write-Host ""

# Regla 3: Puerto 3000 (Frontend React)
Write-Host "📝 Creando regla para puerto 3000 (Frontend)..." -ForegroundColor Cyan
try {
    # Eliminar regla anterior si existe
    Remove-NetFirewallRule -DisplayName "React Dev Server Port 3000" -ErrorAction SilentlyContinue
    
    # Crear nueva regla
    New-NetFirewallRule -DisplayName "React Dev Server Port 3000" `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort 3000 `
        -Action Allow `
        -Profile Any `
        -Description "Permite acceso al frontend React en puerto 3000" | Out-Null
    
    Write-Host "   ✅ Regla del puerto 3000 creada exitosamente" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Error al crear regla del puerto 3000: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "✅ CONFIGURACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📱 Ahora puedes acceder desde tu móvil a:" -ForegroundColor Yellow
Write-Host "   Frontend: http://192.168.0.9:3000" -ForegroundColor White
Write-Host "   Backend:  http://192.168.0.9:3001" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tip: Si aún no funciona, verifica que:" -ForegroundColor Cyan
Write-Host "   1. Tu móvil esté en la misma red WiFi" -ForegroundColor White
Write-Host "   2. Los servidores estén corriendo" -ForegroundColor White
Write-Host "   3. No tengas VPN o proxy activo en el móvil" -ForegroundColor White
Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
