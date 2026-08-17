'use client';

import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

const variantStyles = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90 active:bg-secondary/80',
  ghost: 'bg-transparent text-foreground hover:bg-muted active:bg-muted/80',
  destructive: 'bg-terracotta text-white hover:bg-terracotta/90 active:bg-terracotta/80',
} as const;

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-base',
  lg: 'px-6 py-3 text-lg',
} as const;

type ButtonVariant = keyof typeof variantStyles;
type ButtonSize = keyof typeof sizeStyles;

export interface ZButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

export function ZButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  className,
  onClick,
  ...rest
}: ZButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        variantStyles[variant],
        sizeStyles[size],
        isDisabled && 'pointer-events-none opacity-50',
        className,
      )}
      whileTap={isDisabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.15 }}
      aria-disabled={isDisabled}
      aria-busy={loading}
      disabled={isDisabled}
      onClick={isDisabled ? undefined : onClick}
      {...rest}
    >
      {loading && (
        <Loader2
          size={18}
          strokeWidth={1.5}
          className="animate-spin"
          aria-hidden="true"
        />
      )}
      {children}
    </motion.button>
  );
}
