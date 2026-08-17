'use client';

import React from 'react';
import { clsx } from 'clsx';

const variantStyles = {
  default: 'bg-card border border-border',
  elevated: 'bg-card shadow-soft',
} as const;

type CardVariant = keyof typeof variantStyles;

export interface ZCardProps {
  variant?: CardVariant;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export function ZCard({
  variant = 'default',
  className,
  children,
  onClick,
}: ZCardProps) {
  const isClickable = typeof onClick === 'function';

  return (
    <div
      className={clsx(
        'rounded-2xl p-5',
        variantStyles[variant],
        isClickable && 'cursor-pointer transition-shadow duration-200 hover:shadow-soft',
        className,
      )}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick!();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}
