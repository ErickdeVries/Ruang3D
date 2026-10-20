#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$project_dir"
command -v node >/dev/null || { echo 'Node.js belum tersedia. Pasang Node.js 22+ pada image Hermes.' >&2; exit 1; }
command -v npm >/dev/null || { echo 'npm belum tersedia pada image Hermes.' >&2; exit 1; }
command -v hermes >/dev/null || { echo 'Jalankan di container dan user Hermes; hermes tidak ditemukan di PATH.' >&2; exit 1; }
node --input-type=module -e 'const [major, minor] = process.versions.node.split(".").map(Number); if (!(major > 22 || (major === 22 && minor >= 12) || (major === 20 && minor >= 19))) { console.error("Perlu Node.js 20.19+, 22.12+, atau versi lebih baru yang didukung Vite."); process.exit(1) }'
npm ci --include=dev
npm run build
echo 'Build selesai. Siapkan access code di terminal interaktif:'
echo 'node deploy/helipod/start.mjs --prepare'
