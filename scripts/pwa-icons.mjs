// Renders the PWA icons in public/icons/ from the Roster sigil.
// Run after changing the mark:  npm run icons
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const OUT = new URL('../public/icons/', import.meta.url)

/**
 * The sigil from TopBar.tsx (32-unit grid) on a dark tile.
 * `maskable` fills the whole square and keeps the mark inside the 80% safe circle,
 * so platforms that crop icons into their own shape don't cut it off.
 */
function icon({ maskable = false } = {}) {
  const scale = maskable ? 10 : 12.8
  const tile = maskable
    ? '<rect width="512" height="512" fill="url(#bg)"/>'
    : '<rect width="512" height="512" rx="112" fill="url(#bg)"/>' +
      '<rect x="3" y="3" width="506" height="506" rx="109" fill="none" stroke="#fff" stroke-opacity=".07" stroke-width="6"/>'

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="28%" r="85%">
      <stop offset="0" stop-color="#1c1923"/>
      <stop offset="1" stop-color="#08080b"/>
    </radialGradient>
    <radialGradient id="glow">
      <stop offset="0" stop-color="#d4a857" stop-opacity=".32"/>
      <stop offset="1" stop-color="#d4a857" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="2" x2="0" y2="30" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#f0d08a"/>
      <stop offset="1" stop-color="#b8893b"/>
    </linearGradient>
  </defs>
  ${tile}
  <circle cx="256" cy="256" r="${maskable ? 190 : 230}" fill="url(#glow)"/>
  <g transform="translate(256 256) scale(${scale}) translate(-16 -16)" fill="none" stroke-linejoin="round">
    <path d="M16 2 L28 16 L16 30 L4 16 Z" stroke="url(#gold)" stroke-width="1.5"/>
    <path d="M16 8 L22.5 16 L16 24 L9.5 16 Z" fill="url(#gold)"/>
    <path d="M16 2 V8 M16 24 V30 M4 16 H9.5 M22.5 16 H28" stroke="url(#gold)" stroke-width="1" opacity=".6"/>
  </g>
</svg>`
}

const targets = [
  ...[48, 96, 192, 256, 512].map((size) => ({ file: `icon-${size}.png`, size, svg: icon() })),
  { file: 'maskable-512.png', size: 512, svg: icon({ maskable: true }) },
]

await mkdir(OUT, { recursive: true })
for (const t of targets) {
  await sharp(Buffer.from(t.svg), { density: 72 * (t.size / 512) * 4 })
    .resize(t.size, t.size)
    .png({ compressionLevel: 9 })
    .toFile(fileURLToPath(new URL(t.file, OUT)))
  console.log(`  public/icons/${t.file}`)
}
