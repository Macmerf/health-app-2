'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wind, TreePine, ArrowRight, Sparkles } from 'lucide-react';
import { ZHeader } from '@/shared/ui/ZHeader';
import { ZProgressBar } from '@/shared/ui/ZProgressBar';
import { ZButton } from '@/shared/ui/ZButton';
import { ZTextArea } from '@/shared/ui/ZTextArea';
import { ZSlider } from '@/shared/ui/ZSlider';
import { ZCard } from '@/shared/ui/ZCard';
import { ZBadge } from '@/shared/ui/ZBadge';
import { useToast } from '@/shared/ui/ZToast';
import { texts } from '@/shared/constants/texts';
import { EmotionSelector } from './EmotionSelector';
import { useJournalStore } from '../store';
import type { JournalEntry } from '@/shared/schemas';
import { useRouterStore } from '@/shared/lib/stores';
import { checkCrisisKeywords } from '@/shared/lib/crisis-detector';
import { z } from 'zod/v4';
import type { Emotion } from '../data/emotions';

// --- Wizard steps: A B C D E F ---
const STEP_A = 0; // Ситуация
const STEP_B = 1; // Мысли и эмоции
const STEP_C = 2; // Физические проявления
const STEP_D = 3; // Уровень тревоги
const STEP_E = 4; // Новый взгляд
const STEP_PREVIEW = 5;
const TOTAL_STEPS = 6;

const STEP_LABELS = [
  texts.journal.stepA,
  texts.journal.stepB,
  texts.journal.stepC,
  texts.journal.stepD,
  texts.journal.stepE,
  texts.journal.stepPreview,
];

const stepASchema = z.object({ situation: z.string().min(1, 'Опиши ситуацию') });
const stepBSchema = z.object({ thoughts: z.string().min(1, 'Опиши свои мысли') });

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

interface JournalWizardProps {
  onComplete: () => void;
}

