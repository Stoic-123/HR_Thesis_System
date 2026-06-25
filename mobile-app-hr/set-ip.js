const os = require('os');
const fs = require('fs');
const path = require('path');

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1'; // fallback
}

const ip = getLocalIpAddress();
const envPath = path.join(__dirname, '.env');
const apiUrl = `http://${ip}:8080`;

let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf-8');
}

// Regex to find EXPO_PUBLIC_API_URL and replace it, or append if not found
const regex = /^EXPO_PUBLIC_API_URL=.*$/m;

if (regex.test(envContent)) {
  envContent = envContent.replace(regex, `EXPO_PUBLIC_API_URL=${apiUrl}`);
} else {
  // If it doesn't end with a newline and is not empty, add a newline
  if (envContent && !envContent.endsWith('\n')) {
    envContent += '\n';
  }
  envContent += `EXPO_PUBLIC_API_URL=${apiUrl}\n`;
}

fs.writeFileSync(envPath, envContent);

console.log(`[set-ip.js] Updated .env EXPO_PUBLIC_API_URL to: ${apiUrl}`);
