import { mkdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

const BRAND_ORANGE = '#FF5A1F'

const faviconSvg = await readFile(join(publicDir, 'favicon.svg'), 'utf8')

const faviconOrangeSvg = faviconSvg.replace(/currentColor/g, BRAND_ORANGE)

async function renderPng(svg, size, outputPath) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outputPath)
}

await mkdir(join(publicDir, 'icons'), { recursive: true })

await renderPng(faviconOrangeSvg, 16, join(publicDir, 'icons', 'favicon-16.png'))
await renderPng(faviconOrangeSvg, 32, join(publicDir, 'icons', 'favicon-32.png'))

const icon512Svg = await readFile(join(publicDir, 'icon-512.svg'), 'utf8')
await renderPng(icon512Svg, 512, join(publicDir, 'icon-512.png'))
await renderPng(icon512Svg, 512, join(publicDir, 'og-image.png'))

await sharp(join(publicDir, 'icon-512.png'))
  .resize(180, 180)
  .png()
  .toFile(join(publicDir, 'apple-touch-icon.png'))

console.log('Brand icons generated in public/')
