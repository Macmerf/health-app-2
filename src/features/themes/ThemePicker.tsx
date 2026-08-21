'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ZCard } from '@/shared/ui/ZCard';
import { ZBadge } from '@/shared/ui/ZBadge';
import { useThemeStore } from '@/shared/lib/stores';
import type { ThemeOption } from '@/shared/schemas';
import { Check } from 'lucide-react';
import { useRouterStore } from '@/shared/lib/stores';

const THEMES: (ThemeOption & { premium?: boolean })[] = [
  { id: 'light', name: 'Светлая', description: 'Классическая светлая тема', preview: { bg: '#FAF9F7', primary: '#7C9A8E', accent: '#C4A882' } },
  { id: 'dark', name: 'Тёмная', description: 'Комфортная для вечера и ночи', preview: { bg: '#1C1B1A', primary: '#7C9A8E', accent: '#C4A882' } },
  { id: 'warm', name: 'Тёплая', description: 'Уютные терракотовые тона', preview: { bg: '#FBF7F0', primary: '#C47F5A', accent: '#D4A574' }, premium: true },
  { id: 'forest', name: 'Лесная', description: 'Спокойные зелёные оттенки', preview: { bg: '#F4F7F2', primary: '#4A7C59', accent: '#7BAF6E' }, premium: true },
  { id: 'ocean', name: 'Океан', description: 'Глубокие голубые тона', preview: { bg: '#F2F6FA', primary: '#4A7B9C', accent: '#6BA3C4' }, premium: true },
];

export function ThemePicker() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const navigate = useRouterStore((s) => s.navigate);

  return (
    <div className='space-y-5'>
      <p className='text-sm font-medium text-foreground'>Выбери оформление</p>
      <p className='text-xs text-muted-foreground'>Уютный интерфейс снижает напряжение</p>

      <div className='space-y-3'>
        {THEMES.map((t) => {
          const isActive = theme === t.id;
          const isLocked = t.premium;

          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
            >
              <ZCard
                className={`flex items-center gap-4 cursor-pointer transition-all ${isActive ? 'ring-2 ring-primary/40' : ''}`}
                onClick={() => {
                  if (isLocked) {
                    navigate('paywall');
                    return;
                  }
                  setTheme(t.id);
                }}
              >
                {/* Превью */}
                <div
                  className='w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center'
                  style={{ backgroundColor: t.preview.bg, border: `2px solid ${t.preview.primary}30` }}
                >
                  <div className='flex gap-1'>
                    <div className='w-4 h-4 rounded-full' style={{ backgroundColor: t.preview.primary }} />
                    <div className='w-4 h-4 rounded-full' style={{ backgroundColor: t.preview.accent }} />
                  </div>
                </div>

                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2'>
                    <p className='text-sm font-medium text-foreground'>{t.name}</p>
                    {isActive && <Check size={14} className='text-primary' strokeWidth={3} />}
                    {isLocked && <ZBadge variant='primary' className='text-[10px] px-1.5 py-0'>+</ZBadge>}
                  </div>
                  <p className='text-xs text-muted-foreground mt-0.5'>{t.description}</p>
                </div>
              </ZCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
