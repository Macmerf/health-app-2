'use client';

import React from 'react';
import { clsx } from 'clsx';

const variantStyles = {
  default: 'bg-card border border-border',
  elevated: 'bg-card shadow-soft',
} as const;

type CardVariant = keyof typeof variantStyles;

export interface ZCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'children' | 'onClick'> {
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
  ...rest
}: ZCardProps) {
  const isClickable = typeof onClick === 'function';

  return (
    <div
      {...rest}
      className={clsx(
        'rounded-2xl p-4 sm:p-5',
        variantStyles[variant],
        isClickable && 'cursor-pointer transition-shadow duration-200 hover:shadow-soft',
        className,
      )}
      onClick={onClick}
      role={isClickable ? 'button' : rest.role}
      tabIndex={isClickable ? 0 : rest.tabIndex}
      onKeyDown={
        isClickable
          ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick!();
              }
            }
          : rest.onKeyDown
      }
    >
      {children}
    </div>
  );
}
