'use client';

import React, { useCallback, useRef } from 'react';
import { clsx } from 'clsx';

export interface ZSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function ZSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 5,
  label = 'Уровень тревоги',
  className,
  disabled = false,
}: ZSliderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const percentage = ((value - min) / (max - min)) * 100;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = Number(e.target.value);
      onChange(next);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    },
    [onChange],
  );

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span
          className="text-lg font-semibold text-primary tabular-nums"
          aria-live="polite"
        >
          {value}
        </span>
      </div>

      <div className="relative flex items-center">
        {/* Track background */}
        <div className="pointer-events-none absolute left-0 right-0 h-2 rounded-full bg-muted" />
        {/* Filled track */}
        <div
          className="pointer-events-none absolute left-0 h-2 rounded-full bg-primary transition-[width] duration-150"
          style={{ width: `${percentage}%` }}
        />
        {/* Native range input */}
        <input
          ref={inputRef}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label={label}
          className={clsx(
            'relative z-10 w-full h-2 appearance-none bg-transparent cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          style={{
            /* Custom thumb */
          }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{min}</span>
        <span>{max}</span>
      </div>

      {/* Inline styles for range thumb (works across browsers) */}
      <style jsx>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--primary);
          border: 3px solid var(--background);
          box-shadow: 0 1px 4px rgba(45, 44, 42, 0.15);
          cursor: pointer;
          transition: transform 150ms ease;
        }
        input[type='range']::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        input[type='range']::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: var(--primary);
          border: 3px solid var(--background);
          box-shadow: 0 1px 4px rgba(45, 44, 42, 0.15);
          cursor: pointer;
          transition: transform 150ms ease;
        }
        input[type='range']::-moz-range-thumb:hover {
          transform: scale(1.15);
        }
        input[type='range']::-moz-range-track {
          background: transparent;
          border: none;
        }
      `}</style>
    </div>
  );
}
