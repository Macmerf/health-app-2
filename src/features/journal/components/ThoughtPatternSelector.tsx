'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ZCard } from '@/shared/ui/ZCard';
import { ZInput } from '@/shared/ui/ZInput';
import { ZExpandableText } from '@/shared/ui/ZExpandableText';
import { clsx } from 'clsx';
import { texts } from '@/shared/constants/texts';
import { thoughtPatterns } from '../data/thought-patterns';
import type { ThoughtPattern } from '@/shared/schemas';

interface ThoughtPatternSelectorProps {
  value: ThoughtPattern | null;
  onChange: (pattern: ThoughtPattern | null) => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.97 },
};

export function ThoughtPatternSelector({ value, onChange }: ThoughtPatternSelectorProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return thoughtPatterns;
    const q = search.toLowerCase().trim();
    return thoughtPatterns.filter(
      (p) =>
        p.friendlyName.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
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
          {filtered.map((pattern) => {
            const isSelected = value?.id === pattern.id;

            return (
              <motion.div
                key={pattern.id}
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
                  onClick={() => onChange(isSelected ? null : pattern)}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={clsx(
                        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground/40',
                      )}
                      aria-hidden="true"
                    >
                      {isSelected && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.15 }}
                        >
                          ✓
                        </motion.span>
                      )}
                    </span>
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-sm font-medium text-foreground">
                        {pattern.friendlyName}
                      </span>
                      <ZExpandableText text={pattern.description} lines={2} textClassName="text-xs text-muted-foreground" />
                    </div>
                  </div>
                </ZCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Optional — skip pattern */}
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
