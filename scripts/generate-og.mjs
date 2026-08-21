/**
 * Генератор OG-обложки «Заботы» для соцсетей и мессенджеров.
 * Создаёт public/og/cover.png (1200x630) с логотипом и названием.
 * Запуск: node scripts/generate-og.mjs
 */
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'og');

const W = 1200;
const H = 630;
const BG = '#FAF9F7';
const PRIMARY = '#7C9A8E';
const TEXT = '#2D2C2A';

const HEART_PATH =
  'M50,28 C50,18 35,13 25,23 C15,33 15,48 25,58 L50,83 L75,58 C85,48 85,33 75,23 C65,13 50,18 50,28 Z';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="42%" r="60%">
      <stop offset="0%" stop-color="#7C9A8E" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#7C9A8E" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="${BG}"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- Абстрактные органические формы -->
  <ellipse cx="980" cy="120" rx="220" ry="140" fill="#C4A882" opacity="0.25"/>
  <ellipse cx="180" cy="560" rx="260" ry="150" fill="#9B8EC4" opacity="0.18"/>
  <ellipse cx="1120" cy="560" rx="160" ry="110" fill="#D4887C" opacity="0.16"/>

  <!-- Логотип-сердце -->
  <g transform="translate(150 155) scale(2.6)">
    <path d="${HEART_PATH}" fill="${PRIMARY}"/>
  </g>

  <!-- Название -->
  <text x="430" y="330" font-family="'Onest', 'Segoe UI', Arial, sans-serif" font-size="72" font-weight="600" fill="${TEXT}">Забота</text>
  <text x="430" y="400" font-family="'Onest', 'Segoe UI', Arial, sans-serif" font-size="32" font-weight="400" fill="#6B6A68">поддержка при тревоге</text>

  <!-- Фичи -->
  <text x="430" y="480" font-family="'Onest', 'Segoe UI', Arial, sans-serif" font-size="26" fill="#6B6A68">Дневник мыслей · Лестница смелости · План заботы</text>
  <text x="430" y="525" font-family="'Onest', 'Segoe UI', Arial, sans-serif" font-size="24" fill="${PRIMARY}" font-weight="500">Работает офлайн · Базовые функции бесплатно</text>
</svg>`;

mkdirSync(OUT, { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(join(OUT, 'cover.png'));
process.stdout.write('Generated public/og/cover.png\n');
