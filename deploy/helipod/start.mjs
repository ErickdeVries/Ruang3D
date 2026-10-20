#!/usr/bin/env node
import { existsSync, accessSync, constants, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { delimiter, join } from 'node:path'

const root = fileURLToPath(new URL('../../', import.meta.url))
process.chdir(root)
if (process.argv.slice(2).some(arg => arg !== '--prepare')) {
  throw new Error('Usage: node deploy/helipod/start.mjs [--prepare]')
}
if (!existsSync(new URL('../../build/server/index.js', import.meta.url)) ||
    !existsSync(new URL('../../dist/index.html', import.meta.url))) {
  throw new Error('Build belum tersedia. Jalankan: bash deploy/helipod/install.sh')
}
const port = process.env.RUANG_PORT ?? process.env.PORT ?? '3001'
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  throw new Error('RUANG_PORT/PORT harus berupa nomor port 1–65535.')
}
process.env.RUANG_HOST ||= '0.0.0.0'
process.env.RUANG_PORT = port
// Check executable availability without running a Hermes operation or changing its state.
const hasHermes = (process.env.PATH || '').split(delimiter).some(directory => {
  try {
    const executable = join(directory || '.', 'hermes')
    accessSync(executable, constants.X_OK)
    return statSync(executable).isFile()
  } catch { return false }
})
if (!hasHermes) throw new Error('hermes tidak ditemukan di PATH. Jalankan sebagai user/container Hermes.')

const { AccessStore, generateCode } = await import('../../build/server/access.js')
const store = new AccessStore()
const state = await store.state()
if (state.enabled && state.broken) {
  throw new Error('Konfigurasi access code tidak dapat dibaca. Periksa permission RUANG_CONFIG_DIR.')
}
if (!state.enabled) {
  // Never put the generated code in source, environment files, or deployment archives.
  if (!process.stdout.isTTY) {
    throw new Error('Access code belum disiapkan. Dari terminal interaktif jalankan: node deploy/helipod/start.mjs --prepare')
  }
  const code = generateCode()
  await store.set(code)
  console.log(`Access code Ruang (simpan sekarang): ${code}`)
} else {
  console.log('Access code Ruang sudah aktif; kode lama dipertahankan.')
}
if (process.argv.includes('--prepare')) {
  console.log('Persiapan selesai. Jalankan: node deploy/helipod/start.mjs')
} else {
  console.log(`Menjalankan Ruang pada ${process.env.RUANG_HOST}:${port}`)
  await import('../../build/server/index.js')
}
