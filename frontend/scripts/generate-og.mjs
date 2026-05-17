import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svgPath = resolve(__dirname, '../public/og-cover.svg')
const outPath = resolve(__dirname, '../public/og-cover.png')

const svg = readFileSync(svgPath)
const png = await sharp(svg).png().toBuffer()
writeFileSync(outPath, png)
console.log(`Generated ${outPath} (${(png.length / 1024).toFixed(1)} KB)`)
