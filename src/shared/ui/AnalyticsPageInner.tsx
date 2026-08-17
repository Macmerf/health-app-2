'use client';

import React from 'react';
import { HabituationChart } from '@/features/exposure';
import { FeatureGate } from '@/features/payments';

export function AnalyticsPageInner() {
  return (
    <div className='space-y-6'>
      <FeatureGate featureKey='analytics'>
        <HabituationChart hierarchyId={null} />
        <p className='text-sm text-muted-foreground text-center'>
          Графики аналитики появятся после нескольких сессий
        </p>
      </FeatureGate>
    </div>
  );
}
