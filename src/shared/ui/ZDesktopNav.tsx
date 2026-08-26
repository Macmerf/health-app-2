'use client';

import React from 'react';
import { Home, BookOpen, TrendingUp, Smile, TreePine, BarChart3, Bell, Scan, Download, Sparkles, Settings, BookText } from 'lucide-react';
import { clsx } from 'clsx';
import { useRouterStore } from '@/shared/lib/stores';
import type { AppRoute } from '@/shared/lib/router';

/**
 * Десктопная навигация: горизонтальное меню сверху вместо нижнего таб-бара.
 * Показывается только на экранах lg+ (bottom nav скрыт через CSS).
 */

interface DesktopNavItem {
  route: AppRoute;
  label: string;
  icon: React.ReactNode;
}

const PRIMARY_ITEMS: DesktopNavItem[] = [
  { route: 'home', label: 'Главная', icon: <Home size={18} strokeWidth={1.5} /> },
  { route: 'journal', label: 'Дневник', icon: <BookOpen size={18} strokeWidth={1.5} /> },
  { route: 'exposure', label: 'Лестница', icon: <TrendingUp size={18} strokeWidth={1.5} /> },
  { route: 'mood', label: 'Настроение', icon: <Smile size={18} strokeWidth={1.5} /> },
  { route: 'care-tree', label: 'Дерево', icon: <TreePine size={18} strokeWidth={1.5} /> },
  { route: 'analytics', label: 'Аналитика', icon: <BarChart3 size={18} strokeWidth={1.5} /> },
  { route: 'body-scan', label: 'Body Scan', icon: <Scan size={18} strokeWidth={1.5} /> },
  { route: 'achievements', label: 'Достижения', icon: <Sparkles size={18} strokeWidth={1.5} /> },
  { route: 'notifications', label: 'Уведомления', icon: <Bell size={18} strokeWidth={1.5} /> },
  { route: 'export', label: 'Экспорт', icon: <Download size={18} strokeWidth={1.5} /> },
];

const SECONDARY_ITEMS: DesktopNavItem[] = [
  { route: 'paywall', label: 'ЗаботаPsy+', icon: <Sparkles size={18} strokeWidth={1.5} /> },
  { route: 'settings', label: 'Настройки', icon: <Settings size={18} strokeWidth={1.5} /> },
];

export function ZDesktopNav() {
  const route = useRouterStore((s) => s.route);
  const navigate = useRouterStore((s) => s.navigate);

  const renderItem = (item: DesktopNavItem) => {
    const active = route === item.route;
    return (
      <button
        key={item.route}
        onClick={() => navigate(item.route)}
        aria-current={active ? 'page' : undefined}
        className={clsx(
          'flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors',
          active
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        {item.icon}
        <span className="hidden xl:inline">{item.label}</span>
      </button>
    );
  };

  return (
    <nav
      className="sticky top-0 z-40 hidden lg:flex items-center gap-1 border-b border-border bg-card/80 backdrop-blur-md px-6 py-2"
      role="navigation"
      aria-label="Основная навигация (десктоп)"
    >
      {/* Логотип */}
      <button
        onClick={() => navigate('home')}
        className="flex items-center gap-2 mr-4 rounded-xl px-2 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
      >
        <span className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
          <span className="text-primary text-base leading-none">♥</span>
        </span>
        <span className="hidden md:inline">ЗаботаPsy</span>
      </button>

      {/* Основные разделы */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto">
        {PRIMARY_ITEMS.map(renderItem)}
      </div>

      {/* Второстепенные */}
      <div className="flex items-center gap-1">
        <a
          href="/articles"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <BookText size={18} strokeWidth={1.5} />
          <span className="hidden xl:inline">Статьи</span>
        </a>
        {SECONDARY_ITEMS.map(renderItem)}
      </div>
    </nav>
  );
}
