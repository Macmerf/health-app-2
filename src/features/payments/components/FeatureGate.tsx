'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';
import { ZCard } from '@/shared/ui/ZCard';
import { ZButton } from '@/shared/ui/ZButton';
import { ZBadge } from '@/shared/ui/ZBadge';
import { usePaymentStore } from '../store';
import { useRouterStore } from '@/shared/lib/stores';
import { texts } from '@/shared/constants/texts';

interface FeatureGateProps {
  featureKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ featureKey, children, fallback }: FeatureGateProps) {
  const navigate = useRouterStore((s) => s.navigate);
  // Подписываемся на результат проверки, а не на ссылку функции —
  // иначе компонент не перерисуется при смене entitlement (например, после триала).
  const hasAccess = usePaymentStore((s) => s.checkEntitlement(featureKey));

  if (hasAccess) {
    return <>{children}</>;
  }

  // Если передан кастомный fallback — используем его
  if (fallback) {
    return <>{fallback}</>;
  }

  // Мягкая карточка апселла
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
      >
        <ZCard variant="elevated" className="text-center space-y-3">
          <div className="flex justify-center">
            <ZBadge variant="primary">{texts.common.premium}</ZBadge>
          </div>
          <div className="flex items-center justify-center gap-2 text-foreground">
            <Lock size={18} strokeWidth={1.5} className="text-muted-foreground" />
            <p className="text-sm font-medium">
              {texts.featureGate.lockedTitle}
            </p>
          </div>
          <ZButton
            variant="secondary"
            size="sm"
            onClick={() => navigate('paywall')}
          >
            {texts.featureGate.lockedCta}
          </ZButton>
        </ZCard>
      </motion.div>
    </AnimatePresence>
  );
}
