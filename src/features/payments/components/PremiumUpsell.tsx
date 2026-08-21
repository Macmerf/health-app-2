'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { ZCard } from '@/shared/ui/ZCard';
import { ZButton } from '@/shared/ui/ZButton';
import { ZBadge } from '@/shared/ui/ZBadge';
import { useRouterStore } from '@/shared/lib/stores';
import { texts } from '@/shared/constants/texts';

interface PremiumUpsellProps {
  variant?: 'card' | 'banner';
}

const HIGHLIGHT_FEATURES = [
  texts.paywall.features[0], // Аналитика прогресса
  texts.paywall.features[3], // Расширенная галерея достижений
  texts.paywall.features[4], // Экспорт данных для терапевта
];

export function PremiumUpsell({ variant = 'card' }: PremiumUpsellProps) {
  const navigate = useRouterStore((s) => s.navigate);

  if (variant === 'banner') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1.0] }}
      >
        <ZCard className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Sparkles size={20} className="text-primary" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate">
                  {texts.common.premium}
                </p>
                <ZBadge variant="primary">{texts.paywall.price}</ZBadge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {texts.paywall.valueProp}
              </p>
            </div>
            <ZButton
              variant="secondary"
              size="sm"
              onClick={() => navigate('paywall')}
            >
              Подробности
            </ZButton>
          </div>
        </ZCard>
      </motion.div>
    );
  }

  // variant === 'card'
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1.0] }}
    >
      <ZCard variant="elevated" className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-primary" strokeWidth={1.5} />
          <h3 className="text-base font-semibold text-foreground">
            {texts.common.premium}
          </h3>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {texts.paywall.valueProp}
        </p>

        <ul className="space-y-2">
          {HIGHLIGHT_FEATURES.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <span className="mt-1.5 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">{feature.title}</span>
                <span className="text-xs text-muted-foreground">{feature.description}</span>
              </span>
            </li>
          ))}
        </ul>

        <ZButton
          variant="secondary"
          className="w-full"
          onClick={() => navigate('paywall')}
        >
          Подробности
        </ZButton>
      </ZCard>
    </motion.div>
  );
}
