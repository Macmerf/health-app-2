'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ChevronRight, Footprints, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

import { ZCard } from '@/shared/ui/ZCard';
import { ZButton } from '@/shared/ui/ZButton';
import { useToast } from '@/shared/ui/ZToast';
import { useRouterStore } from '@/shared/lib/stores';
import { useExposureStore } from '../store';
import { texts } from '@/shared/constants/texts';
import { FeatureGuide } from '@/shared/ui/FeatureGuide';

const EXPOSURE_GUIDE = {
  guideId: 'exposure-list',
  title: 'Лестница смелости',
  description: 'Лестница смелости — проверенный способ работы со страхами. Ты постепенно сталкиваешься с тем, что боишься, начиная с лёгких ситуаций. Со временем тревога снижается (привыкание).',
  steps: [
    'Нажми синюю кнопку «Создать лестницу»',
    'Придумай название страха — например, «страх звонить по телефону»',
    'Добавь ступеньки: от самых лёгких к сложным. Например: «подумать о звонке» (лёгкая) → «позвонить другу» (средняя) → «позвонить незнакомцу» (сложная)',
    'Каждой ступеньке поставь уровень тревоги (SUDS): чем страшнее — тем выше число',
    'Перетаскивай ступеньки за значок ≡, чтобы упорядочить',
    'Нажми «Сохранить» — лестница готова',
    'Нажми на лестницу в списке — начнётся практика с таймером',
    'Во время практики каждые 30 сек приложение спрашивает тревогу. Нажми «Остановить» когда будешь готов.',
    'После практики напиши рефлексию — что заметил',
  ],
  sections: [
    {
      title: 'Зачем нужна лестница?',
      body: 'Когда мы боимся чего-то, мы избегаем это. Но избегание только усиливает страх — мозг думает: «Я избегаю, значит реально опасно». Лестница смелости ломает этот круг: ты постепенно сталкиваешься со страхом, и мозг понимает, что опасности нет. С каждым разом тревога снижается — это называется привыканием.',
    },
    {
      title: 'Нужно ли выполнять все шаги?',
      body: 'Нет, это не обязательно. Начни с самых простых ступенек (SUDS 10-30). Если чувствуешь, что готов — переходи к следующей. Если слишком страшно — остановись и попробуй в другой день. Это не гонка.',
    },
    {
      title: 'Что делать с результатами?',
      body: 'После каждой практики приложение записывает, как менялась тревога. Через несколько практик ты увидишь на графике, что тревога снижается — это мотивирует продолжать. Но даже если пока не видишь прогресс — это нормально, привыкание требует времени.',
    },
  ],
};

const formatDate = (iso: string) => {
  try {
    return format(new Date(iso), 'd MMM yyyy', { locale: ru });
  } catch {
    return iso;
  }
};

export function HierarchyList() {
  const hierarchies = useExposureStore((s) => s.hierarchies);
  const deleteHierarchy = useExposureStore((s) => s.deleteHierarchy);
  const navigate = useRouterStore((s) => s.navigate);
  const { showToast } = useToast();

  const handleStartSession = (hierarchyId: string) => {
    const hierarchy = hierarchies.find((h) => h.id === hierarchyId);
    if (!hierarchy) return;

    // Find the lowest-suds step that hasn't been practiced (or first step)
    const firstStep = hierarchy.steps.length > 0
      ? [...hierarchy.steps].sort((a, b) => a.order - b.order)[0]
      : null;

    if (!firstStep) {
      showToast('В лестнице нет ступенек', 'error');
      return;
    }

    navigate('exposure-session', {
      hierarchyId,
      stepId: firstStep.id,
    });
  };

  const handleDelete = (id: string, title: string) => {
    deleteHierarchy(id);
    showToast(`«${title}» удалена`, 'success');
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <FeatureGuide {...EXPOSURE_GUIDE} />

      <div className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
        {/* Create button */}
        <ZButton
          variant="primary"
          className="w-full mb-4 gap-2"
          onClick={() => navigate('exposure-new')}
        >
          <Plus size={20} strokeWidth={1.5} />
          Создать лестницу
        </ZButton>

        {/* Empty state */}
        {hierarchies.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center gap-4 py-12 text-center"
          >
            <Footprints size={48} strokeWidth={1.5} className="text-muted-foreground/50" />
            <p className="text-lg font-medium text-muted-foreground">
              {texts.common.noData}
            </p>

            <div className="rounded-2xl bg-sand/10 p-4 max-w-xs">
              <h4 className="text-sm font-semibold text-foreground mb-2">Как начать?</h4>
              <ol className="flex flex-col gap-1.5 text-left">
                <li className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-sand">1.</span> Нажми синюю кнопку «Создать лестницу» выше
                </li>
                <li className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-sand">2.</span> Придумай название — например, «страх звонить по телефону»
                </li>
                <li className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-sand">3.</span> Добавь ступеньки: начни с лёгких (подумать о звонке, SUDS 15) и закончи сложными (позвонить, SUDS 80)
                </li>
                <li className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-sand">4.</span> Перетаскивай за ≡ чтобы упорядочить. Нажми «Сохранить»
                </li>
                <li className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-medium text-sand">5.</span> Нажми на сохранённую лестницу — начнётся практика
                </li>
              </ol>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="flex flex-col gap-3">
              {hierarchies.map((hierarchy, index) => (
                <motion.div
                  key={hierarchy.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.25, delay: index * 0.05 }}
                >
                  <ZCard
                    variant="elevated"
                    onClick={() => handleStartSession(hierarchy.id)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 shrink-0">
                        <Footprints size={20} strokeWidth={1.5} className="text-primary" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-foreground">
                          {hierarchy.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {hierarchy.steps.length}{' '}
                          {hierarchy.steps.length === 1 ? 'ступенька' : 'ступенек'}
                          {' · '}
                          {formatDate(hierarchy.createdAt)}
                        </p>
                        {/* Показ ступенек */}
                        <div className="mt-2 flex flex-col gap-1">
                          {hierarchy.steps
                            .slice()
                            .sort((a, b) => a.order - b.order)
                            .map((step, si) => (
                              <div key={step.id} className="flex items-center gap-2 text-xs text-muted-foreground leading-relaxed">
                                <span className="shrink-0 font-medium text-primary tabular-nums w-5 text-right">{si + 1}.</span>
                                <span className="break-words">{step.name}</span>
                                <span className="shrink-0 text-primary/70 tabular-nums">{step.initialSuds}</span>
                              </div>
                            ))}
                        </div>
                        <p className="text-xs text-primary mt-1">Нажми, чтобы начать практику</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(hierarchy.id, hierarchy.title);
                          }}
                          className="rounded-lg p-2 text-muted-foreground hover:text-terracotta transition-colors"
                          aria-label={`Удалить ${hierarchy.title}`}
                        >
                          <Trash2 size={18} strokeWidth={1.5} />
                        </button>
                        <ChevronRight
                          size={20}
                          strokeWidth={1.5}
                          className="text-muted-foreground/50"
                          aria-hidden="true"
                        />
                      </div>
                    </div>
                  </ZCard>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
