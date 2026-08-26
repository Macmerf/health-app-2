'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Play } from 'lucide-react';

import { ZButton } from '@/shared/ui/ZButton';
import { ZSlider } from '@/shared/ui/ZSlider';
import { ZTextArea } from '@/shared/ui/ZTextArea';
import { ZCard } from '@/shared/ui/ZCard';
import { useToast } from '@/shared/ui/ZToast';
import { useRouterStore, useCareTreeStore } from '@/shared/lib/stores';
import { useExposureStore } from '../store';
import { texts } from '@/shared/constants/texts';
import { ExposureSessionSchema } from '@/shared/schemas';
import { FeatureGuide } from '@/shared/ui/FeatureGuide';

const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

interface SUDSCheck {
  time: number;
  suds: number;
}

type Phase = 'running' | 'reflection' | 'done';

export function ExposureSession() {
  const params = useRouterStore((s) => s.params);
  const navigate = useRouterStore((s) => s.navigate);
  const hierarchies = useExposureStore((s) => s.hierarchies);
  const addSession = useExposureStore((s) => s.addSession);
  const addPractice = useCareTreeStore((s) => s.addPractice);
  const { showToast } = useToast();

  const hierarchyId = params.hierarchyId ?? '';
  const stepId = params.stepId ?? '';

  const hierarchy = hierarchies.find((h) => h.id === hierarchyId);
  const step = hierarchy?.steps.find((s) => s.id === stepId);

  const [phase, setPhase] = useState<Phase>('running');
  const [elapsed, setElapsed] = useState(0);
  const [currentSuds, setCurrentSuds] = useState(50);
  const [sudsChecks, setSUDSChecks] = useState<SUDSCheck[]>([]);
  const [showSudsPrompt, setShowSudsPrompt] = useState(false);
  const [reflection, setReflection] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  // Timer
  useEffect(() => {
    if (phase === 'running') {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          elapsedRef.current = next;
          return next;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [phase]);

  // Auto SUDs check every 30 seconds
  const lastSudsPromptTime = useRef(-1);
  useEffect(() => {
    if (phase === 'running' && elapsed > 0 && elapsed % 30 === 0 && elapsed !== lastSudsPromptTime.current) {
      lastSudsPromptTime.current = elapsed;
      // Use timeout to defer setState outside of render
      const t = setTimeout(() => setShowSudsPrompt(true), 0);
      return () => clearTimeout(t);
    }
  }, [phase, elapsed]);

  // Record initial SUDs check at time=0 — use ref to guard
  const initialCheckDone = useRef(false);
  useEffect(() => {
    if (phase === 'running' && !initialCheckDone.current) {
      initialCheckDone.current = true;
      const initialSudsValue = step?.initialSuds ?? 50;
      const t = setTimeout(() => {
        setCurrentSuds(initialSudsValue);
        setSUDSChecks([{ time: 0, suds: initialSudsValue }]);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [phase, step?.initialSuds]);

  const handleSudsChange = useCallback((value: number) => {
    setCurrentSuds(value);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  }, []);

  const handleSaveSudsCheck = useCallback(() => {
    setSUDSChecks((prev) => [...prev, { time: elapsedRef.current, suds: currentSuds }]);
    setShowSudsPrompt(false);
    showToast(texts.exposure.sudsRecorded, 'info');
  }, [currentSuds, showToast]);

  const handleStop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Record final SUDs check
    setSUDSChecks((prev) => {
      const updated = [...prev, { time: elapsedRef.current, suds: currentSuds }];
      return updated;
    });

    setPhase('reflection');
  }, [currentSuds]);

  const handleSave = useCallback(() => {
    const finalChecks = [
      ...sudsChecks,
      { time: elapsedRef.current, suds: currentSuds },
    ];

    const now = new Date().toISOString();
    const sessionData = {
      id: genId(),
      hierarchyId,
      stepId,
      stepName: step?.name ?? '',
      startedAt: now,
      endedAt: now,
      durationSeconds: elapsedRef.current,
      sudsChecks: finalChecks,
      reflection: reflection.trim() || undefined,
    };

    const result = ExposureSessionSchema.safeParse(sessionData);
    if (!result.success) {
      showToast('Ошибка сохранения сессии', 'error');
      return;
    }

    addSession(result.data);
    addPractice();
    showToast(texts.exposure.sessionComplete, 'success');
    setPhase('done');
  }, [hierarchyId, stepId, step, elapsedRef, currentSuds, sudsChecks, reflection, addSession, addPractice, showToast]);

  // Done — go back to exposure
  useEffect(() => {
    if (phase === 'done') {
      const timer = setTimeout(() => {
        navigate('exposure');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, navigate]);

  // Not found state
  if (!hierarchy || !step) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center gap-4 py-16 text-center"
      >
        <p className="text-lg text-muted-foreground">{texts.common.error}</p>
        <ZButton variant="secondary" onClick={() => navigate('exposure')}>
          {texts.common.back}
        </ZButton>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
      className="flex flex-col gap-5"
    >
      <FeatureGuide
        guideId='exposure-session'
        title='Практика шага'
        description='Ты выполняешь шаг из своей лестницы. Таймер считает время, а каждые 30 секунд нужно оценить тревогу.'
        steps={[
          'Выполняй шаг — например, «подумать о звонке»',
          'Когда появилось окно — двигай ползунок и нажми «Записать»',
          'Нажми «Остановить» когда будешь готов',
          'Напиши рефлексию — что заметил',
        ]}
      />

      {/* Step name */}
      <ZCard variant="elevated" className="text-center">
        <h2 className="text-xl font-semibold text-foreground">{step.name}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {texts.exposure.initialSuds}: {step.initialSuds}
        </p>
      </ZCard>

      <AnimatePresence mode="wait">
        {phase === 'running' && (
          <motion.div
            key="running"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-5"
          >
            {/* Timer */}
            <ZCard variant="default" className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Timer size={20} strokeWidth={1.5} className="text-primary" />
                <span className="text-sm font-medium text-muted-foreground">
                  {texts.exposure.sessionTime}
                </span>
              </div>
              <p className="text-4xl font-bold tabular-nums text-foreground tracking-wider">
                {formatTime(elapsed)}
              </p>
            </ZCard>

            {/* SUDs prompt */}
            <AnimatePresence>
              {showSudsPrompt && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <ZCard variant="elevated" className="flex flex-col gap-4">
                    <p className="text-base font-semibold text-foreground">
                      {texts.exposure.sudsCheck}
                    </p>
                    <ZSlider
                      value={currentSuds}
                      onChange={handleSudsChange}
                      label={texts.exposure.currentSuds}
                      min={0}
                      max={100}
                      step={5}
                    />
                    <ZButton variant="primary" onClick={handleSaveSudsCheck} className="w-full">
                      {texts.exposure.recordSuds}
                    </ZButton>
                  </ZCard>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stop button */}
            <ZButton variant="destructive" size="lg" onClick={handleStop} className="w-full">
              {texts.exposure.stopSession}
            </ZButton>
          </motion.div>
        )}

        {phase === 'reflection' && (
          <motion.div
            key="reflection"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-5"
          >
            {/* Session summary */}
            <ZCard variant="default" className="text-center">
              <p className="text-sm text-muted-foreground mb-1">
                {texts.exposure.sessionTime}
              </p>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {formatTime(elapsed)}
              </p>
            </ZCard>

            {/* Reflection */}
            <ZTextArea
              label={texts.exposure.reflectionTitle}
              placeholder={texts.exposure.reflectionPlaceholder}
              helperText={texts.exposure.reflectionPrompt}
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              rows={4}
            />

            <ZButton variant="primary" onClick={handleSave} className="w-full">
              {texts.common.save}
            </ZButton>
          </motion.div>
        )}

        {phase === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center gap-3 py-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/20"
            >
              <Play size={32} strokeWidth={1.5} className="text-primary ml-1" />
            </motion.div>
            <p className="text-lg font-semibold text-foreground">
              {texts.exposure.sessionComplete}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
