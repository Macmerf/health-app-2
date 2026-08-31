'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ZCard } from '@/shared/ui/ZCard';
import { ZExpandableText } from '@/shared/ui/ZExpandableText';
import { AchievementIcon } from './AchievementIcon';
import type { Achievement } from '@/shared/schemas';

interface AchievementUnlockedProps {
  achievement: Achievement;
  /** Автоматически скрыть через указанное время (мс). 0 = не скрывать автоматически */
  autoDismissMs?: number;
  onDismiss?: () => void;
}

export function AchievementUnlocked({
  achievement,
  autoDismissMs = 0,
  onDismiss,
}: AchievementUnlockedProps) {
  React.useEffect(() => {
    if (autoDismissMs > 0 && onDismiss) {
      const timer = setTimeout(onDismiss, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [autoDismissMs, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
      className="pointer-events-auto"
    >
      <ZCard variant="elevated" className="flex items-center gap-3.5 max-w-[360px]">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/15 text-primary shrink-0">
          <AchievementIcon name={achievement.icon} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-primary mb-0.5">
            Новое достижение!
          </p>
          <p className="text-sm font-semibold text-foreground truncate" title={achievement.name}>
            {achievement.name}
          </p>
          <ZExpandableText text={achievement.description} lines={2} textClassName="text-xs text-muted-foreground" noToggle />
        </div>
      </ZCard>
    </motion.div>
  );
}
