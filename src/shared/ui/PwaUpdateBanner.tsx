'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { ZButton } from './ZButton';
import { usePwaUpdate } from '@/shared/lib/use-pwa-update';

/**
 * Ненавязчивый баннер «Доступна новая версия».
 * Появляется, когда после деплоя новый service worker установлен и ждёт
 * активации. По кнопке «Обновить» — применяет и перезагружает приложение.
 */
export function PwaUpdateBanner() {
  const { updateReady, applyUpdate } = usePwaUpdate();

  return (
    <AnimatePresence>
      {updateReady && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
          className='fixed left-4 right-4 bottom-24 lg:bottom-6 lg:left-auto lg:right-6 z-[60] flex justify-center lg:justify-end pointer-events-none'
        >
          <div
            className='pointer-events-auto flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-soft-lg max-w-sm'
            role='status'
          >
            <RefreshCw size={18} strokeWidth={1.5} className='text-primary shrink-0' />
            <p className='flex-1 text-sm text-foreground leading-snug'>
              Доступна новая версия приложения
            </p>
            <ZButton variant='primary' size='sm' onClick={applyUpdate}>
              Обновить
            </ZButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
