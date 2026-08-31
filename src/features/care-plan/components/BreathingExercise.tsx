'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { ZCard } from '@/shared/ui/ZCard';
import { ZButton } from '@/shared/ui/ZButton';
import { texts } from '@/shared/constants/texts';
import { FeatureGuide } from '@/shared/ui/FeatureGuide';
import { useCareTreeStore } from '@/shared/lib/stores';

const INHALE_DURATION = 4; // seconds
const EXHALE_DURATION = 4; // seconds
const CYCLE_DURATION = INHALE_DURATION + EXHALE_DURATION;
/** Минимальное время дыхания, чтобы практика засчиталась в дерево заботы. */
const MIN_PRACTICE_SECONDS = 30;

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function BreathingExercise() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const addPractice = useCareTreeStore((s) => s.addPractice);
  // Практика засчитывается один раз за сессию — при остановке, если подышали достаточно.
  const practiceCountedRef = useRef(false);

  // Determine current phase within the 8-second cycle
  const cyclePosition = elapsed % CYCLE_DURATION;
  const isInhaling = cyclePosition < INHALE_DURATION;

  // Start / resume
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  // Pause — reset cycle to beginning
  const handlePause = useCallback(() => {
    setIsPlaying(false);
    // Reset to beginning of cycle on pause
    const cyclesCompleted = Math.floor(elapsed / CYCLE_DURATION);
    setElapsed(cyclesCompleted * CYCLE_DURATION);
    if (!practiceCountedRef.current && elapsed >= MIN_PRACTICE_SECONDS) {
      practiceCountedRef.current = true;
      addPractice();
    }
  }, [elapsed, addPractice]);

  // Reset completely
  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setElapsed(0);
  }, []);

  // Timer tick
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying]);

  return (
    <div className="flex flex-col items-center gap-6 pb-8 pt-2 w-full">
      <FeatureGuide
        guideId='breathing'
        title='Дыхательная практика'
        description='Простая техника: вдох 4 секунды, выдох 4 секунды. Круг расширяется на вдохе и сжимается на выдохе. Следи за ним — это замедляет дыхание и успокаивает нервную систему.'
        steps={[
          'Нажми круглую кнопку ▶ внизу, чтобы начать',
          'Вдыхай, когда круг увеличивается и написано «Вдох»',
          'Выдыхай, когда круг уменьшается и написано «Выдох»',
          'Нажми ⏸, чтобы поставить на паузу',
          'Дыши 1-3 минуты — этого достаточно, чтобы снизить тревогу',
        ]}
      />

      <p className="text-sm text-muted-foreground text-center">
        {texts.carePlan.breathingInstruction}
      </p>

      {/* Animated circle */}
      <div className="relative flex items-center justify-center w-[200px] h-[200px]">
        <motion.div
          animate={{ scale: isInhaling ? 1.5 : 1 }}
          transition={{ duration: isInhaling ? INHALE_DURATION : EXHALE_DURATION, ease: 'easeInOut' }}
          className="w-[120px] h-[120px] rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center"
        >
          <span className="text-lg font-semibold text-primary select-none">
            {isInhaling ? texts.carePlan.breathingInhale : texts.carePlan.breathingExhale}
          </span>
        </motion.div>
      </div>

      {/* Phase text */}
      <p className="text-base font-medium text-foreground">
        {isInhaling ? texts.carePlan.breathingInhale : texts.carePlan.breathingExhale}
      </p>

      {/* Timer */}
      <ZCard variant="elevated" className="flex flex-col items-center gap-1 px-8 py-3">
        <span className="text-3xl font-bold text-foreground tabular-nums tracking-wider">
          {formatTime(elapsed)}
        </span>
        <span className="text-xs text-muted-foreground">Время дыхания</span>
      </ZCard>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <ZButton
          variant="ghost"
          size="md"
          onClick={handleReset}
          aria-label="Сбросить"
        >
          <RotateCcw size={20} strokeWidth={1.5} />
        </ZButton>

        <ZButton
          variant="primary"
          size="lg"
          onClick={isPlaying ? handlePause : handlePlay}
          className="w-16 h-16 rounded-full p-0 flex items-center justify-center"
          aria-label={isPlaying ? 'Пауза' : 'Начать'}
        >
          {isPlaying ? (
            <Pause size={28} strokeWidth={1.5} />
          ) : (
            <Play size={28} strokeWidth={1.5} className="ml-1" />
          )}
        </ZButton>

        {/* Invisible spacer for symmetry */}
        <div className="w-[48px]" aria-hidden="true" />
      </div>
    </div>
  );
}
