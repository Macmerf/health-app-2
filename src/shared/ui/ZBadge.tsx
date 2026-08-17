'use client';

import React from 'react';
import { clsx } from 'clsx';

const variantStyles = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary/15 text-primary',
  secondary: 'bg-secondary/15 text-secondary',
} as const;

type BadgeVariant = keyof typeof variantStyles;

export interface ZBadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}

export function ZBadge({
  variant = 'default',
  className,
  children,
}: ZBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
