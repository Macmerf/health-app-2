'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, BookOpen, Footprints, Heart, Wind, TreePine, HelpCircle, ShieldCheck } from 'lucide-react';
import { useOnboardingStore } from '@/shared/lib/onboarding-store';
import { ZButton } from './ZButton';

interface TourStep {
  title: string;
  body: string;
  icon: React.ReactNode;
  hint?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Добро пожаловать в ЗаботаPsy',
    body: 'ЗаботаPsy — это приложение, которое поможет тебе справиться с тревогой, стрессом, паническими атаками и просто тяжёлыми моментами. Здесь есть простые упражнения, дневник и план безопасности. Всё работает без интернета и бесплатно.',
    icon: <Heart size={40} strokeWidth={1.5} className="text-terracotta" />,
    hint: 'Листай вправо, чтобы узнать о каждом инструменте',
  },
  {
    title: 'Дневник эмоций',
    body: 'Запиши тревожную ситуацию, опиши свои мысли и эмоции, отметь что произошло в теле. Потом оцени тревогу до и после, попробуй посмотреть на свою жизнь с другой стороны. Ты увидишь, как меняется твое состояние.',
    icon: <BookOpen size={40} strokeWidth={1.5} className="text-primary" />,
    hint: 'Нажми «Новая запись» на главной или внизу вкладки «Дневник»',
  },
  {
    title: 'Лестница смелости',
    body: 'Страх заставляет избегать ситуаций, и от этого страх только растёт. Лестница смелости ломает этот круг: ты составляешь список шагов от самых простых к более сложным, и постепенно выполняешь их. С каждым шагом тревога снижается — мозг понимает, что опасности нет.',
    icon: <Footprints size={40} strokeWidth={1.5} className="text-sand" />,
    hint: 'Сначала создай лестницу со ступеньками, затем начни практику',
  },
  {
    title: 'План заботы',
    body: 'Твой личный план на тяжёлый момент: что помогает, контакты близких, безопасные места, фразы для поддержки себя. А внизу — дыхание и заземление в один тап. Доступно через красную кнопку с сердцем.',
    icon: <Heart size={40} strokeWidth={1.5} className="text-terracotta" />,
    hint: 'Красная кнопка с сердцем — быстрый доступ из любого экрана',
  },
  {
    title: 'Дыхание',
    body: 'Простая дыхательная практика: вдох 4 секунды, выдох 4 секунды. Следи за анимированным кругом. Помогает при остром приступе тревожности, а также панической атаке.',
    icon: <Wind size={40} strokeWidth={1.5} className="text-primary" />,
    hint: 'Можно использовать в любой момент прямо с главного экрана',
  },
  {
    title: 'Заземление 5-4-3-2-1',
    body: 'Техника, которая возвращает в момент через органы чувств: назови 5 вещей, которые видишь, 4 — потрогаешь, 3 — услышишь, 2 запаха, 1 вкус. Помогает прервать поток тревожных мыслей, особенно при дереализации и панических атаках.',
    icon: <TreePine size={40} strokeWidth={1.5} className="text-lavender" />,
    hint: 'Особенно полезно, когда мысли «уносят» тебя',
  },
  {
    title: 'Важно знать',
    body: 'ЗаботаPsy не заменяет консультацию врача. Если у тебя сильная тревога, панические атаки или другие тяжёлые состояния — обратись к специалисту. Это не слабость, это забота о себе.',
    icon: <ShieldCheck size={40} strokeWidth={1.5} className="text-primary" />,
    hint: 'Базовые упражнения всегда бесплатны',
  },
  {
    title: 'Готов!',
    body: 'Начни с дневника эмоций — это самая удобная точка входа. Или попробуй дыхание прямо сейчас. Если забудешь, что делает тот или иной инструмент — нажми ? в правом верхнем углу на любой странице.',
    icon: <HelpCircle size={40} strokeWidth={1.5} className="text-primary" />,
    hint: 'Кнопка ? доступна на каждой странице',
  },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -60 : 60,
    opacity: 0,
  }),
};

export function OnboardingTour() {
  const tourCompleted = useOnboardingStore((s) => s.tourCompleted);
  const completeTour = useOnboardingStore((s) => s.completeTour);

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const goNext = useCallback(() => {
    if (step < TOUR_STEPS.length - 1) {
      setDirection(1);
      setStep((s) => s + 1);
    } else {
      completeTour();
    }
  }, [step, completeTour]);

  const goPrev = useCallback(() => {
    if (step > 0) {
      setDirection(-1);
      setStep((s) => s - 1);
    }
  }, [step]);

  if (tourCompleted) return null;

  const currentStep = TOUR_STEPS[step];
  const isFirst = step === 0;
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      suppressHydrationWarning
    >
      <button
        onClick={completeTour}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
        aria-label="Пропустить тур"
      >
        <X size={20} strokeWidth={1.5} />
      </button>

      <div className="mx-6 w-full max-w-sm">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
            className="flex flex-col items-center gap-5 rounded-3xl bg-card p-8 shadow-soft-lg"
          >
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10">
              {currentStep.icon}
            </div>

            <div className="flex flex-col items-center gap-3 text-center">
              <h2 className="text-xl font-semibold text-foreground">
                {currentStep.title}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {currentStep.body}
              </p>
            </div>

            {currentStep.hint && (
              <div className="flex items-start gap-2 rounded-xl bg-primary/8 px-4 py-3 w-full">
                <HelpCircle size={16} strokeWidth={1.5} className="text-primary shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed text-primary/90">
                  {currentStep.hint}
                </p>
              </div>
            )}

            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step
                      ? 'w-6 bg-primary'
                      : 'w-1.5 bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center gap-3 mt-5">
          {!isFirst ? (
            <ZButton variant="ghost" onClick={goPrev} className="flex-1 gap-1">
              <ChevronLeft size={18} strokeWidth={1.5} />
              Назад
            </ZButton>
          ) : (
            <div className="flex-1" />
          )}

          <ZButton variant="primary" onClick={goNext} className="flex-1 gap-1">
            {isLast ? 'Начать' : 'Далее'}
            {!isLast && <ChevronRight size={18} strokeWidth={1.5} />}
          </ZButton>
        </div>
      </div>
    </motion.div>
  );
}
