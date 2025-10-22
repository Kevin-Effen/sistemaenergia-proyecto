const os = require('os');
const qrcode = require('qrcode-terminal');

/**
 * Obtiene la dirección IP de la red local (no localhost ni VirtualBox)
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
 * Muestra información de conexión con código QR
 */
function showConnectionInfo(port, serviceName = 'Backend') {
  const localIP = getLocalIPAddress();
  const localURL = `http://localhost:${port}`;
  const networkURL = `http://${localIP}:${port}`;
  
  console.log('\n' + '='.repeat(60));
  console.log(`🚀 ${serviceName} - Sistema de Energía Eólica`);
  console.log('='.repeat(60));
  console.log(`\n📍 Acceso Local (PC):`);
  console.log(`   ${localURL}`);
  console.log(`\n📱 Acceso desde Móvil (misma red WiFi):`);
  console.log(`   ✨ ${networkURL} ✨`);
  console.log(`\n📊 IP de red detectada: ${localIP}`);
  console.log('\n' + '-'.repeat(60));
  console.log('📲 Código QR (escanea con tu móvil):');
  console.log('-'.repeat(60));
  
  // Generar QR compacto
  try {
    qrcode.generate(networkURL, { small: true });
  } catch (e) {
    console.log('⚠️  El QR no se pudo mostrar. Usa la URL de arriba ⬆️');
  }
  
  console.log('-'.repeat(60));
  console.log(`✅ Servidor corriendo correctamente`);
  console.log(`⏰ ${new Date().toLocaleString('es-BO')}`);
  console.log('='.repeat(60) + '\n');
  console.log('💡 Tip: Si el QR no se ve completo, amplía la ventana de la terminal');
  console.log(`💡 O usa esta URL directamente: ${networkURL}\n`);
}

module.exports = { getLocalIPAddress, showConnectionInfo };
