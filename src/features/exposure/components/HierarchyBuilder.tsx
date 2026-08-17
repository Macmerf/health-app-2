'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, GripVertical } from 'lucide-react';

import { ZButton } from '@/shared/ui/ZButton';
import { ZInput } from '@/shared/ui/ZInput';
import { ZSlider } from '@/shared/ui/ZSlider';
import { ZCard } from '@/shared/ui/ZCard';
import { useToast } from '@/shared/ui/ZToast';
import { useRouterStore } from '@/shared/lib/stores';
import { useExposureStore } from '../store';
import { texts } from '@/shared/constants/texts';
import { ExposureHierarchySchema } from '@/shared/schemas';
import type { ExposureStep } from '@/shared/schemas';
import { FeatureGuide } from '@/shared/ui/FeatureGuide';

const BUILDER_GUIDE = {
  guideId: 'exposure-builder',
  title: 'Создание лестницы смелости',
  description: 'Здесь ты создаёшь «лестницу» из шагов для работы со страхом. Начни с лёгких шагов и двигайся к более сложным. Ползунок SUDS оценивает, насколько тревожно будет выполнить каждый шаг.',
  steps: [
    'Введи название страха в поле сверху',
    'Нажми «Добавить ступеньку» (или нажми Enter в последнем поле названия)',
    'Напиши название шага — например, «подумать о звонке»',
    'Двигай ползунок: 0 = совсем не страшно, 100 = максимально страшно',
    'Добавь ещё ступенек — от лёгких к сложным',
    'Перетаскивай за ≡ чтобы выстроить порядок',
    'Нажми «Сохранить» внизу',
  ],
  sections: [
    {
      title: 'Пример лестницы (страх выступлений)',
      body: '1. Подумать о выступлении (SUDS 15) → 2. Рассказать идею другу (SUDS 30) → 3. Выступить перед 2 людьми (SUDS 50) → 4. Выступить перед группой (SUDS 70) → 5. Выступить публично (SUDS 90).',
    },
  ],
};

const genId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2);

type LocalStep = ExposureStep;

interface SortableStepProps {
  step: LocalStep;
  index: number;
  onUpdate: (id: string, updates: Partial<LocalStep>) => void;
  onDelete: (id: string) => void;
  onEnterAdd: () => void;
}

function SortableStepItem({ step, index, onUpdate, onDelete, onEnterAdd }: SortableStepProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ZCard className="flex items-start gap-3" variant="elevated">
        {/* Drag handle — keyboard and pointer accessible */}
        <button
          type="button"
          className="mt-1 shrink-0 cursor-grab rounded-lg p-1 text-muted-foreground hover:text-foreground touch-none"
          aria-label={`Перетащить шаг ${index + 1}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={20} strokeWidth={1.5} />
        </button>

        {/* Step content */}
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary tabular-nums shrink-0">
              {index + 1}.
            </span>
            <ZInput
              value={step.name}
              onChange={(e) => onUpdate(step.id, { name: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') { onUpdate(step.id, { name: (e.target as HTMLInputElement).value }); onEnterAdd(); e.preventDefault(); } }}
              placeholder={texts.exposure.stepNamePlaceholder}
              className="flex-1"
              aria-label={`${texts.exposure.stepName} ${index + 1}`}
            />
          </div>

          <ZSlider
            value={step.initialSuds}
            onChange={(v) => onUpdate(step.id, { initialSuds: v })}
            label={texts.exposure.initialSuds}
            min={0}
            max={100}
            step={5}
          />
        </div>

        {/* Delete button */}
        <button
          type="button"
          onClick={() => onDelete(step.id)}
          className="mt-1 shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-terracotta transition-colors"
          aria-label={`Удалить шаг ${index + 1}`}
        >
          <Trash2 size={18} strokeWidth={1.5} />
        </button>
      </ZCard>
    </div>
  );
}

export function HierarchyBuilder() {
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState('');
  const [steps, setSteps] = useState<LocalStep[]>([]);
  const addHierarchy = useExposureStore((s) => s.addHierarchy);
  const navigate = useRouterStore((s) => s.navigate);
  const { showToast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor),
  );

  const addStep = useCallback(() => {
    const newStep: LocalStep = {
      id: genId(),
      name: '',
      initialSuds: 50,
      order: steps.length,
    };
    setSteps((prev) => [...prev, newStep]);
  }, [steps.length]);

  const updateStep = useCallback(
    (id: string, updates: Partial<LocalStep>) => {
      setSteps((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      );
    },
    [],
  );

  const deleteStep = useCallback((id: string) => {
    setSteps((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      return filtered.map((s, i) => ({ ...s, order: i }));
    });
  }, []);

  const handleDragEnd = useCallback(
    (event: { active: { id: string | number }; over: { id: string | number } | null }) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        setSteps((prev) => {
          const oldIndex = prev.findIndex((s) => s.id === active.id);
          const newIndex = prev.findIndex((s) => s.id === over.id);
          const moved = arrayMove(prev, oldIndex, newIndex);
          return moved.map((s, i) => ({ ...s, order: i }));
        });
      }
    },
    [],
  );

  const handleSave = useCallback(() => {
    // Validate title
    if (!title.trim()) {
      setTitleError('Дай название лестнице');
      return;
    }
    setTitleError('');

    // Validate steps
    const validSteps = steps.filter((s) => s.name.trim().length > 0);
    if (validSteps.length === 0) {
      showToast('Добавь хотя бы одну ступеньку с названием', 'error');
      return;
    }

    const now = new Date().toISOString();
    const orderedSteps = [...steps]
      .filter((s) => s.name.trim().length > 0)
      .sort((a, b) => a.order - b.order)
      .map((s) => ({ ...s, name: s.name.trim() }));

    const result = ExposureHierarchySchema.safeParse({
      id: genId(),
      title: title.trim(),
      steps: orderedSteps,
      createdAt: now,
      updatedAt: now,
    });

    if (!result.success) {
      showToast('Проверь данные лестницы', 'error');
      return;
    }

    addHierarchy(result.data);
    showToast('Лестница сохранена!', 'success');
    navigate('exposure');
  }, [title, steps, addHierarchy, navigate, showToast]);

  const sortedSteps = [...steps].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <FeatureGuide {...BUILDER_GUIDE} />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
        className="flex flex-col gap-5 px-4 pb-8 pt-4 max-w-lg mx-auto w-full"
      >
        {/* Title input */}
        <ZInput
          label={texts.exposure.newHierarchy}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            if (titleError) setTitleError('');
          }}
          placeholder="Например: страх выступлений"
          error={titleError}
          helperText="Название страха, с которым будешь работать"
        />

        {/* Drag hint */}
        {sortedSteps.length > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-sand/8 px-3 py-2">
            <GripVertical size={16} strokeWidth={1.5} className="text-sand shrink-0" />
            <p className="text-xs text-muted-foreground">
              {texts.exposure.dragHint}
            </p>
          </div>
        )}

        {/* Sortable step list */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedSteps.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-3">
              {sortedSteps.map((step, index) => (
                <SortableStepItem
                  key={step.id}
                  step={step}
                  index={index}
                  onUpdate={updateStep}
                  onDelete={deleteStep}
                  onEnterAdd={addStep}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Add step button */}
        <ZButton variant="secondary" onClick={addStep} className="w-full">
          {texts.exposure.addStep}
        </ZButton>

        {/* Save button */}
        <ZButton variant="primary" onClick={handleSave} className="w-full">
          {texts.common.save}
        </ZButton>
      </motion.div>
    </div>
  );
}
