'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ZCard } from '@/shared/ui/ZCard';
import { ZButton } from '@/shared/ui/ZButton';
import { FeatureGate } from '@/features/payments';
import { useMoodStore } from '@/shared/lib/stores';

const MOODS = [
  { value: 1, emoji: '😞', label: 'Очень плохо' },
  { value: 2, emoji: '😕', label: 'Плохо' },
  { value: 3, emoji: '😐', label: 'Нормально' },
  { value: 4, emoji: '🙂', label: 'Хорошо' },
  { value: 5, emoji: '😊', label: 'Отлично' },
];

function MoodEmoji({ value, size = 32 }: { value: number; size?: number }) {
  const m = MOODS.find((m) => m.value === value);
  return <span style={{ fontSize: size, lineHeight: 1 }}>{m?.emoji ?? '—'}</span>;
}

function MiniCalendar() {
  const getEntryForDate = useMoodStore((s) => s.getEntryForDate);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weekStart = firstDay === 0 ? 6 : firstDay - 1;

  const days: (number | null)[] = [];
  for (let i = 0; i < weekStart; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">
        {today.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
      </p>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((d) => (
          <div key={d} className="text-center text-[10px] text-muted-foreground py-1">{d}</div>
        ))}
        {days.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const entry = getEntryForDate(dateStr);
          const isToday = day === today.getDate();
          return (
            <div
              key={day}
              className={`aspect-square flex items-center justify-center rounded-lg text-xs ${
                isToday ? 'ring-2 ring-primary/40 bg-primary/5' : ''
              } ${entry ? 'bg-primary/10' : ''}`}
            >
              {entry ? <MoodEmoji value={entry.mood} size={16} /> : <span className="text-muted-foreground">{day}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekChart() {
  const getEntriesForRange = useMoodStore((s) => s.getEntriesForRange);

  const last7 = useMemo(() => {
    const result: { date: string; label: string; mood: number | null }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('ru-RU', { weekday: 'short' });
      const entries = getEntriesForRange(dateStr, dateStr);
      result.push({ date: dateStr, label, mood: entries.length > 0 ? entries[0].mood : null });
    }
    return result;
  }, [getEntriesForRange]);

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">За последние 7 дней</p>
      <div className="flex items-end justify-between gap-2 h-28">
        {last7.map((d) => (
          <div key={d.date} className="flex flex-col items-center gap-1 flex-1">
            <div className="w-full flex items-end justify-center" style={{ height: 80 }}>
              {d.mood !== null ? (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(d.mood / 5) * 100}%` }}
                  transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
                  className="w-6 rounded-lg bg-primary/30 relative"
                  style={{ minHeight: 8 }}
                >
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2">
                    <MoodEmoji value={d.mood} size={14} />
                  </span>
                </motion.div>
              ) : (
                <div className="w-6 rounded-lg bg-muted" style={{ height: 4 }} />
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MoodTracker() {
  const [selected, setSelected] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const addEntry = useMoodStore((s) => s.addEntry);
  const getEntryForDate = useMoodStore((s) => s.getEntryForDate);

  const today = new Date().toISOString().split('T')[0];
  const todayEntry = getEntryForDate(today);

  const handleSave = () => {
    if (selected === null) return;
    addEntry(selected, note || undefined);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <FeatureGate featureKey="mood_tracker">
      <div className="space-y-6">
        {/* Выбор настроения */}
        <ZCard className="space-y-4">
          <p className="text-sm font-medium text-foreground">Как ты себя чувствуешь сейчас?</p>
          {todayEntry && !selected && (
            <p className="text-xs text-muted-foreground">
              Сегодня: <MoodEmoji value={todayEntry.mood} size={16} /> {MOODS.find(m => m.value === todayEntry.mood)?.label}
              {todayEntry.note && ` — ${todayEntry.note}`}
            </p>
          )}
          <div className="flex justify-between gap-2">
            {MOODS.map((m) => (
              <button
                key={m.value}
                onClick={() => { setSelected(m.value); setSaved(false); }}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-xl transition-all duration-200 ${
                  selected === m.value
                    ? 'bg-primary/15 ring-2 ring-primary/40 scale-105'
                    : 'hover:bg-muted'
                }`}
              >
                <span style={{ fontSize: 28, lineHeight: 1 }}>{m.emoji}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{m.label}</span>
              </button>
            ))}
          </div>
          {selected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3"
            >
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Что случилось? (необязательно)"
                className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                maxLength={200}
              />
              <ZButton
                variant="primary"
                size="sm"
                className="w-full"
                onClick={handleSave}
              >
                {saved ? 'Сохранено ✓' : 'Записать'}
              </ZButton>
            </motion.div>
          )}
        </ZCard>

        {/* Мини-календарь */}
        <ZCard>
          <MiniCalendar />
        </ZCard>

        {/* График за неделю */}
        <ZCard>
          <WeekChart />
        </ZCard>

        {/* Подсказка */}
        <p className="text-xs text-muted-foreground text-center">
          Отслеживай настроение каждый день — это помогает заметить закономерности и лучше понимать себя
        </p>
      </div>
    </FeatureGate>
  );
}
