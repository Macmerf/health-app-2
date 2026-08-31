'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

export interface ZProgressBarProps {
  steps: number;
  currentStep: number;
  /** Optional labels for each step (1-indexed). Shown below the step dot. */
  labels?: string[];
  className?: string;
}

export function ZProgressBar({
  steps,
  currentStep,
  labels,
  className,
}: ZProgressBarProps) {
  const clampedStep = Math.max(0, Math.min(currentStep, steps));
  const progress = steps > 1 ? (clampedStep / steps) * 100 : 100;

  return (
    <div className={clsx('w-full', className)} role='progressbar' aria-valuenow={clampedStep} aria-valuemin={0} aria-valuemax={steps} aria-label={`Шаг ${clampedStep} из ${steps}`}>
      {/* Track */}
      <div className='relative h-1.5 w-full rounded-full bg-muted overflow-hidden'>
        <motion.div
          className='absolute inset-y-0 left-0 rounded-full bg-primary'
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
        />
      </div>

      {/* Step dots and labels */}
      {steps <= 10 && (
        <div className='mt-2 flex justify-between'>
          {Array.from({ length: steps }, (_, i) => {
            const stepNum = i + 1;
            const isCompleted = stepNum <= clampedStep;
            const isCurrent = stepNum === clampedStep;

            return (
              <div key={stepNum} className='flex flex-col items-center gap-1'>
                <div
                  className={clsx(
                    'h-2.5 w-2.5 rounded-full transition-colors duration-300',
                    isCompleted ? 'bg-primary' : 'bg-muted-foreground/30',
                    isCurrent && 'ring-2 ring-primary/30 ring-offset-1 ring-offset-background',
                  )}
                  aria-hidden='true'
                />
                {labels?.[i] && (
                  <span className='text-[11px] text-muted-foreground text-center leading-tight max-w-[60px] truncate' title={labels[i]}>
                    {labels[i]}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
