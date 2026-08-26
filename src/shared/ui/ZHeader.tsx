'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useRouterStore } from '@/shared/lib/stores';
import { clsx } from 'clsx';

const ROUTE_TITLES: Record<string, string> = {
  home: 'ЗаботаPsy',
  journal: 'История записей',
  'journal-new': 'Новая запись',
  exposure: 'Лестница смелости',
  'exposure-new': 'Новая лестница',
  'exposure-session': 'Сессия',
  'care-plan': 'План заботы',
  breathing: 'Дыхание',
  grounding: 'Заземление',
  achievements: 'Достижения',
  analytics: 'Аналитика',
  paywall: 'Премиум',
  settings: 'Настройки',
  notifications: 'Уведомления',
};

export interface ZHeaderProps {
  /** Override the auto-detected title */
  title?: string;
  className?: string;
}

export function ZHeader({ title, className }: ZHeaderProps) {
  const route = useRouterStore((s) => s.route);
  const back = useRouterStore((s) => s.back);
  const isHome = route === 'home';
  const displayTitle = title ?? ROUTE_TITLES[route] ?? 'ЗаботаPsy';

  return (
    <header
      className={clsx(
        'sticky top-0 z-30 flex h-14 items-center gap-3 px-4',
        'bg-background/80 backdrop-blur-md',
        className,
      )}
    >
      {!isHome && (
        <button
          onClick={back}
          className='flex items-center justify-center w-9 h-9 -ml-1 rounded-xl text-foreground hover:bg-muted transition-colors'
          aria-label='Назад'
        >
          <ArrowLeft size={24} strokeWidth={1.5} />
        </button>
      )}

      <h1
        className={clsx(
          'flex-1 text-lg font-semibold text-foreground truncate text-center',
          !isHome && 'pr-9', // offset back button width for centering
        )}
      >
        {displayTitle}
      </h1>

      {isHome && <div className='w-9' aria-hidden='true' />}{' '}
      {/* Spacer for centering */}
    </header>
  );
}
