# Diagnostico Simple
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "DIAGNOSTICO DE CONEXION MOVIL" -ForegroundColor Yellow
Write-Host "============================================================`n" -ForegroundColor Cyan

# 1. IP WiFi
$wifiIP = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '192.168.*' -and $_.InterfaceAlias -like '*Wi-Fi*' } | Select-Object -First 1

Write-Host "1. IP de WiFi:" -ForegroundColor Cyan
if ($wifiIP) {
    Write-Host "   OK: $($wifiIP.IPAddress)" -ForegroundColor Green
    $ip = $wifiIP.IPAddress
} else {
    Write-Host "   ERROR: No WiFi detectado" -ForegroundColor Red
    $ip = "192.168.0.9"
}

# 2. Puertos
Write-Host "`n2. Puertos:" -ForegroundColor Cyan
$backend = Test-NetConnection -ComputerName localhost -Port 3001 -WarningAction SilentlyContinue
$frontend = Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue

if ($backend.TcpTestSucceeded) {
    Write-Host "   OK: Backend (3001)" -ForegroundColor Green
} else {
    Write-Host "   ERROR: Backend NO corriendo" -ForegroundColor Red
}

if ($frontend.TcpTestSucceeded) {
    Write-Host "   OK: Frontend (3000)" -ForegroundColor Green
} else {
    Write-Host "   ERROR: Frontend NO corriendo" -ForegroundColor Red
}

# 3. Firewall
Write-Host "`n3. Firewall:" -ForegroundColor Cyan
$reglas = Get-NetFirewallRule -DisplayName "Node.js Server" -ErrorAction SilentlyContinue

if ($reglas) {
    Write-Host "   OK: Firewall configurado" -ForegroundColor Green
} else {
    Write-Host "   ERROR: Firewall NO configurado" -ForegroundColor Red
    Write-Host "   SOLUCION: Ejecuta configurar-firewall.ps1 como Administrador" -ForegroundColor Yellow
}

# 4. URLs
Write-Host "`n4. URLs para tu movil:" -ForegroundColor Cyan
Write-Host "   Frontend: http://$($ip):3000" -ForegroundColor White
Write-Host "   Backend:  http://$ip):3001" -ForegroundColor White

Write-Host "`n============================================================`n" -ForegroundColor Cyan
Write-Host "Presiona Enter para cerrar..."
Read-Host
