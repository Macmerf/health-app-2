'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZCard } from '@/shared/ui/ZCard';
import { ZInput } from '@/shared/ui/ZInput';
import { clsx } from 'clsx';
import { texts } from '@/shared/constants/texts';
import { EMOTIONS } from '../data/emotions';
import type { Emotion } from '../data/emotions';

interface EmotionSelectorProps {
  value: Emotion | null;
  onChange: (emotion: Emotion | null) => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.97 },
};

export function EmotionSelector({ value, onChange }: EmotionSelectorProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return EMOTIONS;
    const q = search.toLowerCase().trim();
    return EMOTIONS.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.synonyms.some((s) => s.toLowerCase().includes(q)),
    );
  }, [search]);

  return (
    <div className="flex flex-col gap-3">
      <ZInput
        placeholder={texts.journal.patternSearchPlaceholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        type="search"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[400px] overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout">
          {filtered.map((emotion) => {
            const isSelected = value?.id === emotion.id;

            return (
              <motion.div
                key={emotion.id}
                layout
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1.0] }}
              >
                <ZCard
                  className={clsx(
                    'transition-all duration-200',
                    isSelected
                      ? 'border-2 border-primary ring-2 ring-primary/20'
                      : 'border border-border',
                  )}
                  onClick={() => onChange(isSelected ? null : emotion)}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className={clsx('text-sm font-semibold', value?.id === emotion.id ? 'text-foreground' : 'text-foreground')}>
                        {emotion.name}
                      </span>
                      <span
                        className={clsx(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          isSelected ? emotion.color : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {isSelected ? 'Выбрано' : 'Выбрать'}
                      </span>
                    </div>

                    {isSelected && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {emotion.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <span className="font-medium">Похожие:</span>{' '}
                          {emotion.synonyms.join(', ')}
                        </p>
                      </motion.div>
                    )}
                  </div>
                </ZCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="flex justify-center pt-1">
        <button
          onClick={() => onChange(null)}
          className={clsx(
            'rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200',
            !value
              ? 'bg-primary/15 text-primary'
              : 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
        >
          {texts.journal.noPattern}
        </button>
      </div>
    </div>
  );
}
