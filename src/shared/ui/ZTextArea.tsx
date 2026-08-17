'use client';

import React, { useId } from 'react';
import { clsx } from 'clsx';

export interface ZTextAreaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function ZTextArea({
  label,
  error,
  helperText,
  className,
  id: externalId,
  disabled,
  ...props
}: ZTextAreaProps) {
  const generatedId = useId();
  const inputId = externalId ?? generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  const describedBy = [error ? errorId : null, helperText ? helperId : null]
    .filter(Boolean)
    .join(' ') || undefined;

  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-foreground"
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        rows={3}
        className={clsx(
          'w-full rounded-xl border bg-background px-3.5 py-2.5 text-base text-foreground',
          'placeholder:text-muted-foreground',
          'transition-colors duration-200 resize-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error
            ? 'border-terracotta focus-visible:ring-terracotta'
            : 'border-input focus-visible:border-ring',
        )}
        aria-invalid={error ? true : undefined}
        aria-errormessage={error ? errorId : undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-sm text-terracotta" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="text-sm text-muted-foreground">
          {helperText}
        </p>
      )}
    </div>
  );
}
