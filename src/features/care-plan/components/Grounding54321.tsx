'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Hand, Ear, Flower2, Cherry, Sparkles } from 'lucide-react';
import { ZHeader } from '@/shared/ui/ZHeader';
import { ZCard } from '@/shared/ui/ZCard';
import { ZInput } from '@/shared/ui/ZInput';
import { ZButton } from '@/shared/ui/ZButton';
import { ZProgressBar } from '@/shared/ui/ZProgressBar';
import { texts } from '@/shared/constants/texts';
import { FeatureGuide } from '@/shared/ui/FeatureGuide';
import { useCareTreeStore } from '@/shared/lib/stores';

// --- Step configuration ---
interface GroundingStep {
  key: string;
  sense: string;
  instruction: string;
  count: number;
  icon: React.ReactNode;
}

const STEPS: GroundingStep[] = [
  {
    key: 'vision',
    sense: 'Зрение',
    instruction: texts.carePlan.groundingVision,
    count: 5,
    icon: <Eye size={20} strokeWidth={1.5} />,
  },
  {
    key: 'touch',
    sense: 'Осязание',
    instruction: texts.carePlan.groundingTouch,
    count: 4,
    icon: <Hand size={20} strokeWidth={1.5} />,
  },
  {
    key: 'hearing',
    sense: 'Слух',
    instruction: texts.carePlan.groundingHearing,
    count: 3,
    icon: <Ear size={20} strokeWidth={1.5} />,
  },
  {
    key: 'smell',
    sense: 'Обоняние',
    instruction: texts.carePlan.groundingSmell,
    count: 2,
    icon: <Flower2 size={20} strokeWidth={1.5} />,
  },
  {
    key: 'taste',
    sense: 'Вкус',
    instruction: texts.carePlan.groundingTaste,
    count: 1,
    icon: <Cherry size={20} strokeWidth={1.5} />,
  },
];

const TOTAL_STEPS = STEPS.length;

// --- Step transition animation ---
const stepVariants = {
  enter: { x: 60, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -60, opacity: 0 },
};

export function Grounding54321() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const addPractice = useCareTreeStore((s) => s.addPractice);
  // Values keyed by step index: stepIndex -> array of string values
  const [values, setValues] = useState<Record<number, string[]>>(() => {
    const initial: Record<number, string[]> = {};
    STEPS.forEach((step, idx) => {
      initial[idx] = Array.from({ length: step.count }, () => '');
    });
    return initial;
  });

  const step = STEPS[currentStep];

  const updateValue = useCallback((stepIdx: number, inputIdx: number, val: string) => {
    setValues((prev) => {
      const updated = { ...prev };
      updated[stepIdx] = [...(updated[stepIdx] ?? [])];
      updated[stepIdx][inputIdx] = val;
      return updated;
    });
  }, []);

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setIsComplete(true);
      addPractice();
    }
  }, [currentStep, addPractice]);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setIsComplete(false);
    const initial: Record<number, string[]> = {};
    STEPS.forEach((s, idx) => {
      initial[idx] = Array.from({ length: s.count }, () => '');
    });
    setValues(initial);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <ZHeader title={texts.carePlan.groundingTitle} />

      <div className="flex flex-col gap-5 px-4 pb-8 pt-4 max-w-lg mx-auto w-full">
        <FeatureGuide
          guideId='grounding'
          title='Заземление 5-4-3-2-1'
          description='Техника возвращения в момент через органы чувств. Когда тревога уносит мысли в будущее или прошлое, это упражнение возвращает тебя в «здесь и сейчас».'
          steps={[
            'Шаг 1 (Зрение): назови 5 вещей, которые ты видишь прямо сейчас. Впиши в поля.',
            'Шаг 2 (Осязание): назови 4 вещи, которые можешь потрогать',
            'Шаг 3 (Слух): 3 звука, которые слышишь сейчас',
            'Шаг 4 (Обоняние): 2 запаха, которые чувствуешь',
            'Шаг 5 (Вкус): 1 вкус, который ощущаешь',
            'Нажми «Следующая группа чувств» после каждого шага',
          ]}
        />

        {/* Progress indicator */}
        <ZProgressBar steps={TOTAL_STEPS} currentStep={currentStep + 1} />

        {/* Step content */}
        <div className="relative overflow-hidden min-h-[320px]">
          <AnimatePresence mode="wait">
            {!isComplete && (
              <motion.div
                key={`step-${currentStep}`}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
                className="flex flex-col gap-4"
              >
                {/* Sense header */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                    {step.icon}
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-lg font-semibold text-foreground">
                      {step.sense}
                    </h2>
                    <span className="text-xs text-muted-foreground">
                      Шаг {currentStep + 1} из {TOTAL_STEPS}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  {step.instruction}
                </p>

                {/* Inputs */}
                <ZCard>
                  <div className="flex flex-col gap-3">
                    {Array.from({ length: step.count }).map((_, idx) => (
                      <ZInput
                        key={`${step.key}-${idx}`}
                        placeholder={`Вещь ${idx + 1}...`}
                        value={values[currentStep]?.[idx] ?? ''}
                        onChange={(e) => updateValue(currentStep, idx, e.target.value)}
                      />
                    ))}
                  </div>
                </ZCard>
              </motion.div>
            )}

            {/* Completion screen */}
            {isComplete && (
              <motion.div
                key="complete"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
                className="flex flex-col items-center justify-center gap-6 min-h-[320px] text-center"
              >
                <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 text-primary">
                  <Sparkles size={36} strokeWidth={1.5} />
                </div>

                <div className="flex flex-col gap-2">
                  <h2 className="text-xl font-semibold text-foreground">
                    {texts.carePlan.groundingComplete}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Каждый раз, когда ты делаешь это упражнение, ты учишься помогать себе. Ты молодец.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-auto pt-4">
          {isComplete ? (
            <ZButton variant="primary" onClick={handleReset} className="flex-1">
              Начать заново
            </ZButton>
          ) : (
            <ZButton variant="primary" onClick={handleNext} className="flex-1">
              {texts.carePlan.groundingNext}
            </ZButton>
          )}
        </div>
      </div>
    </div>
  );
}
