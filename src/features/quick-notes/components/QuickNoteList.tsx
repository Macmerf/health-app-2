'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, BookOpen, ChevronRight } from 'lucide-react';
import { ZCard } from '@/shared/ui/ZCard';
import { ZButton } from '@/shared/ui/ZButton';
import { ZTextArea } from '@/shared/ui/ZTextArea';
import { ZBadge } from '@/shared/ui/ZBadge';
import { useToast } from '@/shared/ui/ZToast';
import { useQuickNotesStore } from '../store';
import { useJournalDraftStore } from '@/features/journal/draftStore';
import { emotionById } from '@/features/journal/data/emotions';
import { useRouterStore } from '@/shared/lib/stores';
import { useHydrated } from '@/shared/lib/storage';
import { texts } from '@/shared/constants/texts';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const formatDate = (iso: string) => {
  try {
    return format(new Date(iso), 'd MMM, HH:mm', { locale: ru });
  } catch {
    return iso;
  }
};

export function QuickNoteList() {
  const notes = useQuickNotesStore((s) => s.notes);
  const addNote = useQuickNotesStore((s) => s.addNote);
  const deleteNote = useQuickNotesStore((s) => s.deleteNote);
  const markConverted = useQuickNotesStore((s) => s.markConverted);
  const patchDraft = useJournalDraftStore((s) => s.patch);
  const navigate = useRouterStore((s) => s.navigate);
  const { showToast } = useToast();
  const hydrated = useHydrated('zabotapsy-quick-notes');

  const [draft, setDraft] = useState('');

  const handleAdd = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    addNote(text);
    setDraft('');
  }, [draft, addNote]);

  const handleConvert = useCallback(
    (noteId: string) => {
      const note = notes.find((n) => n.id === noteId);
      if (!note) return;
      patchDraft({
        situation: note.text,
        selectedEmotionId: note.emotionId ?? null,
        step: 0,
      });
      markConverted(noteId, '__pending__');
      navigate('journal-new');
      showToast('Текст заметки подставлен в поле «Ситуация»', 'info');
    },
    [notes, patchDraft, markConverted, navigate, showToast],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteNote(id);
    },
    [deleteNote],
  );

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-foreground">Быстрые заметки</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Запиши мысль или ситуацию одним предложением — потом разберёшь подробно в дневнике.
        </p>
      </div>

      <ZCard className="flex flex-col gap-3">
        <ZTextArea
          placeholder="Что сейчас тревожит или занимает мысли?"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
        />
        <ZButton
          variant="primary"
          onClick={handleAdd}
          disabled={!draft.trim()}
          className="self-end"
        >
          <Plus size={16} className="mr-1" />
          Сохранить заметку
        </ZButton>
      </ZCard>

      {!hydrated ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card p-4 space-y-2">
              <div className="h-3 w-32 rounded bg-muted animate-pulse" />
              <div className="h-4 w-full rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <span className="text-3xl" aria-hidden="true">✏️</span>
          <p className="text-sm text-muted-foreground">
            Пока заметок нет. Когда поймаешь тревожную мысль — запиши её здесь.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            {notes.length} {notes.length === 1 ? 'заметка' : notes.length < 5 ? 'заметки' : 'заметок'}
          </p>
          <AnimatePresence mode="popLayout">
            {notes.map((note) => {
              const emotion = note.emotionId ? emotionById(note.emotionId) : null;
              const converted = !!note.journalEntryId;
              return (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.25 }}
                >
                  <ZCard>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(note.createdAt)}
                        </span>
                        {emotion && (
                          <ZBadge variant="primary">{emotion.name}</ZBadge>
                        )}
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {note.text}
                      </p>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        {converted ? (
                          <span className="text-xs text-primary font-medium">
                            Уже в дневнике
                          </span>
                        ) : (
                          <button
                            onClick={() => handleConvert(note.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                          >
                            <BookOpen size={14} strokeWidth={1.5} />
                            Разобрать в дневнике
                            <ChevronRight size={12} strokeWidth={1.5} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-terracotta transition-colors"
                          aria-label="Удалить заметку"
                        >
                          <Trash2 size={14} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  </ZCard>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground text-center pt-2">
        {texts.common.disclaimer}
      </p>
    </div>
  );
}
