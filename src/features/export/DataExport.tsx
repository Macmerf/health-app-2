'use client';

import React, { useState } from 'react';
import { Download, FileText, FileType, Check } from 'lucide-react';
import { ZCard } from '@/shared/ui/ZCard';
import { ZButton } from '@/shared/ui/ZButton';
import { FeatureGate } from '@/features/payments';
import { useMoodStore } from '@/shared/lib/stores';
import { useJournalStore } from '@/features/journal';
import { useExposureStore } from '@/features/exposure';
import { openPrintableReport } from './pdfExport';

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob(['\uFEFF' + content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const today = () => new Date().toISOString().split('T')[0];

export function DataExport() {
  const [exported, setExported] = useState<string | null>(null);
  const moodEntries = useMoodStore((s) => s.entries);
  const journalCount = useJournalStore((s) => s.entries.length);
  const exposureCount = useExposureStore((s) => s.hierarchies.length);

  const exportJournalCSV = () => {
    const entries = useJournalStore.getState().entries;
    const lines = ['Дата,Ситуация,Мысли,Физические проявления,Тревога до,Тревога после,Новый взгляд,Эмоция,Ошибка мышления'];
    for (const e of entries) {
      const date = new Date(e.createdAt).toLocaleDateString('ru-RU');
      const esc = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
      lines.push(
        `${date},${esc(e.situation)},${esc(e.thoughts)},${esc(e.physical || '')},${e.sudsBefore ?? ''},${e.sudsAfter ?? ''},${esc(e.newView || '')},${esc(e.emotionName || '')},${esc(e.patternName || '')}`,
      );
    }
    downloadBlob(lines.join('\n'), `zabotapsy-dnevnik-${today()}.csv`, 'text/csv');
    setExported('csv-journal');
  };

  const exportMoodCSV = () => {
    const lines = ['Дата,Настроение (1-5),Заметка'];
    for (const e of moodEntries) {
      const esc = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
      lines.push(`${e.date},${e.mood},${esc(e.note || '')}`);
    }
    downloadBlob(lines.join('\n'), `zabotapsy-nastroenie-${today()}.csv`, 'text/csv');
    setExported('csv-mood');
  };

  const exportPDF = (includeMood: boolean) => {
    const journal = useJournalStore.getState().entries;
    const exposure = useExposureStore.getState().hierarchies;
    const sessions = useExposureStore.getState().sessions;
    const mood = useMoodStore.getState().entries;
    openPrintableReport({
      title: 'Отчёт ЗаботаPsy',
      journal,
      exposure,
      sessions,
      mood,
      includeMood,
    });
    setExported(includeMood ? 'pdf-full' : 'pdf-core');
  };

  const hasData = journalCount > 0 || exposureCount > 0 || moodEntries.length > 0;

  return (
    <FeatureGate featureKey='export_data'>
      <div className='space-y-5'>
        <div>
          <p className='text-sm font-medium text-foreground'>Экспорт данных</p>
          <p className='text-xs text-muted-foreground mt-1 leading-relaxed'>
            Скачай свои записи и покажи терапевту — это ускорит работу.
          </p>
        </div>

        {/* PDF — главный формат, рекомендованный */}
        <ZCard className='space-y-3 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent'>
          <div className='flex items-start gap-3'>
            <div className='flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 flex-shrink-0'>
              <FileType size={20} className='text-primary' />
            </div>
            <div className='flex-1'>
              <p className='text-sm font-semibold text-foreground'>Красивый отчёт для терапевта (PDF)</p>
              <p className='text-xs text-muted-foreground mt-1 leading-relaxed'>
                Дневник, лестница смелости и настроение в одном файле. Откроется предпросмотр — там выбери «Сохранить как PDF».
              </p>
            </div>
          </div>
          <div className='flex flex-col gap-2'>
            <ZButton
              variant='primary'
              size='sm'
              className='w-full'
              onClick={() => exportPDF(true)}
              disabled={!hasData}
            >
              <Download size={16} className='mr-1.5' />
              {exported === 'pdf-full' ? 'Открыт предпросмотр ✓' : 'Скачать полный отчёт'}
            </ZButton>
            {(journalCount > 0 || exposureCount > 0) && (
              <ZButton
                variant='ghost'
                size='sm'
                className='w-full text-muted-foreground'
                onClick={() => exportPDF(false)}
              >
                Только дневник и лестница
              </ZButton>
            )}
          </div>
        </ZCard>

        {/* CSV — для Excel и статистики */}
        <ZCard className='space-y-3'>
          <div className='flex items-start gap-3'>
            <div className='flex items-center justify-center w-10 h-10 rounded-xl bg-secondary/15 flex-shrink-0'>
              <FileText size={20} className='text-secondary' />
            </div>
            <div className='flex-1'>
              <p className='text-sm font-medium text-foreground'>Дневник эмоций (CSV)</p>
              <p className='text-xs text-muted-foreground mt-0.5'>
                {journalCount} {journalCount === 1 ? 'запись' : journalCount < 5 ? 'записи' : 'записей'} · для Excel и Google Sheets
              </p>
            </div>
          </div>
          <ZButton
            variant='secondary'
            size='sm'
            className='w-full'
            onClick={exportJournalCSV}
            disabled={journalCount === 0}
          >
            <Download size={16} className='mr-1.5' />
            {exported === 'csv-journal' ? 'Скачано ✓' : 'Скачать CSV'}
          </ZButton>
        </ZCard>

        {moodEntries.length > 0 && (
          <ZCard className='space-y-3'>
            <div className='flex items-start gap-3'>
              <div className='flex items-center justify-center w-10 h-10 rounded-xl bg-secondary/15 flex-shrink-0'>
                <FileText size={20} className='text-secondary' />
              </div>
              <div className='flex-1'>
                <p className='text-sm font-medium text-foreground'>Журнал настроения (CSV)</p>
                <p className='text-xs text-muted-foreground mt-0.5'>
                  {moodEntries.length} {moodEntries.length === 1 ? 'запись' : moodEntries.length < 5 ? 'записи' : 'записей'}
                </p>
              </div>
            </div>
            <ZButton variant='secondary' size='sm' className='w-full' onClick={exportMoodCSV}>
              <Download size={16} className='mr-1.5' />
              {exported === 'csv-mood' ? (
                <>
                  <Check size={14} className='mr-1.5' /> Скачано
                </>
              ) : (
                'Скачать CSV'
              )}
            </ZButton>
          </ZCard>
        )}

        {!hasData && (
          <p className='text-xs text-muted-foreground text-center py-4'>
            Сначала запиши первую мысль или создай лестницу — экспорт появится.
          </p>
        )}
      </div>
    </FeatureGate>
  );
}
