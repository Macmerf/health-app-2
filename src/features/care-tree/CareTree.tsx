'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ZCard } from '@/shared/ui/ZCard';
import { FeatureGate } from '@/features/payments';
import { useCareTreeStore } from '@/shared/lib/stores';

const LEVELS = [
  { min: 0, name: 'Семечко', desc: 'Начни практиковать — и семечко вырастет' },
  { min: 2, name: 'Росток', desc: '2 практики — росток проклёвывается' },
  { min: 7, name: 'Молодое деревце', desc: 'Неделя заботы о себе' },
  { min: 20, name: 'Деревце', desc: '20 практик — дерево окрепло' },
  { min: 50, name: 'Раскидистое дерево', desc: '50 практик — ты заботишься о себе регулярно' },
  { min: 100, name: 'Цветущее дерево', desc: '100 практик — твоя забота расцветает' },
];

function TreeSVG({ level, totalPractices }: { level: number; totalPractices: number }) {
  const trunkH = 30 + level * 10;
  const crownR = 15 + level * 15;
  const crownY = 100 - trunkH - crownR + 10;

  const hasFlowers = level >= 4;
  const hasFruits = level >= 5;

  // Динамический viewBox: крона растёт вверх и вширь, поэтому фиксированный
  // viewBox обрезает её на высоких уровнях. Вычисляем границы по фактическому
  // содержимому и добавляем небольшой отступ.
  const pad = 12;
  const vbTop = level === 0 ? 50 : crownY - crownR - pad;
  const vbBottom = 200;
  const vbLeft = level === 0 ? 40 : 100 - crownR * 1.25 - pad;
  const vbRight = level === 0 ? 160 : 100 + crownR * 1.25 + pad;
  const viewBox = `${vbLeft} ${vbTop} ${vbRight - vbLeft} ${vbBottom - vbTop}`;

  return (
    <svg viewBox={viewBox} className='w-full max-w-[240px] mx-auto'>
      {/* Земля */}
      <ellipse cx='100' cy='185' rx='60' ry='8' fill='var(--color-sand)' opacity='0.3' />

      {/* Ствол */}
      <rect
        x='93' y={100 - trunkH}
        width='14'
        height={trunkH}
        rx='4'
        fill='#8B6F4E'
        opacity={0.6 + level * 0.08}
      />

      {/* Ветви (уровень 2+) */}
      {level >= 2 && (
        <>
          <line x1='100' y1={100 - trunkH + 10} x2='65' y2={crownY + 15} stroke='#8B6F4E' strokeWidth='3' strokeLinecap='round' opacity='0.5' />
          <line x1='100' y1={100 - trunkH + 15} x2='135' y2={crownY + 10} stroke='#8B6F4E' strokeWidth='3' strokeLinecap='round' opacity='0.5' />
        </>
      )}

      {/* Крона */}
      {level === 0 ? (
        <circle cx='100' cy='100' r='8' fill='var(--color-sand)' opacity='0.5' />
      ) : (
        <>
          <circle cx='100' cy={crownY} r={crownR} fill='var(--color-primary)' opacity='0.25' />
              <circle cx={100 - crownR * 0.5} cy={crownY + crownR * 0.3} r={crownR * 0.7} fill='var(--color-primary)' opacity='0.3' />
          <circle cx={100 + crownR * 0.5} cy={crownY + crownR * 0.2} r={crownR * 0.75} fill='var(--color-primary)' opacity='0.3' />
          <circle cx='100' cy={crownY - crownR * 0.3} r={crownR * 0.6} fill='var(--color-primary)' opacity='0.35' />
        </>
      )}

      {/* Цветы */}
      {hasFlowers && (
        <>
          {[...Array(level >= 5 ? 8 : 4)].map((_, i) => {
            const angle = (i / (level >= 5 ? 8 : 4)) * Math.PI * 2;
            const r = crownR * 0.7;
            const cx = 100 + Math.cos(angle) * r;
            const cy = crownY + Math.sin(angle) * r * 0.6;
            return (
              <circle key={i} cx={cx} cy={cy} r='4' fill='var(--color-terracotta)' opacity='0.8'>
                <animate attributeName='r' values='3;5;3' dur={`${2 + i * 0.3}s`} repeatCount='indefinite' />
              </circle>
            );
          })}
        </>
      )}

      {/* Плоды */}
      {hasFruits && (
        <>
          {[...Array(5)].map((_, i) => {
            const angle = (i / 5) * Math.PI * 2 + 0.5;
            const r = crownR * 0.5;
            const cx = 100 + Math.cos(angle) * r;
            const cy = crownY + Math.sin(angle) * r * 0.6 + 5;
            return (
              <circle key={i} cx={cx} cy={cy} r='5' fill='var(--color-secondary)' opacity='0.9' />
            );
          })}
        </>
      )}

      {/* Счётчик */}
      <text x='100' y='198' textAnchor='middle' className='text-[10px]' fill='var(--color-muted-foreground)'>
        {totalPractices} практик
      </text>
    </svg>
  );
}

export function CareTree() {
  const totalPractices = useCareTreeStore((s) => s.totalPractices);
  const getLevel = useCareTreeStore((s) => s.getLevel);
  const level = getLevel();
  const info = LEVELS[level];
  const nextLevel = LEVELS[level + 1];
  const progress = nextLevel
    ? Math.min(100, ((totalPractices - info.min) / (nextLevel.min - info.min)) * 100)
    : 100;

  return (
    <FeatureGate featureKey='care_tree'>
      <div className='space-y-6'>
        <ZCard className='text-center space-y-3'>
          <p className='text-sm font-medium text-foreground'>Дерево заботы</p>
          <p className='text-xs text-muted-foreground'>Каждая практика помогает дереву расти</p>
          <TreeSVG level={level} totalPractices={totalPractices} />
          <div>
            <p className='text-base font-semibold text-foreground'>{info.name}</p>
            <p className='text-xs text-muted-foreground mt-0.5'>{info.desc}</p>
          </div>
          {nextLevel && (
            <div className='space-y-1.5'>
              <div className='flex justify-between text-xs text-muted-foreground'>
                <span>{info.min}</span>
                <span>{nextLevel.min}</span>
              </div>
              <div className='h-2 rounded-full bg-muted overflow-hidden'>
                <motion.div
                  className='h-full rounded-full bg-primary'
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1.0] }}
                />
              </div>
              <p className='text-xs text-muted-foreground'>
                До «{nextLevel.name}» осталось {nextLevel.min - totalPractices} практик
              </p>
            </div>
          )}
        </ZCard>

        <p className='text-xs text-muted-foreground text-center'>
          Дыхание, заземление, записи в дневник, сессии лестницы смелости — всё считается
        </p>
      </div>
    </FeatureGate>
  );
}
