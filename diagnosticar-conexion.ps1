# ============================================================
# 🔍 Diagnóstico de Conexión Móvil
# Sistema de Energía Eólica
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "🔍 Diagnóstico de Conexión Móvil" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar IP de WiFi
Write-Host "1️⃣  Verificando dirección IP de WiFi..." -ForegroundColor Cyan
$wifiIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.IPAddress -like '192.168.*' -and 
    $_.InterfaceAlias -like '*Wi-Fi*'
} | Select-Object -First 1

if ($wifiIP) {
    Write-Host "   ✅ IP de WiFi detectada: $($wifiIP.IPAddress)" -ForegroundColor Green
    $ipCorrecta = $wifiIP.IPAddress
} else {
    Write-Host "   ⚠️  No se detectó conexión WiFi activa" -ForegroundColor Yellow
    $ipCorrecta = "192.168.0.9"
}

Write-Host ""

# 2. Verificar si los puertos están abiertos
Write-Host "2️⃣  Verificando puertos..." -ForegroundColor Cyan

$puerto3001 = Test-NetConnection -ComputerName localhost -Port 3001 -WarningAction SilentlyContinue -InformationLevel Quiet
$puerto3000 = Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue -InformationLevel Quiet

if ($puerto3001) {
    Write-Host "   ✅ Puerto 3001 (Backend) está abierto" -ForegroundColor Green
} else {
    Write-Host "   ❌ Puerto 3001 (Backend) NO está abierto" -ForegroundColor Red
    Write-Host "      Inicia el backend con: cd backend; npm start" -ForegroundColor Yellow
}

if ($puerto3000) {
    Write-Host "   ✅ Puerto 3000 (Frontend) está abierto" -ForegroundColor Green
} else {
    Write-Host "   ❌ Puerto 3000 (Frontend) NO está abierto" -ForegroundColor Red
    Write-Host "      Inicia el frontend con: cd frontend; npm run start:mobile" -ForegroundColor Yellow
}

Write-Host ""

# 3. Verificar reglas de Firewall
Write-Host "3️⃣  Verificando reglas de Firewall..." -ForegroundColor Cyan

$reglasFirewall = @(
    "Node.js Server",
    "Backend API Port 3001",
    "React Dev Server Port 3000"
)

$todasLasReglas = Get-NetFirewallRule -Direction Inbound -Action Allow -ErrorAction SilentlyContinue

$reglasEncontradas = 0
foreach ($regla in $reglasFirewall) {
    $existe = $todasLasReglas | Where-Object { $_.DisplayName -eq $regla }
    if ($existe) {
        Write-Host "   ✅ $regla" -ForegroundColor Green
        $reglasEncontradas++
    } else {
        Write-Host "   ❌ $regla (no configurada)" -ForegroundColor Red
    }
}

if ($reglasEncontradas -lt 3) {
    Write-Host ""
    Write-Host "   ⚠️  Firewall no configurado completamente" -ForegroundColor Yellow
    Write-Host "   📝 Ejecuta: configurar-firewall.ps1 como Administrador" -ForegroundColor Cyan
}

Write-Host ""

# 4. Mostrar URLs para móvil
Write-Host "4️⃣  URLs para acceder desde tu móvil:" -ForegroundColor Cyan
Write-Host ""
Write-Host "   ╔════════════════════════════════════════════════════╗" -ForegroundColor White
Write-Host "   ║  Frontend:  http://$($ipCorrecta):3000$(if ($ipCorrecta.Length -lt 13) { ' ' * (13 - $ipCorrecta.Length) })  ║" -ForegroundColor White
Write-Host "   ║  Backend:   http://$($ipCorrecta):3001$(if ($ipCorrecta.Length -lt 13) { ' ' * (13 - $ipCorrecta.Length) })  ║" -ForegroundColor White
Write-Host "   ╚════════════════════════════════════════════════════╝" -ForegroundColor White

Write-Host ""

# 5. Test de conectividad local
Write-Host "5️⃣  Probando acceso local..." -ForegroundColor Cyan

