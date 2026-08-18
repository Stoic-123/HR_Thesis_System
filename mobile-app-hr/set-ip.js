const os = require('os');
const fs = require('fs');
const path = require('path');

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  let candidateIps = [];

  for (const name of Object.keys(interfaces)) {
    const lowerName = name.toLowerCase();
    // Skip virtual adapters like Docker, WSL, vEthernet, VirtualBox
    if (lowerName.includes('docker') || lowerName.includes('wsl') || lowerName.includes('veth') || lowerName.includes('virtualbox') || lowerName.includes('vmnet')) {
      continue;
    }

    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const addr = iface.address;

        // 1. Highest Priority: iPhone Personal Hotspot (172.20.10.x)
        if (addr.startsWith('172.20.10.')) {
          return addr;
        }
        // 2. High Priority: Android Personal Hotspot (192.168.43.x / 192.168.45.x)
        if (addr.startsWith('192.168.43.') || addr.startsWith('192.168.45.')) {
          return addr;
        }

        // Wi-Fi or Tethering interface
        if (lowerName.includes('wi-fi') || lowerName.includes('wifi') || lowerName.includes('wireless') || lowerName.includes('ethernet') || lowerName.includes('tether')) {
          candidateIps.unshift(addr);
        } else {
          candidateIps.push(addr);
        }
      }
    }
  }

  return candidateIps.length > 0 ? candidateIps[0] : '127.0.0.1';
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
  if (envContent && !envContent.endsWith('\n')) {
    envContent += '\n';
  }
  envContent += `EXPO_PUBLIC_API_URL=${apiUrl}\n`;
}

// Set REACT_NATIVE_PACKAGER_HOSTNAME so Expo CLI binds directly to hotspot IP
const packagerRegex = /^REACT_NATIVE_PACKAGER_HOSTNAME=.*$/m;
if (packagerRegex.test(envContent)) {
  envContent = envContent.replace(packagerRegex, `REACT_NATIVE_PACKAGER_HOSTNAME=${ip}`);
} else {
  envContent += `REACT_NATIVE_PACKAGER_HOSTNAME=${ip}\n`;
}

fs.writeFileSync(envPath, envContent);
process.env.REACT_NATIVE_PACKAGER_HOSTNAME = ip;
process.env.EXPO_OFFLINE = '1';

console.log(`[set-ip.js] Updated .env EXPO_PUBLIC_API_URL to: ${apiUrl}`);
console.log(`[set-ip.js] Set REACT_NATIVE_PACKAGER_HOSTNAME to: ${ip}`);
console.log(`[set-ip.js] Enabled EXPO_OFFLINE mode`);
