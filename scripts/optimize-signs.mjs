import sharp from 'sharp'
import { readdir, stat, unlink } from 'node:fs/promises'
import { join } from 'node:path'

const DIR = 'public/signs'
const TARGET_WIDTH = 800   // 2x retina at 400px display
const QUALITY = 82

const files = (await readdir(DIR)).filter((f) => f.endsWith('.png'))
let totalBefore = 0
let totalAfter = 0

for (const file of files) {
  const src = join(DIR, file)
  const dst = join(DIR, file.replace(/\.png$/, '.webp'))

  const beforeSize = (await stat(src)).size
  totalBefore += beforeSize

  await sharp(src)
    .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 6 })
    .toFile(dst)

  const afterSize = (await stat(dst)).size
  totalAfter += afterSize

  console.log(
    `${file.padEnd(20)} ${(beforeSize / 1024).toFixed(0).padStart(5)} KB  →  ${(afterSize / 1024).toFixed(0).padStart(4)} KB  (${((1 - afterSize / beforeSize) * 100).toFixed(0)}% smaller)`,
  )

  await unlink(src)
}

console.log(
  `\nTotal: ${(totalBefore / 1024).toFixed(0)} KB → ${(totalAfter / 1024).toFixed(0)} KB  (saved ${((totalBefore - totalAfter) / 1024).toFixed(0)} KB / ${((1 - totalAfter / totalBefore) * 100).toFixed(0)}%)`,
)
