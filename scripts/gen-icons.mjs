// Renders public/icon.svg into the PNG sizes the PWA manifest needs.
// Run once with `npm run icons` after changing the SVG.
import sharp from 'sharp'
import { mkdir, readFile } from 'node:fs/promises'

const svg = await readFile(new URL('../public/icon.svg', import.meta.url))
await mkdir(new URL('../public/icons', import.meta.url), { recursive: true })

const out = (name) => new URL(`../public/icons/${name}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')

await sharp(svg).resize(192, 192).png().toFile(out('icon-192.png'))
await sharp(svg).resize(512, 512).png().toFile(out('icon-512.png'))

// Maskable: same art on a full-bleed background with safe-zone padding.
const maskable = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0B0F14"/>
  <g transform="translate(76 76) scale(0.703)">
    <g fill="none" stroke="#C8F23D" stroke-width="34" stroke-linecap="round" stroke-linejoin="round">
      <path d="M136 256h240"/>
      <rect x="72" y="188" width="56" height="136" rx="14" fill="#C8F23D"/>
      <rect x="384" y="188" width="56" height="136" rx="14" fill="#C8F23D"/>
      <path d="M128 216v80M384 216v80"/>
      <path d="M40 232v48M472 232v48"/>
    </g>
  </g>
</svg>`)
await sharp(maskable).resize(512, 512).png().toFile(out('maskable-512.png'))

console.log('icons written to public/icons')
