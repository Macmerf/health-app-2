'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ZCard } from '@/shared/ui/ZCard';
import { ZBadge } from '@/shared/ui/ZBadge';
import { FeatureGate } from '@/features/payments';
import { AchievementIcon } from './AchievementIcon';
import { useGamificationStore } from '../store';
import { texts } from '@/shared/constants/texts';
import type { Achievement } from '@/shared/schemas';

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return '';
  }
}

/** Карточка одного достижения */
function AchievementCard({ achievement }: { achievement: Achievement }) {
  const isUnlocked = !!achievement.unlockedAt;


  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
      className={isUnlocked ? '' : 'opacity-30'}
    >
      <ZCard className="flex flex-col items-center text-center gap-2 py-4 px-3">
        <div
          className={
            isUnlocked
              ? 'flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/15 text-primary'
              : 'flex items-center justify-center w-12 h-12 rounded-2xl bg-muted text-muted-foreground'
          }
        >
          <AchievementIcon name={achievement.icon} />
        </div>

        <p className="text-sm font-semibold text-foreground leading-tight">
          {achievement.name}
        </p>

        {isUnlocked ? (
          <>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {achievement.description}
            </p>
            <ZBadge variant="primary">
              {formatDate(achievement.unlockedAt)}
            </ZBadge>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            {texts.achievements.locked}
          </p>
        )}
      </ZCard>
    </motion.div>
  );
}

/** Галерея достижений — первые 8 для всех, остальные за FeatureGate */
export function AchievementsGallery() {
  const getAllAchievements = useGamificationStore((s) => s.getAllAchievements);
  const allAchievements = getAllAchievements();

  const FREE_COUNT = 8;
  const freeAchievements = allAchievements.slice(0, FREE_COUNT);
  const premiumAchievements = allAchievements.slice(FREE_COUNT);

  const unlockedCount = allAchievements.filter((a) => !!a.unlockedAt).length;

  return (
    <div className="space-y-6">
      {/* Заголовок с подсчётом */}
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">
          {texts.achievements.subtitle}
        </p>
        {unlockedCount > 0 && (
          <ZBadge variant="primary">
            {texts.achievements.unlocked}: {unlockedCount}/{allAchievements.length}
          </ZBadge>
        )}
      </div>

      {/* Сетка достижений (бесплатные) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {freeAchievements.map((achievement, i) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: i * 0.05,
              ease: [0.25, 0.1, 0.25, 1.0],
            }}
          >
            <AchievementCard achievement={achievement} />
          </motion.div>
        ))}
      </div>

      {/* Расширенная галерея за премиум */}
      <FeatureGate featureKey="extended_achievements">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {premiumAchievements.map((achievement, i) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.3,
                delay: (FREE_COUNT + i) * 0.05,
                ease: [0.25, 0.1, 0.25, 1.0],
              }}
            >
              <AchievementCard achievement={achievement} />
            </motion.div>
          ))}
        </div>
      </FeatureGate>

      {/* Подсказка для пустой галереи */}
      {unlockedCount === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          {texts.achievements.emptyGallery}
        </p>
      )}
    </div>
  );
}
