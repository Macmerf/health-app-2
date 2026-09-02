'use client';

import React, { useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wind, TreePine, ArrowRight, Sparkles } from 'lucide-react';
import { ZProgressBar } from '@/shared/ui/ZProgressBar';
import { ZButton } from '@/shared/ui/ZButton';
import { ZTextArea } from '@/shared/ui/ZTextArea';
import { ZSlider } from '@/shared/ui/ZSlider';
import { ZCard } from '@/shared/ui/ZCard';
import { ZBadge } from '@/shared/ui/ZBadge';
import { useToast } from '@/shared/ui/ZToast';
import { texts } from '@/shared/constants/texts';
import { EmotionSelector } from './EmotionSelector';
import { ThoughtPatternSelector } from './ThoughtPatternSelector';
import { useJournalStore } from '../store';
import { useJournalDraftStore } from '../draftStore';
import { emotionById } from '../data/emotions';
import { thoughtPatterns } from '../data/thought-patterns';
import type { JournalEntry } from '@/shared/schemas';
import type { ThoughtPattern } from '@/shared/schemas';
import { useRouterStore, useCareTreeStore } from '@/shared/lib/stores';
import { checkCrisisKeywords } from '@/shared/lib/crisis-detector';
import { useHydrated } from '@/shared/lib/storage';
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

/**
 * Обёртка: пока черновик не восстановлен из IndexedDB — скелетон.
 * Иначе пользователь увидит пустые поля и решит, что данные потерялись.
 * Рендерим тело мастера только после hydration, чтобы не нарушать
 * правила React (условный return до хуков в дочернем компоненте).
 */
export function JournalWizard({ onComplete }: JournalWizardProps) {
  const draftHydrated = useHydrated('zabotapsy-journal-draft');
  if (!draftHydrated) return <JournalWizardSkeleton />;
  return <JournalWizardBody onComplete={onComplete} />;
}

