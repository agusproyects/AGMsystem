// Genera los iconos PWA a partir de public/source-logo.png
// Output: public/icon-192.png, icon-512.png, icon-maskable-512.png, favicon.png
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root      = path.join(__dirname, '..')
const SRC       = path.join(root, 'public', 'source-logo.png')
const OUT       = path.join(root, 'public')

// Fondo blanco para que el logo (azul) sea visible en cualquier launcher.
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }

async function flat(size, bg) {
  // Logo con padding pequeño (10%) sobre fondo `bg`.
  const inner = Math.round(size * 0.80)
  const pad   = Math.round((size - inner) / 2)
  const logo  = await sharp(SRC)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()
  return sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: logo, top: pad, left: pad }])
    .png()
    .toBuffer()
}

async function maskable(size, bg) {
  // Para maskable, el logo va al 60% del canvas (safe area más generosa).
  const inner = Math.round(size * 0.60)
  const pad   = Math.round((size - inner) / 2)
  const logo  = await sharp(SRC)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()
  return sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: logo, top: pad, left: pad }])
    .png()
    .toBuffer()
}

const targets = [
  { name: 'icon-192.png',          buf: () => flat(192, WHITE) },
  { name: 'icon-512.png',          buf: () => flat(512, WHITE) },
  { name: 'icon-maskable-512.png', buf: () => maskable(512, WHITE) },
  { name: 'favicon.png',           buf: () => flat(64, WHITE) },
]

for (const t of targets) {
  const buf = await t.buf()
  const dst = path.join(OUT, t.name)
  await sharp(buf).toFile(dst)
  console.log(`✓ ${t.name}`)
}
console.log('Listo.')
