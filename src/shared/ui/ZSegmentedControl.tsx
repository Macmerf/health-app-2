'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

export interface ZSegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  ariaLabel?: string;
}

export function ZSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  ariaLabel = 'Выбор вкладки',
}: ZSegmentedControlProps<T>) {
  const activeIndex = options.findIndex((o) => o.value === value);

  return (
    <div
      className={clsx(
        'relative inline-flex rounded-xl bg-muted p-1',
        className,
      )}
      role='tablist'
      aria-label={ariaLabel}
    >
      {/* Animated indicator */}
      <motion.div
        className='absolute top-1 bottom-1 rounded-lg bg-primary'
        layout
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
        style={{
          width: `calc(${100 / options.length}% - 4px)`,
          left: `calc(${(activeIndex / options.length) * 100}% + 2px)`,
        }}
      />

      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            role='tab'
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={clsx(
              'relative z-10 flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200',
              isActive
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