function JournalWizardBody({ onComplete }: JournalWizardProps) {
  // Черновик хранится в zustand с persist — переход в дыхание/заземление
  // не теряет введённые данные.
  const draft = useJournalDraftStore((s) => s.draft);
  const patchDraft = useJournalDraftStore((s) => s.patch);
  const clearDraft = useJournalDraftStore((s) => s.clearDraft);

  const [direction, setDirection] = React.useState(1);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Подтягиваем объекты эмоции/паттерна по id, чтобы Wizard не пересоздавал
  // ссылки на каждый рендер (EmotionSelector/ThoughtPatternSelector ожидают стабильные объекты).
  const selectedEmotion: Emotion | null = useMemo(
    () => (draft.selectedEmotionId ? (emotionById(draft.selectedEmotionId) ?? null) : null),
    [draft.selectedEmotionId],
  );
  const selectedPattern: ThoughtPattern | null = useMemo(
    () =>
      draft.selectedPatternId
        ? (thoughtPatterns.find((p) => p.id === draft.selectedPatternId) ?? null)
        : null,
    [draft.selectedPatternId],
  );

  const setSituation = useCallback(
    (v: string) => {
      patchDraft({ situation: v });
      if (errors.situation) setErrors((prev) => ({ ...prev, situation: '' }));
    },
    [patchDraft, errors.situation],
  );
  const setThoughts = useCallback(
    (v: string) => {
      patchDraft({ thoughts: v });
      if (errors.thoughts) setErrors((prev) => ({ ...prev, thoughts: '' }));
    },
    [patchDraft, errors.thoughts],
  );
  const setSelectedEmotion = useCallback(
    (e: Emotion | null) => patchDraft({ selectedEmotionId: e?.id ?? null }),
    [patchDraft],
  );
  const setSelectedPattern = useCallback(
    (p: ThoughtPattern | null) => patchDraft({ selectedPatternId: p?.id ?? null }),
    [patchDraft],
  );
  const setPhysical = useCallback((v: string) => patchDraft({ physical: v }), [patchDraft]);
  const setSudsBefore = useCallback((v: number) => patchDraft({ sudsBefore: v }), [patchDraft]);
  const setSudsAfter = useCallback((v: number) => patchDraft({ sudsAfter: v }), [patchDraft]);
  const setNewView = useCallback(
    (v: string) => {
      patchDraft({ newView: v });
      if (errors.newView) setErrors((prev) => ({ ...prev, newView: '' }));
    },
    [patchDraft, errors.newView],
  );
  const setReflectionAnswer = useCallback(
    (idx: number, value: string) => {
      const next = { ...draft.reflectionAnswers, [idx]: value };
      patchDraft({ reflectionAnswers: next });
    },
    [draft.reflectionAnswers, patchDraft],
  );

  const addEntry = useJournalStore((s) => s.addEntry);
  const addPractice = useCareTreeStore((s) => s.addPractice);
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

  const step = draft.step;

  const validateStep = useCallback(
    (currentStep: number): boolean => {
      const newErrors: Record<string, string> = {};
      if (currentStep === STEP_A) {
        const res = stepASchema.safeParse({ situation: draft.situation });
        if (!res.success) res.error.issues.forEach((issue) => { newErrors[issue.path.join('.')] = issue.message; });
      } else if (currentStep === STEP_B) {
        const res = stepBSchema.safeParse({ thoughts: draft.thoughts });
        if (!res.success) res.error.issues.forEach((issue) => { newErrors[issue.path.join('.')] = issue.message; });
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [draft.situation, draft.thoughts],
  );

  const goNext = useCallback(() => {
    if (!validateStep(step)) return;
    setDirection(1);
    patchDraft({ step: Math.min(step + 1, TOTAL_STEPS - 1) });
  }, [step, validateStep, patchDraft]);

  const goBack = useCallback(() => {
    setDirection(-1);
    patchDraft({ step: Math.max(step - 1, 0) });
  }, [step, patchDraft]);

  const handleSave = useCallback(() => {
    const now = new Date().toISOString();
    // Собираем ответы на вопросы в newView
    const reflectionParts = texts.journal.reflectionQuestions
      .map((q, i) => {
        const answer = draft.reflectionAnswers[i]?.trim();
        return answer ? `${q}\n${answer}` : '';
      })
      .filter(Boolean);
    const combinedView = [draft.newView.trim(), ...reflectionParts].filter(Boolean).join('\n\n');

    const entry: JournalEntry = {
      id: crypto.randomUUID?.() ?? Date.now().toString(36),
      createdAt: now,
      updatedAt: now,
      situation: draft.situation,
      thoughts: draft.thoughts,
      physical: draft.physical.trim() || undefined,
      sudsBefore: draft.sudsBefore,
      sudsAfter: draft.sudsAfter,
      newView: combinedView || draft.newView,
      emotionId: selectedEmotion?.id,
      emotionName: selectedEmotion?.name,
      patternId: selectedPattern?.id,
      patternName: selectedPattern?.friendlyName,
    };
    addEntry(entry);
    addPractice();
    clearDraft();
    showToast(texts.journal.saved, 'success');
    onComplete();
  }, [draft, selectedEmotion, selectedPattern, addEntry, addPractice, clearDraft, showToast, onComplete]);

  const progressLabels = useMemo(
    () => STEP_LABELS.map((label) => label),
    [],
  );

  const anxietyIncreased = draft.sudsAfter > draft.sudsBefore;

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-5 pb-8 pt-1 max-w-lg mx-auto w-full">
        <ZProgressBar steps={TOTAL_STEPS} currentStep={step + 1} labels={progressLabels} />

        <div className="relative overflow-hidden min-h-[340px]">
          <AnimatePresence mode="wait" custom={direction}>
            {/* Step A: Situation */}
            {step === STEP_A && (
              <motion.div key="step-a" custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }} className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-foreground">{texts.journal.stepA}</h2>
                <p className="text-sm text-muted-foreground">{texts.journal.stepAHelp}</p>
                <ZTextArea placeholder={texts.journal.situationPlaceholder} value={draft.situation} onChange={(e) => setSituation(e.target.value)} error={errors.situation} rows={4} />
                {draft.situation.trim().length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Черновик сохраняется автоматически — можно перейти в практику и вернуться.
                  </p>
                )}
              </motion.div>
            )}

            {/* Step B: Thoughts + Emotion */}
            {step === STEP_B && (
              <motion.div key="step-b" custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }} className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-foreground">{texts.journal.stepB}</h2>
                <p className="text-sm text-muted-foreground">{texts.journal.stepBHelp}</p>
                <ZTextArea placeholder={texts.journal.thoughtPlaceholder} value={draft.thoughts} onChange={(e) => setThoughts(e.target.value)} error={errors.thoughts} rows={4} />
                {checkCrisisKeywords(draft.thoughts) && (
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

                <div className="flex flex-col gap-2 rounded-2xl bg-lavender/5 border border-lavender/15 p-4">
                  <div className="flex flex-col gap-1">
                    <h3 className="text-sm font-semibold text-foreground">{texts.journal.thoughtPatternTitle}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{texts.journal.thoughtPatternHelp}</p>
                  </div>
                  <ThoughtPatternSelector value={selectedPattern} onChange={setSelectedPattern} />
                </div>
              </motion.div>
            )}

            {/* Step C: Physical */}
            {step === STEP_C && (
              <motion.div key="step-c" custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }} className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold text-foreground">{texts.journal.stepC}</h2>
                <p className="text-sm text-muted-foreground">{texts.journal.stepCHelp}</p>
                <ZTextArea placeholder={texts.journal.physicalPlaceholder} value={draft.physical} onChange={(e) => setPhysical(e.target.value)} rows={4} />
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
                  <ZSlider label={texts.journal.sudsLabel} value={draft.sudsBefore} onChange={setSudsBefore} min={0} max={100} step={5} />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1 px-1">
                    <span>{texts.journal.sudsLow}</span>
                    <span>{texts.journal.sudsHigh}</span>
                  </div>
                </ZCard>

                {/* Quick practice reminders */}
                <div className="rounded-2xl bg-terracotta/8 border border-terracotta/15 p-4">
                  <p className="text-sm font-medium text-foreground mb-2">{texts.journal.strongAnxietyPrompt}</p>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => navigate('breathing')} className="flex items-center gap-3 rounded-xl bg-card px-3 py-2.5 text-left hover:bg-muted transition-colors">
                      <Wind size={18} strokeWidth={1.5} className="text-primary shrink-0" />
                      <span className="text-sm text-foreground">{texts.journal.breathingQuick}</span>
                      <ArrowRight size={16} strokeWidth={1.5} className="text-muted-foreground shrink-0 ml-auto" />
                    </button>
                    <button onClick={() => navigate('grounding')} className="flex items-center gap-3 rounded-xl bg-card px-3 py-2.5 text-left hover:bg-muted transition-colors">
                      <TreePine size={18} strokeWidth={1.5} className="text-lavender shrink-0" />
                      <span className="text-sm text-foreground">{texts.journal.groundingQuick}</span>
                      <ArrowRight size={16} strokeWidth={1.5} className="text-muted-foreground shrink-0 ml-auto" />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Текст записи сохранится — вернёшься к этому же шагу.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step E: New View + reflection questions */}
            {step === STEP_E && (
              <motion.div key="step-e" custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }} className="flex flex-col gap-4">
                                <h2 className="text-lg font-semibold text-foreground">{texts.journal.stepE}</h2>
                <p className="text-sm text-muted-foreground">{texts.journal.stepEHelp}</p>

                {/* Выбранный узор мышления — описание, пример, вопросы для рефрейминга */}
                {selectedPattern && (
                  <div className="flex flex-col gap-3 rounded-2xl bg-lavender/8 border border-lavender/20 p-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-lavender">{texts.journal.thoughtPatternTitle}</span>
                      <p className="text-base font-semibold text-foreground">{selectedPattern.friendlyName}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">{selectedPattern.description}</p>
                    </div>
                    {selectedPattern.examples.length > 0 && (
                      <div className="flex flex-col gap-1 rounded-xl bg-card px-3 py-2.5">
                        <span className="text-xs font-medium text-muted-foreground">{texts.journal.thoughtPatternExample}</span>
                        <p className="text-sm text-foreground leading-relaxed">{selectedPattern.examples[0]}</p>
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-muted-foreground">{texts.journal.thoughtPatternReframing}</span>
                      {selectedPattern.reframingQuestions.map((q, i) => (
                        <p key={i} className="text-sm text-foreground leading-relaxed">• {q}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reflection questions — не кликабельные, с полями для ответов */}
                <div className="flex flex-col gap-4">
                  {texts.journal.reflectionQuestions.map((q, i) => (
                    <div key={i} className="flex flex-col gap-1.5">
                      <p className="text-sm text-foreground leading-relaxed">{q}</p>
                      <textarea
                        value={draft.reflectionAnswers[i] ?? ''}
                        onChange={(e) => setReflectionAnswer(i, e.target.value)}
                        placeholder={texts.journal.reflectionPlaceholder}
                        rows={2}
                        className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 resize-y"
                      />
                    </div>
                  ))}
                </div>

                <ZTextArea placeholder={texts.journal.newViewPlaceholder} value={draft.newView} onChange={(e) => setNewView(e.target.value)} error={errors.newView} rows={4} />

                {/* Motivation */}
                <div className="flex items-start gap-2 rounded-xl bg-primary/8 px-3 py-2">
                  <Sparkles size={16} strokeWidth={1.5} className="text-primary shrink-0 mt-0.5" />
                  <p className="text-xs text-primary/90 leading-relaxed">{texts.journal.reflectionMotivation}</p>
                </div>

                {/* SUDS After */}
                <ZCard className="pt-6 pb-2">
                  <ZSlider label={`${texts.journal.sudsLabel} (после)`} value={draft.sudsAfter} onChange={setSudsAfter} min={0} max={100} step={5} />
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
                    <p className="text-sm text-foreground">{draft.situation}</p>
                  </div>
                  <hr className="border-border" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{texts.journal.stepB}</span>
                    <p className="text-sm text-foreground">{draft.thoughts}</p>
                    {selectedEmotion && <ZBadge variant="primary" className="self-start mt-1">{selectedEmotion.name}</ZBadge>}
                    {selectedPattern && <ZBadge variant="secondary" className="self-start mt-1">{selectedPattern.friendlyName}</ZBadge>}
                  </div>
                  {draft.physical && (
                    <>
                      <hr className="border-border" />
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{texts.journal.stepC}</span>
                        <p className="text-sm text-foreground">{draft.physical}</p>
                      </div>
                    </>
                  )}
                  <hr className="border-border" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{texts.journal.sudsBeforeLabel}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${draft.sudsBefore}%` }} /></div>
                      <span className="text-sm font-semibold text-primary tabular-nums w-8 text-right">{draft.sudsBefore}</span>
                    </div>
                  </div>
                  <hr className="border-border" />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{texts.journal.stepE}</span>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{draft.newView}</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{texts.journal.sudsAfterLabel}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${anxietyIncreased ? 'bg-terracotta' : 'bg-primary'}`} style={{ width: `${draft.sudsAfter}%` }} /></div>
                      <span className={`text-sm font-semibold tabular-nums w-8 text-right ${anxietyIncreased ? 'text-terracotta' : 'text-primary'}`}>{draft.sudsAfter}</span>
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

                {!anxietyIncreased && draft.sudsAfter < draft.sudsBefore && (
                  <p className="text-sm text-primary font-medium text-center">
                    {texts.journal.anxietyDecreased.replace('{n}', String(draft.sudsBefore - draft.sudsAfter))}
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

/**
 * Скелетон для JournalWizard: пока черновик не загрузился из IndexedDB,
 * показываем пульсирующие плашки вместо пустой формы. Иначе пользователь
 * увидит пустые поля и решит, что данные потерялись.
 */
function JournalWizardSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-8 max-w-lg mx-auto w-full" aria-busy="true">
      <div className="h-2 w-full rounded-full bg-muted animate-pulse" />
      <div className="h-6 w-40 rounded bg-muted animate-pulse" />
      <div className="h-4 w-64 rounded bg-muted animate-pulse" />
      <div className="h-32 w-full rounded-2xl bg-muted animate-pulse" />
      <div className="h-12 w-full rounded-2xl bg-muted animate-pulse" />
    </div>
  );
}
