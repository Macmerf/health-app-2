'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { ZCard } from '@/shared/ui/ZCard';
import { ZButton } from '@/shared/ui/ZButton';
import { FeatureGate } from '@/features/payments';
import { useCareTreeStore } from '@/shared/lib/stores';

const BODY_PARTS = [
  { name: 'Лоб и лицо', instruction: 'Сфокусируй внимание на лбу, глазах, челюсти. Расслабь мышцы лица. Почувствуй тепло.' },
  { name: 'Шея и плечи', instruction: 'Обрати внимание на шею и плечи. Часто здесь держится напряжение. Позволь им опуститься.' },
  { name: 'Руки', instruction: 'Почувствуй свои руки от плеч до кончиков пальцев. Расслабь кисти и пальцы.' },
  { name: 'Грудь и спина', instruction: 'Обрати внимание на дыхание. Грудь расширяется и сжимается. Спина опирается на что-то устойчивое.' },
  { name: 'Живот', instruction: 'Положи руку на живот. Почувствуй, как он поднимается и опускается с каждым вдохом.' },
  { name: 'Бёдра', instruction: 'Переведи внимание на бёдра. Расслабь мышцы. Позволь ногам быть тяжёлыми и расслабленными.' },
  { name: 'Голени и стопы', instruction: 'Почувствуй голени, лодыжки и стопы. Представь, как напряжение стекает вниз и уходит в землю.' },
  { name: 'Всё тело', instruction: 'Теперь почувствуй всё тело целиком. Ты здесь, ты в безопасности. Поблагодари себя за эту практику.' },
];

const PART_DURATION = 20; // секунд на каждую часть

export function BodyScan() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPart, setCurrentPart] = useState(0);
  const [timeLeft, setTimeLeft] = useState(PART_DURATION);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const addPractice = useCareTreeStore((s) => s.addPractice);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentPart(0);
    setTimeLeft(PART_DURATION);
    setIsComplete(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const complete = useCallback(() => {
    setIsPlaying(false);
    setIsComplete(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    addPractice();
  }, [addPractice]);

  useEffect(() => {
    if (!isPlaying) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (currentPart >= BODY_PARTS.length - 1) {
            complete();
            return 0;
          }
          setCurrentPart((p) => p + 1);
          return PART_DURATION;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, currentPart, complete]);

  const part = BODY_PARTS[currentPart];
  const progress = ((PART_DURATION - timeLeft) / PART_DURATION) * 100;
  const totalProgress = ((currentPart * PART_DURATION + (PART_DURATION - timeLeft)) / (BODY_PARTS.length * PART_DURATION)) * 100;

  return (
    <FeatureGate featureKey='body_scan'>
      <div className='space-y-6'>
        <ZCard className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium text-foreground'>Сканирование тела</p>
              <p className='text-xs text-muted-foreground mt-0.5'>Прогрессивная релаксация — 3 минуты</p>
            </div>
            <button onClick={reset} className='p-2 rounded-xl hover:bg-muted transition-colors'>
              <RotateCcw size={18} className='text-muted-foreground' />
            </button>
          </div>

          {/* Общий прогресс */}
          <div className='space-y-1'>
            <div className='h-1.5 rounded-full bg-muted overflow-hidden'>
              <motion.div className='h-full rounded-full bg-primary' style={{ width: `${totalProgress}%` }} />
            </div>
            <div className='flex justify-between text-[10px] text-muted-foreground'>
              <span>{currentPart + 1} / {BODY_PARTS.length}</span>
              <span>{part.name}</span>
            </div>
          </div>

          {/* Текущая часть */}
          <AnimatePresence mode='wait'>
            {!isComplete ? (
              <motion.div
                key={currentPart}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className='text-center space-y-4 py-4'
              >
                <p className='text-lg font-semibold text-foreground'>{part.name}</p>
                <p className='text-sm text-muted-foreground leading-relaxed px-4'>{part.instruction}</p>

                {/* Таймер круг */}
                <div className='flex items-center justify-center pt-2'>
                  <div className='relative w-16 h-16'>
                    <svg viewBox='0 0 64 64' className='w-16 h-16 -rotate-90'>
                      <circle cx='32' cy='32' r='28' fill='none' stroke='var(--color-muted)' strokeWidth='3' />
                      <circle
                        cx='32' cy='32' r='28' fill='none' stroke='var(--color-primary)' strokeWidth='3'
                        strokeLinecap='round'
                        strokeDasharray={`${2 * Math.PI * 28}`}
                        strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
                        className='transition-all duration-1000'
                      />
                    </svg>
                    <span className='absolute inset-0 flex items-center justify-center text-sm font-medium text-foreground'>
                      {timeLeft}
                    </span>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key='complete'
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className='text-center space-y-3 py-6'
              >
                <p className='text-2xl'>🌿</p>
                <p className='text-base font-semibold text-foreground'>Практика завершена</p>
                <p className='text-sm text-muted-foreground'>Ты позаботился о себе — и это уже победа</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Кнопка */}
          {!isComplete && (
            <ZButton
              variant='primary'
              className='w-full'
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <><Pause size={18} /> Пауза</> : <><Play size={18} /> Начать</>}
            </ZButton>
          )}
        </ZCard>

        <p className='text-xs text-muted-foreground text-center'>
          Сканирование тела помогает заметить напряжение и постепенно его отпустить.
          Полезно при тревоге, бессоннице и панических атаках.
        </p>
      </div>
    </FeatureGate>
  );
}