if ($puerto3001) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        Write-Host "   ✅ Backend responde correctamente" -ForegroundColor Green
    } catch {
        Write-Host "   ⚠️  Backend no responde correctamente" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⏭️  Backend no está corriendo" -ForegroundColor Gray
}

Write-Host ""

# 6. Diagnóstico de red
Write-Host "6️⃣  Información de red:" -ForegroundColor Cyan

$adaptadorWiFi = Get-NetAdapter | Where-Object { $_.InterfaceDescription -like '*Wi-Fi*' -or $_.Name -like '*Wi-Fi*' } | Select-Object -First 1

if ($adaptadorWiFi) {
    Write-Host "   📡 Adaptador WiFi: $($adaptadorWiFi.Name)" -ForegroundColor White
    Write-Host "   📊 Estado: $($adaptadorWiFi.Status)" -ForegroundColor White
    
    if ($adaptadorWiFi.Status -ne "Up") {
        Write-Host "   ⚠️  WiFi no está activo" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⚠️  No se encontró adaptador WiFi" -ForegroundColor Yellow
}

Write-Host ""

# 7. Resumen y recomendaciones
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "📋 RESUMEN DEL DIAGNÓSTICO" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$problemas = @()

if (-not $wifiIP) {
    $problemas += "❌ No hay conexión WiFi activa"
}

if (-not $puerto3001) {
    $problemas += "❌ Backend no está corriendo"
}

if (-not $puerto3000) {
    $problemas += "❌ Frontend no está corriendo"
}

if ($reglasEncontradas -lt 3) {
    $problemas += "❌ Firewall no configurado"
}

if ($problemas.Count -eq 0) {
    Write-Host "✅ TODO ESTÁ CONFIGURADO CORRECTAMENTE" -ForegroundColor Green
    Write-Host ""
    Write-Host "Si aún no puedes acceder desde tu móvil:" -ForegroundColor Yellow
    Write-Host "  1. Verifica que tu móvil esté en la MISMA red WiFi" -ForegroundColor White
    Write-Host "  2. Desactiva VPN o proxy en tu móvil" -ForegroundColor White
    Write-Host "  3. Intenta acceder primero al backend:" -ForegroundColor White
    Write-Host "     http://$($ipCorrecta):3001/health" -ForegroundColor Cyan
    Write-Host "  4. Si funciona, luego intenta el frontend:" -ForegroundColor White
    Write-Host "     http://$($ipCorrecta):3000" -ForegroundColor Cyan
} else {
    Write-Host "PROBLEMAS DETECTADOS:" -ForegroundColor Red
    Write-Host ""
    foreach ($problema in $problemas) {
        Write-Host "  $problema" -ForegroundColor Red
    }
    Write-Host ""
    Write-Host "🔧 SOLUCIONES:" -ForegroundColor Yellow
    Write-Host ""
    
    if ($problemas -like "*Backend*") {
        Write-Host "  • Inicia el backend:" -ForegroundColor White
        Write-Host "    cd backend" -ForegroundColor Gray
        Write-Host "    npm start" -ForegroundColor Gray
        Write-Host ""
    }
    
    if ($problemas -like "*Frontend*") {
        Write-Host "  • Inicia el frontend:" -ForegroundColor White
        Write-Host "    cd frontend" -ForegroundColor Gray
        Write-Host "    npm run start:mobile" -ForegroundColor Gray
        Write-Host ""
    }
    
    if ($problemas -like "*Firewall*") {
        Write-Host "  • Configura el Firewall:" -ForegroundColor White
        Write-Host "    Haz clic derecho en configurar-firewall.ps1" -ForegroundColor Gray
        Write-Host "    Selecciona 'Ejecutar con PowerShell'" -ForegroundColor Gray
        Write-Host ""
    }
    
    if ($problemas -like "*WiFi*") {
        Write-Host "  • Verifica tu conexión WiFi:" -ForegroundColor White
        Write-Host "    - Asegúrate de estar conectado a WiFi" -ForegroundColor Gray
        Write-Host "    - Reinicia el adaptador si es necesario" -ForegroundColor Gray
        Write-Host ""
    }
}

Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
