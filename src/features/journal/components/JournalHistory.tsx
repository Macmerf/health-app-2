'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Trash2, Plus } from 'lucide-react';
import { ZButton } from '@/shared/ui/ZButton';
import { ZCard } from '@/shared/ui/ZCard';
import { ZBadge } from '@/shared/ui/ZBadge';
import { useToast } from '@/shared/ui/ZToast';
import { texts } from '@/shared/constants/texts';
import { useJournalStore } from '../store';
import { FeatureGuide } from '@/shared/ui/FeatureGuide';
import { useRouterStore } from '@/shared/lib/stores';

const JOURNAL_GUIDE = {
  guideId: 'journal-history',
  title: 'Дневник эмоций',
  description: 'Здесь хранятся все твои записи. Каждая запись — разбор ситуации: что случилось, какие эмоции появились, что произошло в теле, и как можно посмотреть на свою жизнь с другой стороны.',
  steps: [
    'Нажми «+ Новая запись» внизу этой страницы или на главной',
    'В мастере по шагам опиши ситуацию, мысли и эмоции',
    'Отметь физические проявления (стучит сердце, потеют ладони)',
    'Оцени тревогу — шкала 0-100',
    'Попробуй посмотреть на свою жизнь с другой стороны, ответь на подсказки',
    'Если тревога выросла — приложение предложит упражнения',
  ],
  sections: [
    {
      title: 'Зачем это нужно?',
      body: 'Исследования показывают, что осознанная работа с эмоциями снижает тревогу. Записывая ситуации, ты учишься замечать свои реакции раньше и справляться быстрее.',
    },
    {
      title: 'Что такое шкала SUDS?',
      body: 'SUDS — шкала от 0 (полный покой) до 100 (максимальная тревога). Она помогает отслеживать динамику в цифрах и видеть прогресс.',
    },
  ],
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '...';
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] as const },
  }),
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

export function JournalHistory() {
  const entries = useJournalStore((s) => s.entries);
  const deleteEntry = useJournalStore((s) => s.deleteEntry);
  const { showToast } = useToast();
  const navigate = useRouterStore((s) => s.navigate);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const toggleExpand = useCallback((id: string) => { setExpandedId((prev) => (prev === id ? null : id)); }, []);

  const handleDelete = useCallback(
    (id: string) => { deleteEntry(id); setExpandedId(null); setConfirmDeleteId(null); showToast(texts.journal.deleted, 'info'); },
    [deleteEntry, showToast],
  );

  const cancelDelete = useCallback(() => { setConfirmDeleteId(null); }, []);

  const sorted = [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <FeatureGuide {...JOURNAL_GUIDE} />
      <div className="flex-1 px-4 py-4 max-w-lg mx-auto w-full">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
            <span className="text-4xl" aria-hidden="true">📓</span>
            <p className="text-sm text-muted-foreground">{texts.journal.emptyHistory}</p>
            <div className="rounded-2xl bg-primary/8 p-4 max-w-xs">
              <h4 className="text-sm font-semibold text-foreground mb-2">Как начать?</h4>
              <ol className="flex flex-col gap-1.5 text-left">
                <li className="text-xs text-muted-foreground leading-relaxed"><span className="font-medium text-primary">1.</span> Нажми синюю кнопку «Новая запись» ниже</li>
                <li className="text-xs text-muted-foreground leading-relaxed"><span className="font-medium text-primary">2.</span> Опиши ситуацию, выбери эмоцию, отметь что произошло в теле</li>
                <li className="text-xs text-muted-foreground leading-relaxed"><span className="font-medium text-primary">3.</span> Оцени тревогу и попробуй посмотреть на ситуацию иначе</li>
              </ol>
            </div>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="flex flex-col gap-3">
              {sorted.map((entry, i) => {
                const isExpanded = expandedId === entry.id;
                const isConfirming = confirmDeleteId === entry.id;

                return (
                  <motion.div key={entry.id} custom={i} variants={itemVariants} initial="hidden" animate="visible" exit="exit" layout>
                    <ZCard className="flex flex-col gap-0">
                      <button onClick={() => toggleExpand(entry.id)} className="flex flex-col gap-1.5 w-full text-left">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
                          {entry.emotionName && <ZBadge variant="primary">{truncate(entry.emotionName, 20)}</ZBadge>}
                        </div>
                        <p className="text-sm text-foreground font-medium">{truncate(entry.situation, 60)}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Тревога: {entry.sudsBefore}</span>
                          {entry.sudsAfter != null && <ZBadge variant="secondary">→ {entry.sudsAfter}</ZBadge>}
                        </div>
                        <div className="flex justify-end">
                          {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                            <hr className="border-border my-2" />
                            <div className="flex flex-col gap-2.5 pb-1">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{texts.journal.stepB}</span>
                                <p className="text-sm text-foreground">{entry.thoughts}</p>
                              </div>
                              {entry.physical && (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{texts.journal.stepC}</span>
                                  <p className="text-sm text-foreground">{entry.physical}</p>
                                </div>
                              )}
                              {entry.newView && (
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">{texts.journal.stepE}</span>
                                  <p className="text-sm text-foreground">{entry.newView}</p>
                                </div>
                              )}
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Уровень тревоги</span>
                                <div className="flex items-center gap-2">
                                  <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${entry.sudsBefore}%` }} /></div>
                                  <span className="text-xs font-semibold text-primary tabular-nums w-6 text-right">{entry.sudsBefore}</span>
                                </div>
                                {entry.sudsAfter != null && (
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary/60" style={{ width: `${entry.sudsAfter}%` }} /></div>
                                    <span className="text-xs font-semibold text-primary/60 tabular-nums w-6 text-right">{entry.sudsAfter}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex justify-end pt-2">
                                {isConfirming ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-terracotta">Точно удалить?</span>
                                    <ZButton variant="destructive" size="sm" onClick={() => handleDelete(entry.id)}>{texts.common.delete}</ZButton>
                                    <ZButton variant="ghost" size="sm" onClick={cancelDelete}>{texts.common.cancel}</ZButton>
                                  </div>
                                ) : (
                                  <ZButton variant="ghost" size="sm" onClick={() => setConfirmDeleteId(entry.id)} className="text-muted-foreground hover:text-terracotta">
                                    <Trash2 size={14} />{texts.common.delete}
                                  </ZButton>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </ZCard>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Floating new entry button */}
      <div className="fixed bottom-20 left-4 right-4 max-w-lg mx-auto z-20">
        <ZButton variant="primary" className="w-full gap-2" onClick={() => navigate('journal-new')}>
          <Plus size={20} strokeWidth={1.5} />
          {texts.journal.newEntry}
        </ZButton>
      </div>
    </div>
  );
}