export function JournalWizard({ onComplete }: JournalWizardProps) {
  const [step, setStep] = useState(STEP_A);
  const [direction, setDirection] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [situation, setSituation] = useState('');
  const [thoughts, setThoughts] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | null>(null);
  const [physical, setPhysical] = useState('');
  const [sudsBefore, setSudsBefore] = useState(50);
  const [newView, setNewView] = useState('');
  const [reflectionAnswers, setReflectionAnswers] = useState<Record<number, string>>({});
  const [sudsAfter, setSudsAfter] = useState(50);

  const addEntry = useJournalStore((s) => s.addEntry);
  const { showToast } = useToast();
  const navigate = useRouterStore((s) => s.navigate);

  // Автоскролл наверх при открытии мастера
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      window.scrollTo({ top: 0 });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const validateStep = useCallback(
    (currentStep: number): boolean => {
      const newErrors: Record<string, string> = {};
      if (currentStep === STEP_A) {
        const res = stepASchema.safeParse({ situation });
        if (!res.success) res.error.issues.forEach((issue) => { newErrors[issue.path.join('.')] = issue.message; });
      } else if (currentStep === STEP_B) {
        const res = stepBSchema.safeParse({ thoughts });
        if (!res.success) res.error.issues.forEach((issue) => { newErrors[issue.path.join('.')] = issue.message; });
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [situation, thoughts],
  );

  const goNext = useCallback(() => {
    if (!validateStep(step)) return;
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, [step, validateStep]);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleSave = useCallback(() => {
    const now = new Date().toISOString();
    // Собираем ответы на вопросы в newView
    const reflectionParts = texts.journal.reflectionQuestions
      .map((q, i) => {
        const answer = reflectionAnswers[i]?.trim();
        return answer ? `${q}\n${answer}` : '';
      })
      .filter(Boolean);
    const combinedView = [newView.trim(), ...reflectionParts].filter(Boolean).join('\n\n');

    const entry: JournalEntry = {
      id: crypto.randomUUID?.() ?? Date.now().toString(36),
      createdAt: now,
      updatedAt: now,
      situation,
      thoughts,
      physical: physical.trim() || undefined,
      sudsBefore,
      sudsAfter,
      newView: combinedView || newView,
      emotionId: selectedEmotion?.id,
      emotionName: selectedEmotion?.name,
    };
    addEntry(entry);
    showToast(texts.journal.saved, 'success');
    onComplete();
  }, [situation, thoughts, physical, sudsBefore, sudsAfter, newView, reflectionAnswers, selectedEmotion, addEntry, showToast, onComplete]);

  const progressLabels = useMemo(
    () => STEP_LABELS.map((label) => (label.length > 6 ? label.slice(0, 6) + '...' : label)),
    [],
  );

  const anxietyIncreased = sudsAfter > sudsBefore;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <ZHeader title={texts.journal.newEntry} />

      <div className="flex flex-col gap-5 px-4 pb-8 pt-4 max-w-lg mx-auto w-full">
        <ZProgressBar steps={TOTAL_STEPS} currentStep={step + 1} labels={progressLabels} />

        <div className="relative overflow-hidden min-h-[340px]">
          <AnimatePresence mode="wait" custom={direction}>
            {/* Step A: Situation */}
            {step === STEP_A && (
              <motion.div key="step-a" custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }} className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-foreground">{texts.journal.stepA}</h2>
                <p className="text-sm text-muted-foreground">{texts.journal.stepAHelp}</p>
                <ZTextArea placeholder={texts.journal.situationPlaceholder} value={situation} onChange={(e) => { setSituation(e.target.value); if (errors.situation) setErrors((prev) => ({ ...prev, situation: '' })); }} error={errors.situation} rows={4} />
              </motion.div>
            )}

            {/* Step B: Thoughts + Emotion */}
            {step === STEP_B && (
              <motion.div key="step-b" custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }} className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-foreground">{texts.journal.stepB}</h2>
                <p className="text-sm text-muted-foreground">{texts.journal.stepBHelp}</p>
                <ZTextArea placeholder={texts.journal.thoughtPlaceholder} value={thoughts} onChange={(e) => { setThoughts(e.target.value); if (errors.thoughts) setErrors((prev) => ({ ...prev, thoughts: '' })); }} error={errors.thoughts} rows={4} />
                {checkCrisisKeywords(thoughts) && (
                  <div className="flex flex-col gap-3 rounded-2xl bg-terracotta/8 border border-terracotta/15 p-4">
                    <p className="text-sm font-medium text-terracotta">{texts.carePlan.crisisDetected}</p>
                    <p className="text-xs text-muted-foreground">{texts.journal.anxietyIncreasedBody}</p>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => navigate('breathing')} className="flex items-center gap-3 rounded-xl bg-card px-3 py-2.5 text-left hover:bg-muted transition-colors">
                        <Wind size={16} strokeWidth={1.5} className="text-primary shrink-0" />
                        <span className="text-sm text-foreground">{texts.journal.tryBreathing}</span>
                      </button>
                      <button onClick={() => navigate('grounding')} className="flex items-center gap-3 rounded-xl bg-card px-3 py-2.5 text-left hover:bg-muted transition-colors">
                        <TreePine size={16} strokeWidth={1.5} className="text-lavender shrink-0" />
                        <span className="text-sm text-foreground">{texts.journal.tryGrounding}</span>
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">{texts.journal.rememberDoctor}</p>
                  </div>
                )}
                <div className="flex flex-col gap-2 pt-2">
                  <h3 className="text-sm font-semibold text-foreground">{texts.journal.patternSelectTitle}</h3>
                  <EmotionSelector value={selectedEmotion} onChange={setSelectedEmotion} />
                </div>
              </motion.div>
            )}

            {/* Step C: Physical */}
            {step === STEP_C && (
              <motion.div key="step-c" custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }} className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-foreground">{texts.journal.stepC}</h2>
                <p className="text-sm text-muted-foreground">{texts.journal.stepCHelp}</p>
                <ZTextArea placeholder={texts.journal.physicalPlaceholder} value={physical} onChange={(e) => setPhysical(e.target.value)} rows={4} />
                <div className="rounded-xl bg-primary/8 px-3 py-2">
                  <p className="text-xs text-muted-foreground leading-relaxed">Тело и эмоции связаны. Замечая физические проявления, ты учишься замечать тревогу раньше и помогать себе быстрее.</p>
                </div>
              </motion.div>
            )}

            {/* Step D: SUDS + quick practices */}
            {step === STEP_D && (
              <motion.div key="step-d" custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }} className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-foreground">{texts.journal.stepD}</h2>
                <p className="text-sm text-muted-foreground">{texts.journal.stepDHelp}</p>
                <ZCard className="pt-6 pb-2">
                  <ZSlider label={texts.journal.sudsLabel} value={sudsBefore} onChange={setSudsBefore} min={0} max={100} step={5} />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
                    <span>{texts.journal.sudsLow}</span>
                    <span>{texts.journal.sudsHigh}</span>
                  </div>
                </ZCard>

                {/* Quick practice reminders */}
                <div className="rounded-2xl bg-terracotta/8 border border-terracotta/15 p-4">
                  <p className="text-sm font-medium text-foreground mb-2">Тревога сильная? Попробуй прямо сейчас:</p>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => navigate('breathing')} className="flex items-center gap-3 rounded-xl bg-card px-3 py-2.5 text-left hover:bg-muted transition-colors">
                      <Wind size={18} strokeWidth={1.5} className="text-primary shrink-0" />
                      <span className="text-sm text-foreground">Дыхание — вдох 4 сек, выдох 4 сек</span>
                      <ArrowRight size={16} strokeWidth={1.5} className="text-muted-foreground shrink-0 ml-auto" />
                    </button>
                    <button onClick={() => navigate('grounding')} className="flex items-center gap-3 rounded-xl bg-card px-3 py-2.5 text-left hover:bg-muted transition-colors">
                      <TreePine size={18} strokeWidth={1.5} className="text-lavender shrink-0" />
                      <span className="text-sm text-foreground">Заземление 5-4-3-2-1</span>
                      <ArrowRight size={16} strokeWidth={1.5} className="text-muted-foreground shrink-0 ml-auto" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step E: New View + reflection questions */}
            {step === STEP_E && (
              <motion.div key="step-e" custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }} className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-foreground">{texts.journal.stepE}</h2>
                <p className="text-sm text-muted-foreground">{texts.journal.stepEHelp}</p>

                {/* Reflection questions — не кликабельные, с полями для ответов */}
                <div className="flex flex-col gap-4">
                  {texts.journal.reflectionQuestions.map((q, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                      <p className="text-sm text-foreground leading-relaxed">{q}</p>
                      <textarea
                        value={reflectionAnswers[i] ?? ''}
                        onChange={(e) => setReflectionAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                        placeholder="Запиши свои мысли…"
                        rows={2}
                        className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-y"
                      />
                    </div>
                  ))}
                </div>

                <ZTextArea placeholder={texts.journal.newViewPlaceholder} value={newView} onChange={(e) => { setNewView(e.target.value); if (errors.newView) setErrors((prev) => ({ ...prev, newView: '' })); }} error={errors.newView} rows={4} />

                {/* Motivation */}
                <div className="flex items-start gap-2 rounded-xl bg-primary/8 px-3 py-2">
                  <Sparkles size={16} strokeWidth={1.5} className="text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-primary/90 leading-relaxed">{texts.journal.reflectionMotivation}</p>
                </div>

                {/* SUDS After */}
                <ZCard className="pt-6 pb-2">
                  <ZSlider label={`${texts.journal.sudsLabel} (после)`} value={sudsAfter} onChange={setSudsAfter} min={0} max={100} step={5} />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
                    <span>{texts.journal.sudsLow}</span>
                    <span>{texts.journal.sudsHigh}</span>
                  </div>
                </ZCard>
              </motion.div>
            )}

            {/* Step Preview */}
            {step === STEP_PREVIEW && (
              <motion.div key="step-preview" custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }} className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold text-foreground">{texts.journal.stepPreview}</h2>

                <ZCard variant="elevated" className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{texts.journal.stepA}</span>
                    <p className="text-sm text-foreground">{situation}</p>
                  </div>
                  <hr className="border-border" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{texts.journal.stepB}</span>
                    <p className="text-sm text-foreground">{thoughts}</p>
                    {selectedEmotion && <ZBadge variant="primary" className="self-start mt-1">{selectedEmotion.name}</ZBadge>}
                  </div>
                  {physical && (
                    <>
                      <hr className="border-border" />
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{texts.journal.stepC}</span>
                        <p className="text-sm text-foreground">{physical}</p>
                      </div>
                    </>
                  )}
                  <hr className="border-border" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Тревога до</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${sudsBefore}%` }} /></div>
                      <span className="text-sm font-semibold text-primary tabular-nums w-8 text-right">{sudsBefore}</span>
                    </div>
                  </div>
                  <hr className="border-border" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{texts.journal.stepE}</span>
                    <p className="text-sm text-foreground">{newView}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Тревога после</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${anxietyIncreased ? 'bg-terracotta' : 'bg-primary'}`} style={{ width: `${sudsAfter}%` }} /></div>
                      <span className={`text-sm font-semibold tabular-nums w-8 text-right ${anxietyIncreased ? 'text-terracotta' : 'text-primary'}`}>{sudsAfter}</span>
                    </div>
                  </div>
                </ZCard>

                {/* Anxiety increased — show help */}
                {anxietyIncreased && (
                  <div className="flex flex-col gap-3 rounded-2xl bg-terracotta/8 border border-terracotta/15 p-4">
                    <p className="text-sm font-medium text-terracotta">{texts.journal.anxietyIncreased}</p>
                    <p className="text-xs text-muted-foreground">{texts.journal.anxietyIncreasedBody}</p>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => navigate('breathing')} className="flex items-center gap-3 rounded-xl bg-card px-3 py-2.5 text-left hover:bg-muted transition-colors">
                        <Wind size={16} strokeWidth={1.5} className="text-primary shrink-0" />
                        <span className="text-sm text-foreground">{texts.journal.tryBreathing}</span>
                      </button>
                      <button onClick={() => navigate('grounding')} className="flex items-center gap-3 rounded-xl bg-card px-3 py-2.5 text-left hover:bg-muted transition-colors">
                        <TreePine size={16} strokeWidth={1.5} className="text-lavender shrink-0" />
                        <span className="text-sm text-foreground">{texts.journal.tryGrounding}</span>
                      </button>
                      <div className="rounded-xl bg-card px-3 py-2.5">
                        <p className="text-sm text-foreground">{texts.journal.tryMove}</p>
                      </div>
                      <div className="rounded-xl bg-card px-3 py-2.5">
                        <p className="text-sm text-foreground">{texts.journal.tryWater}</p>
                      </div>
                      <div className="rounded-xl bg-card px-3 py-2.5">
                        <p className="text-sm text-foreground">{texts.journal.tryCold}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{texts.journal.rememberDoctor}</p>
                  </div>
                )}

                {!anxietyIncreased && sudsAfter < sudsBefore && (
                  <p className="text-sm text-primary font-medium text-center">
                    Тревога снизилась на {sudsBefore - sudsAfter} пунктов!
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 mt-auto pt-4">
          {step > STEP_A && (
            <ZButton variant="ghost" onClick={goBack} className="flex-1">{texts.common.back}</ZButton>
          )}
          {step < STEP_PREVIEW ? (
            <ZButton variant="primary" onClick={goNext} className="flex-1">{texts.common.next}</ZButton>
          ) : (
            <ZButton variant="primary" onClick={handleSave} className="flex-1">{texts.common.save}</ZButton>
          )}
        </div>
      </div>
    </div>
  );
}
