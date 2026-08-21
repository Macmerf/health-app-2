/**
 * Генератор PWA-иконок «Заботы».
 * Создаёт 4 PNG в public/icons: 192, 512 и maskable-варианты.
 * Запуск: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'icons');

const BRAND = '#7C9A8E'; // primary-цвет дизайн-системы

// Сердце в viewBox 0 0 100 100
const HEART_PATH =
  'M50,28 C50,18 35,13 25,23 C15,33 15,48 25,58 L50,83 L75,58 C85,48 85,33 75,23 C65,13 50,18 50,28 Z';

function svg(size, maskable) {
  const rx = maskable ? 0 : Math.round(size * 0.22);
  const heartSize = size * (maskable ? 0.46 : 0.58); // maskable: содержимое в safe zone 80%
  const scale = heartSize / 100;
  const cx = size / 2 - heartSize / 2;
  const cy = size / 2 - heartSize / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rx}" fill="${BRAND}"/>
  <g transform="translate(${cx} ${cy}) scale(${scale})">
    <path d="${HEART_PATH}" fill="#FFFFFF"/>
  </g>
</svg>`;
}

const icons = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-192.png', size: 192, maskable: true },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
];

mkdirSync(OUT, { recursive: true });

for (const icon of icons) {
  const buf = Buffer.from(svg(icon.size, icon.maskable));
  await sharp(buf).png().toFile(join(OUT, icon.file));
  process.stdout.write(`Generated ${icon.file}\n`);
}
