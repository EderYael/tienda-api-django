#!/usr/bin/env node
/**
 * Arranca "expo start" forzando la IP de LAN correcta automáticamente.
 *
 * Por qué existe: en VMs con varias tarjetas de red (ej. una interfaz NAT
 * interna tipo 10.0.3.x además de la LAN real 192.168.x.x), Expo a veces
 * detecta la interfaz equivocada y el celular no puede conectarse. Este
 * script busca la IP que empiece con 192.168. (o 10.0.0-2.x, evitando la
 * 10.0.3.x típica de NAT de virtualización) y arranca Expo con
 * REACT_NATIVE_PACKAGER_HOSTNAME ya puesto, para no tener que escribirlo
 * a mano cada vez que la IP cambie.
 *
 * Uso: npm run start:lan
 */
const os = require('os')
const { spawn } = require('child_process')

function elegirMejorIp() {
  const interfaces = os.networkInterfaces()
  const candidatas = []

  for (const nombre of Object.keys(interfaces)) {
    for (const info of interfaces[nombre]) {
      if (info.family === 'IPv4' && !info.internal) {
        candidatas.push(info.address)
      }
    }
  }

  // Prioridad: 192.168.x.x (LAN típica de casa/oficina) primero,
  // luego cualquier otra que no sea el rango de NAT interno común (10.0.3.x).
  const deCasa = candidatas.find((ip) => ip.startsWith('192.168.'))
  if (deCasa) return deCasa

  const noNatInterno = candidatas.find((ip) => !ip.startsWith('10.0.3.'))
  if (noNatInterno) return noNatInterno

  return candidatas[0] || null
}

const ip = elegirMejorIp()

if (!ip) {
  console.error('No se encontró ninguna IP de red. Revisa tu conexión.')
  process.exit(1)
}

console.log(`→ Usando IP de LAN: ${ip}`)

const hijo = spawn('npx', ['expo', 'start'], {
  stdio: 'inherit',
  env: { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: ip },
  shell: true,
})

hijo.on('exit', (code) => process.exit(code))
