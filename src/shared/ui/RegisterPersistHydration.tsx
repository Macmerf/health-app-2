'use client';

import { useEffect } from 'react';
import { registerHydration } from '@/shared/lib/storage';
import { useExposureStore } from '@/features/exposure';
import { useJournalStore } from '@/features/journal';
import { useJournalDraftStore } from '@/features/journal/draftStore';
import { useQuickNotesStore } from '@/features/quick-notes/store';
import { useCarePlanStore } from '@/features/care-plan/store';
import { useGamificationStore } from '@/features/gamification/store';
import { usePaymentStore } from '@/features/payments/store';
import { useMoodStore, useCareTreeStore } from '@/shared/lib/stores';
import { useNotificationSettingsStore } from '@/features/gamification/components/NotificationsScreen';
import {
  useMoodNudgeStore,
  useSudsCheckInStore,
} from '@/features/checkin/store';

/**
 * Регистрирует все пользовательские persist-сторы в реестре hydration.
 * Подключается один раз из AppShell — после монтирования на клиенте.
 *
 * Делать это здесь безопаснее, чем в модулях сторов: SSR не выполняет
 * registerHydration (это требует window.persist API), а реестр
 * уже не зависит от localStorage и работает чисто в памяти.
 */
export function RegisterPersistHydration() {
  useEffect(() => {
    registerHydration(useJournalStore, 'zabotapsy-journal');
    registerHydration(useJournalDraftStore, 'zabotapsy-journal-draft');
    registerHydration(useQuickNotesStore, 'zabotapsy-quick-notes');
    registerHydration(useExposureStore, 'zabotapsy-exposure');
    registerHydration(useCarePlanStore, 'zabotapsy-careplan');
    registerHydration(useGamificationStore, 'zabotapsy-achievements');
    registerHydration(usePaymentStore, 'zabotapsy-entitlements');
    registerHydration(useMoodStore, 'zabotapsy-mood');
    registerHydration(useCareTreeStore, 'zabotapsy-care-tree');
    registerHydration(
      useNotificationSettingsStore as never,
      'zabotapsy-notification-settings',
    );
    registerHydration(useSudsCheckInStore, 'zabotapsy-suds-checkin');
    registerHydration(useMoodNudgeStore, 'zabotapsy-mood-nudge');
  }, []);
  return null;
}
