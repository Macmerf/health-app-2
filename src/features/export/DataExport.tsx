'use client';

import React, { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { ZCard } from '@/shared/ui/ZCard';
import { ZButton } from '@/shared/ui/ZButton';
import { FeatureGate } from '@/features/payments';
import { useMoodStore } from '@/shared/lib/stores';
import { useJournalStore } from '@/features/journal';

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob(['\uFEFF' + content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DataExport() {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState<string | null>(null);
  const moodEntries = useMoodStore((s) => s.entries);

  const exportCSV = async () => {
    setExporting(true);
    try {
      const journalEntries = useJournalStore.getState().entries;

      const lines = ['Дата,Ситуация,Мысли,Физические проявления,Тревога до,Тревога после,Новый взгляд'];
      for (const e of journalEntries) {
        const date = new Date(e.createdAt).toLocaleDateString('ru-RU');
        const esc = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
        lines.push(`${date},${esc(e.situation)},${esc(e.thoughts)},${esc(e.physical || '')},${e.sudsBefore ?? ''},${e.sudsAfter ?? ''},${esc(e.newView || '')}`);
      }

      downloadBlob(lines.join('\n'), `zabota-dnevnik-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
      setExported('csv');
    } catch (err) {
      console.error('Export error', err);
    }
    setExporting(false);
  };

  const exportMoodCSV = () => {
    const lines = ['Дата,Настроение (1-5),Заметка'];
    for (const e of moodEntries) {
      const esc = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
      lines.push(`${e.date},${e.mood},${esc(e.note || '')}`);
    }
    downloadBlob(lines.join('\n'), `zabota-nastroenie-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    setExported('mood');
  };

  return (
    <FeatureGate featureKey='export_data'>
      <div className='space-y-5'>
        <p className='text-sm font-medium text-foreground'>Экспорт данных</p>
        <p className='text-xs text-muted-foreground'>Скачай свои записи и покажи терапевту — это ускорит работу</p>

        <ZCard className='space-y-3'>
          <div className='flex items-start gap-3'>
            <div className='flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 flex-shrink-0'>
              <FileText size={20} className='text-primary' />
            </div>
            <div className='flex-1'>
              <p className='text-sm font-medium text-foreground'>Дневник эмоций</p>
              <p className='text-xs text-muted-foreground mt-0.5'>Все записи в формате CSV</p>
            </div>
          </div>
          <ZButton
            variant='secondary'
            size='sm'
            className='w-full'
            onClick={exportCSV}
            loading={exporting}
          >
            <Download size={16} className='mr-1.5' />
            {exported === 'csv' ? 'Скачано ✓' : 'Скачать CSV'}
          </ZButton>
        </ZCard>

        {moodEntries.length > 0 && (
          <ZCard className='space-y-3'>
            <div className='flex items-start gap-3'>
              <div className='flex items-center justify-center w-10 h-10 rounded-xl bg-secondary/15 flex-shrink-0'>
                <FileText size={20} className='text-secondary' />
              </div>
              <div className='flex-1'>
                <p className='text-sm font-medium text-foreground'>Журнал настроения</p>
                <p className='text-xs text-muted-foreground mt-0.5'>{moodEntries.length} записей</p>
              </div>
            </div>
            <ZButton variant='secondary' size='sm' className='w-full' onClick={exportMoodCSV}>
              <Download size={16} className='mr-1.5' />
              Скачать CSV
            </ZButton>
          </ZCard>
        )}
      </div>
    </FeatureGate>
  );
}
