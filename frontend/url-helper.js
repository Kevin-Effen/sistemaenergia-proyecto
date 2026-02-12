const os = require('os');

/**
 * Obtiene la dirección IP de la red local
 */
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  
  // Prioridad 1: Buscar WiFi específicamente
  for (const name of Object.keys(interfaces)) {
    if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('wifi')) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  }
  
  // Prioridad 2: Buscar Ethernet que no sea VirtualBox
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && 
          !iface.internal && 
          !name.includes('VirtualBox') &&
          !name.includes('VMware') &&
          !name.includes('Hyper-V') &&
          iface.address.startsWith('192.168.0.')) {
        return iface.address;
      }
    }
  }
  
  // Prioridad 3: Cualquier red local que no sea VirtualBox
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && 
          !iface.internal && 
          !name.includes('VirtualBox') &&
          !name.includes('VMware') &&
          iface.address.startsWith('192.168.')) {
        return iface.address;
      }
    }
  }
  
  return 'localhost';
}

/**
 * Muestra información de conexión SIN QR (solo URLs)
 */
function showConnectionInfo(port, serviceName = 'Frontend') {
  const localIP = getLocalIPAddress();
  const localURL = `http://localhost:${port}`;
  const networkURL = `http://${localIP}:${port}`;
  
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' '.repeat(20) + `🚀 ${serviceName} - Sistema de Energía Eólica` + ' '.repeat(19) + '║');
  console.log('╠' + '═'.repeat(78) + '╣');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('║  📍 Acceso desde tu PC:' + ' '.repeat(54) + '║');
  console.log('║     ' + localURL.padEnd(73) + '║');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('║  📱 Acceso desde tu MÓVIL (copia esta URL):' + ' '.repeat(34) + '║');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('║     ┌─────────────────────────────────────────────────────────────────┐  ║');
  console.log('║     │  ' + networkURL.padEnd(66) + '│  ║');
  console.log('║     └─────────────────────────────────────────────────────────────────┘  ║');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('║  📊 IP de red detectada: ' + localIP.padEnd(52) + '║');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('╠' + '═'.repeat(78) + '╣');
  console.log('║  💡 PASOS PARA CONECTAR DESDE TU MÓVIL:' + ' '.repeat(38) + '║');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('║     1️⃣  Conecta tu móvil a la MISMA red WiFi que tu PC' + ' '.repeat(23) + '║');
  console.log('║     2️⃣  Abre el navegador en tu móvil (Chrome, Safari, etc.)' + ' '.repeat(18) + '║');
  console.log('║     3️⃣  Escribe la URL de arriba en la barra de direcciones' + ' '.repeat(19) + '║');
  console.log('║     4️⃣  ¡Listo! Verás el sistema funcionando' + ' '.repeat(33) + '║');
  console.log('║' + ' '.repeat(78) + '║');
  console.log('╠' + '═'.repeat(78) + '╣');
  console.log('║  ✅ Servidor corriendo correctamente' + ' '.repeat(41) + '║');
  console.log('║  ⏰ ' + new Date().toLocaleString('es-BO').padEnd(73) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('\n');
}

module.exports = { getLocalIPAddress, showConnectionInfo };
