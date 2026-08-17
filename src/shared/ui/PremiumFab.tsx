'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useRouterStore } from '@/shared/lib/stores';
import { usePaymentStore } from '@/features/payments';

export function PremiumFab() {
  const navigate = useRouterStore((s) => s.navigate);
  const isPremium = usePaymentStore((s) => s.isPremium);

  if (isPremium()) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 1.5, ease: [0.25, 0.1, 0.25, 1.0] }}
      onClick={() => navigate('paywall')}
      className='fixed bottom-20 left-5 z-40 flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1.5 shadow-soft hover:bg-primary/15 active:scale-95 transition-all'
      aria-label='Забота+'
    >
      <Sparkles size={14} strokeWidth={2} />
      <span className='text-xs font-semibold'>+</span>
    </motion.button>
  );
}
