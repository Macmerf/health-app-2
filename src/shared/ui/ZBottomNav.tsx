'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Home, BookOpen, TrendingUp, User, Settings, Sparkles, Smile, TreePine, BarChart3, Bell, Download, Scan } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useRouterStore, useThemeStore } from '@/shared/lib/stores';
import { usePaymentStore } from '@/features/payments';
import type { AppRoute } from '@/shared/lib/router';

interface NavItem {
  route: AppRoute;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { route: 'home', label: 'Главная', icon: <Home size={24} strokeWidth={1.5} /> },
  { route: 'journal', label: 'Дневник', icon: <BookOpen size={24} strokeWidth={1.5} /> },
  { route: 'exposure', label: 'Лестница', icon: <TrendingUp size={24} strokeWidth={1.5} /> },
];

const MENU_ITEMS = [
  { route: 'mood' as AppRoute, label: 'Журнал настроения', icon: <Smile size={20} strokeWidth={1.5} />, premium: true },
  { route: 'care-tree' as AppRoute, label: 'Дерево заботы', icon: <TreePine size={20} strokeWidth={1.5} />, premium: true },
  { route: 'analytics' as AppRoute, label: 'Аналитика', icon: <BarChart3 size={20} strokeWidth={1.5} />, premium: true },
  { route: 'body-scan' as AppRoute, label: 'Сканирование тела', icon: <Scan size={20} strokeWidth={1.5} />, premium: true },
  { route: 'notifications' as AppRoute, label: 'Уведомления', icon: <Bell size={20} strokeWidth={1.5} />, premium: true },
  { route: 'export' as AppRoute, label: 'Экспорт данных', icon: <Download size={20} strokeWidth={1.5} />, premium: true },
  { route: 'paywall' as AppRoute, label: 'Забота+', icon: <Sparkles size={20} strokeWidth={1.5} />, premium: false },
  { route: 'settings' as AppRoute, label: 'Настройки', icon: <Settings size={20} strokeWidth={1.5} />, premium: false },
];

export function ZBottomNav() {
  const route = useRouterStore((s) => s.route);
  const navigate = useRouterStore((s) => s.navigate);
  const theme = useThemeStore((s) => s.theme);
  const toggleDarkLight = useThemeStore((s) => s.toggleDarkLight);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [menuOpen]);

  const handleNav = (itemRoute: AppRoute) => {
    navigate(itemRoute);
  };

  const isActive = (itemRoute: AppRoute) => route === itemRoute;

  return (
    <nav
      className='fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card safe-bottom'
      role='navigation'
      aria-label='Основная навигация'
    >
      <div className='flex items-center justify-around px-2 pt-2 pb-2'>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.route);
          return (
            <button
              key={item.route}
              onClick={() => handleNav(item.route)}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'relative flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 transition-colors duration-200',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {item.icon}
              <span className='text-[11px] font-medium leading-tight'>{item.label}</span>
            </button>
          );
        })}

        {/* Profile button with menu */}
        <div className='relative' ref={menuRef}>
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-haspopup='true'
            className={clsx(
              'relative flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 transition-colors duration-200',
              'text-muted-foreground',
            )}
          >
            <User size={24} strokeWidth={1.5} />
            <span className='text-[11px] font-medium leading-tight'>Ещё</span>
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1.0] }}
                className='absolute bottom-full right-0 mb-2 w-56 rounded-2xl border border-border bg-card p-1.5 shadow-soft-lg max-h-[70vh] overflow-y-auto'
                role='menu'
              >
                {MENU_ITEMS.map((item) => (
                  <button
                    key={item.route}
                    role='menuitem'
                    onClick={() => {
                      navigate(item.route);
                      setMenuOpen(false);
                    }}
                    className='flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors'
                  >
                    <span className={item.premium ? 'text-primary' : 'text-muted-foreground'}>{item.icon}</span>
                    <span className='flex-1 text-left'>{item.label}</span>
                    {item.premium && (
                      <span className='text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md'>+</span>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}
