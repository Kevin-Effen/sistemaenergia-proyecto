const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { showConnectionInfo } = require('./url-helper');

/**
 * Obtiene la dirección IP de la red local
 */
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && 
          !iface.internal && 
          !name.includes('VirtualBox') &&
          !name.includes('VMware') &&
          !name.includes('Hyper-V') &&
          (iface.address.startsWith('192.168.') || 
           iface.address.startsWith('10.') ||
           iface.address.startsWith('172.'))) {
        return iface.address;
      }
    }
  }
  
  return 'localhost';
}

/**
 * Configura el archivo .env.local con la IP actual
 */
function setupEnvironment() {
  const localIP = getLocalIPAddress();
  const envContent = `# Auto-generado - No editar manualmente
# Se regenera cada vez que inicias el servidor

# Backend API URL (detectado automáticamente)
REACT_APP_API_BASE=http://${localIP}:3001

# Para forzar localhost, edita y comenta la línea de arriba
# REACT_APP_API_BASE=http://localhost:3001
`;

  const envPath = path.join(__dirname, '.env.local');
  fs.writeFileSync(envPath, envContent, 'utf-8');
  
  console.log('\n✅ Configuración automática:');
  console.log(`   Backend URL: http://${localIP}:3001`);
  console.log(`   Archivo .env.local actualizado\n`);
  
  return localIP;
}

/**
 * Inicia el servidor React
 */
function startReactServer() {
  console.log('🚀 Iniciando servidor React...\n');
  
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'npm.cmd' : 'npm';
  
  // Configurar variables de entorno
  const env = { ...process.env };
  env.HOST = '0.0.0.0'; // Permitir acceso desde red
  env.BROWSER = 'none'; // No abrir navegador automáticamente
  
  const reactProcess = spawn(command, ['start'], {
    stdio: 'inherit',
    shell: true,
    env: env
  });
  
  reactProcess.on('error', (error) => {
    console.error('❌ Error al iniciar React:', error);
    process.exit(1);
  });
  
  reactProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ React se detuvo con código ${code}`);
    }
    process.exit(code);
  });
  
  // Esperar un poco y mostrar la URL
  setTimeout(() => {
    showConnectionInfo(3000, 'Frontend React');
  }, 5000);
}

// Ejecutar
console.log('='.repeat(60));
console.log('🌐 Sistema de Energía Eólica - Inicio con Red Dinámica');
console.log('   (Modo URL - Sin QR)');
console.log('='.repeat(60));

const localIP = setupEnvironment();
startReactServer();

// Manejar cierre limpio
process.on('SIGINT', () => {
  console.log('\n\n👋 Cerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Cerrando servidor...');
  process.exit(0);
});
