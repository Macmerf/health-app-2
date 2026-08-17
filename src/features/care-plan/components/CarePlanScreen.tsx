'use client';

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Wind, ArrowDownUp } from 'lucide-react';
import { ZCard } from '@/shared/ui/ZCard';
import { ZTextArea } from '@/shared/ui/ZTextArea';
import { ZButton } from '@/shared/ui/ZButton';
import { useToast } from '@/shared/ui/ZToast';
import { useRouterStore } from '@/shared/lib/stores';
import { texts } from '@/shared/constants/texts';
import { useCarePlanStore } from '../store';
import { FeatureGuide } from '@/shared/ui/FeatureGuide';

const CARE_PLAN_GUIDE = {
  guideId: 'care-plan',
  title: 'План заботы',
  description: 'Твой персональный план безопасности. Он нужен, чтобы в тяжёлый момент тебе не пришлось думать — что делать. Все важные данные уже записаны, а практики в один тап.',
  steps: [
    'Заполни «Признаки усталости» — что подсказывает, что ты устаёшь',
    'Заполни «Что помогает» — что обычно делает тебе лучше',
    'Заполни «Контакты для поддержки» — кому можно позвонить',
    'Заполни «Безопасные места» — где тебе спокойно',
    'Заполни «Фразы для поддержки себя» — что сказать себе в тяжёлый момент',
    'Заполни «Мои триггеры» — что обычно запускает тревогу',
    'Данные сохраняются автоматически, когда ты выходишь из поля',
    'Быстрые практики (дыхание и заземление) — ниже',
  ],
  sections: [
    {
      title: 'Зачем это нужно?',
      body: 'В момент сильной тревоги или паники мозг плохо соображает. Если план заботы заранее записан, тебе достаточно его открыть — и всё под рукой. Это часть психотерапевтической практики безопасности.',
    },
    {
      title: 'Быстрый доступ',
      body: 'Красная кнопка с сердцем внизу экрана — это быстрый доступ к плану заботы. Она доступна из любого экрана, даже во время дневника или лестницы. Нажми на неё в следующий раз, когда почувствуешь тревогу.',
    },
    {
      title: 'Важно',
      body: 'План заботы — это полезный инструмент, но он не заменяет консультацию врача или психотерапевта. Если тревога не проходит или усиливается — обратись к специалисту.',
    },
  ],
};

export function CarePlanScreen() {
  const fatigueSigns = useCarePlanStore((s) => s.fatigueSigns);
  const whatHelps = useCarePlanStore((s) => s.whatHelps);
  const contacts = useCarePlanStore((s) => s.contacts);
  const safePlaces = useCarePlanStore((s) => s.safePlaces);
  const selfTalk = useCarePlanStore((s) => s.selfTalk);
  const triggers = useCarePlanStore((s) => s.triggers);
  const updateField = useCarePlanStore((s) => s.updateField);
  const navigate = useRouterStore((s) => s.navigate);
  const { showToast } = useToast();

  const handleBlur = useCallback(
    (
      field: 'fatigueSigns' | 'whatHelps' | 'contacts' | 'safePlaces' | 'selfTalk' | 'triggers',
      value: string,
    ) => {
      updateField(field, value);
      showToast(texts.carePlan.saved, 'success');
    },
    [updateField, showToast],
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <FeatureGuide {...CARE_PLAN_GUIDE} />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
        className="flex flex-col gap-5 px-4 pb-8 pt-4 max-w-lg mx-auto w-full"
      >
        {/* Признаки усталости */}
        <ZCard>
          <ZTextArea
            label={texts.carePlan.fatigueSigns}
            placeholder={texts.carePlan.fatigueSignsPlaceholder}
            defaultValue={fatigueSigns}
            rows={3}
            onBlur={(e) => handleBlur('fatigueSigns', e.target.value)}
            helperText="Опиши, как ты понимаешь, что устаёшь. Это поможет заметить усталость раньше."
          />
        </ZCard>

        {/* Что помогает */}
        <ZCard>
          <ZTextArea
            label={texts.carePlan.whatHelps}
            placeholder={texts.carePlan.whatHelpsPlaceholder}
            defaultValue={whatHelps}
            rows={3}
            onBlur={(e) => handleBlur('whatHelps', e.target.value)}
            helperText="Что реально помогает тебе почувствовать лучше? Запиши, чтобы не забыть в тревожный момент."
          />
        </ZCard>

        {/* Контакты для поддержки */}
        <ZCard>
          <ZTextArea
            label={texts.carePlan.contacts}
            placeholder={texts.carePlan.contactsPlaceholder}
            defaultValue={contacts}
            rows={3}
            onBlur={(e) => handleBlur('contacts', e.target.value)}
            helperText="Человек, которому можно позвонить в любой момент. Запиши имя и номер."
          />
        </ZCard>

        {/* Безопасные места */}
        <ZCard>
          <ZTextArea
            label={texts.carePlan.safePlaces}
            placeholder={texts.carePlan.safePlacesPlaceholder}
            defaultValue={safePlaces}
            rows={3}
            onBlur={(e) => handleBlur('safePlaces', e.target.value)}
            helperText="Места, где тебе спокойно и безопасно. В моменты тревоги полезно туда отправиться — хотя бы мысленно."
          />
        </ZCard>

        {/* Фразы для поддержки себя */}
        <ZCard>
          <ZTextArea
            label={texts.carePlan.selfTalk}
            placeholder={texts.carePlan.selfTalkPlaceholder}
            defaultValue={selfTalk}
            rows={3}
            onBlur={(e) => handleBlur('selfTalk', e.target.value)}
            helperText="Фразы, которые напомнят тебе, что ты справляешься. В тревожный момент мозг пугает — эти фразы помогут вернуться к реальности."
          />
        </ZCard>

        {/* Мои триггеры */}
        <ZCard>
          <ZTextArea
            label={texts.carePlan.triggers}
            placeholder={texts.carePlan.triggersPlaceholder}
            defaultValue={triggers}
            rows={3}
            onBlur={(e) => handleBlur('triggers', e.target.value)}
            helperText="Если знаешь свои триггеры, можно заранее подготовиться. Это снижает эффект неожиданности и тревогу."
          />
        </ZCard>

        {/* Быстрые ссылки на упражнения */}
        <ZCard variant="elevated" className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-foreground">
            Упражнения для тяжёлых моментов
          </h3>
          <p className="text-sm text-muted-foreground">
            Нажми на любую практику — она запустится прямо сейчас.
          </p>

          <div className="flex flex-col gap-3">
            <ZButton
              variant="secondary"
              className="w-full justify-start gap-3"
              onClick={() => navigate('breathing')}
            >
              <Wind size={20} strokeWidth={1.5} />
              <div className="flex flex-col items-start">
                <span>{texts.carePlan.breathingTitle}</span>
                <span className="text-xs text-muted-foreground font-normal">Вдох 4 сек, выдох 4 сек — успокаивает нервную систему</span>
              </div>
            </ZButton>

            <ZButton
              variant="secondary"
              className="w-full justify-start gap-3"
              onClick={() => navigate('grounding')}
            >
              <ArrowDownUp size={20} strokeWidth={1.5} />
              <div className="flex flex-col items-start">
                <span>{texts.carePlan.groundingTitle}</span>
                <span className="text-xs text-muted-foreground font-normal">5-4-3-2-1: вернись в момент через органы чувств</span>
              </div>
            </ZButton>
          </div>
        </ZCard>
      </motion.div>
    </div>
  );
}
