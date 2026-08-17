'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { ZCard } from '@/shared/ui/ZCard';
import { useExposureStore } from '../store';
import { texts } from '@/shared/constants/texts';

interface HabituationChartProps {
  hierarchyId: string | null;
}

interface ChartDataPoint {
  name: string;
  initialSuds: number;
  finalSuds: number;
}

// Custom tooltip in Russian
const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl bg-card border border-border px-3 py-2 shadow-soft">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="text-sm font-semibold" style={{ color: item.color }}>
          {item.dataKey === 'initialSuds' ? 'Начальный SUDS' : 'Финальный SUDS'}:{' '}
          {item.value}
        </p>
      ))}
    </div>
  );
};

export function HabituationChart({ hierarchyId }: HabituationChartProps) {
  const sessions = useExposureStore((s) => s.sessions);

  const chartData = useMemo<ChartDataPoint[]>(() => {
    const hierarchySessions = (hierarchyId
      ? sessions.filter((s) => s.hierarchyId === hierarchyId)
      : sessions)
      .sort(
        (a, b) =>
          new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
      );

    if (hierarchySessions.length === 0) return [];

    return hierarchySessions.map((session, index) => {
      const sudsChecks = session.sudsChecks;
      const initialSuds =
        sudsChecks.length > 0 ? sudsChecks[0].suds : 0;
      const finalSuds =
        sudsChecks.length > 0 ? sudsChecks[sudsChecks.length - 1].suds : 0;

      return {
        name: `#${index + 1}`,
        initialSuds,
        finalSuds,
      };
    });
  }, [sessions, hierarchyId]);

  // Empty state
  if (chartData.length === 0) {
    return (
      <ZCard variant="elevated" className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <BarChart3 size={40} strokeWidth={1.5} className="text-muted-foreground/50" />
        <div>
          <p className="text-base font-medium text-muted-foreground">
            {texts.exposure.noData}
          </p>
        </div>
      </ZCard>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
    >
      <ZCard variant="elevated">
        <h3 className="text-base font-semibold text-foreground mb-1">
          {texts.exposure.habituationTitle}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {texts.exposure.habituationSubtitle}
        </p>

        <ResponsiveContainer width="100%" height={200}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              opacity={0.3}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: 'currentColor' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: 'currentColor' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="initialSuds"
              name="Начальный SUDS"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 2, stroke: 'var(--background)' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="finalSuds"
              name="Финальный SUDS"
              stroke="#7C9A8E"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={{ r: 4, fill: '#7C9A8E', strokeWidth: 2, stroke: 'var(--background)' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ZCard>
    </motion.div>
  );
}
