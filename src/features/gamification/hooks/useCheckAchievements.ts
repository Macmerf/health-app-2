'use client';

import { useCallback } from 'react';
import { useGamificationStore } from '../store';
import { useJournalStore } from '@/features/journal';
import { useExposureStore } from '@/features/exposure';
import { useCarePlanStore } from '@/features/care-plan';
import { achievements } from '../data/achievements';
import { useToast } from '@/shared/ui/ZToast';
import { texts } from '@/shared/constants/texts';

function vibrateOnUnlock() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([50, 30, 50]);
    } catch {
      // Не поддерживается
    }
  }
}

/**
 * Проверяет условие и разблокирует достижение, если ещё не разблокировано.
 * Возвращает true, если было разблокировано новое достижение.
 */
function tryUnlock(
  condition: string,
  isMet: boolean,
  unlockAchievement: (id: string) => void,
  isUnlocked: (id: string) => boolean,
  showToast: (message: string, variant?: 'success' | 'error' | 'info') => void,
): boolean {
  if (!isMet) return false;

  const achievement = achievements.find((a) => a.condition === condition);
  if (!achievement) return false;
  if (isUnlocked(achievement.id)) return false;

  unlockAchievement(achievement.id);
  vibrateOnUnlock();
  showToast(`${texts.achievements.newUnlocked} ${achievement.name}`, 'success');
  return true;
}

export function useCheckAchievements() {
  const unlockAchievement = useGamificationStore((s) => s.unlockAchievement);
  const isUnlocked = useGamificationStore((s) => s.isUnlocked);
  const recordAction = useGamificationStore((s) => s.recordAction);
  const { showToast } = useToast();

  const checkAfterJournalSave = useCallback(() => {
    const entries = useJournalStore.getState().entries;
    const count = entries.length;

    // Подсчёт уникальных узоров мышления
    const uniquePatterns = new Set(
      entries.map((e) => e.patternId).filter(Boolean),
    ).size;

    // Подсчёт всех использований шкалы SUDs (sudsBefore + sudsAfter)
    let sudsCount = 0;
    for (const entry of entries) {
      sudsCount += 1; // sudsBefore
      if (entry.sudsAfter !== undefined) sudsCount += 1;
    }

    recordAction('journal_entries', count);
    recordAction('unique_patterns', uniquePatterns);
    recordAction('suds_usage', sudsCount);

    tryUnlock('first_journal_entry', count >= 1, unlockAchievement, isUnlocked, showToast);
    tryUnlock('journal_7', count >= 7, unlockAchievement, isUnlocked, showToast);
    tryUnlock('journal_30', count >= 30, unlockAchievement, isUnlocked, showToast);
    tryUnlock('journal_100', count >= 100, unlockAchievement, isUnlocked, showToast);
    tryUnlock('patterns_5', uniquePatterns >= 5, unlockAchievement, isUnlocked, showToast);
    tryUnlock('patterns_10', uniquePatterns >= 10, unlockAchievement, isUnlocked, showToast);
    tryUnlock('suds_10', sudsCount >= 10, unlockAchievement, isUnlocked, showToast);
  }, [unlockAchievement, isUnlocked, recordAction, showToast]);

  const checkAfterSession = useCallback(() => {
    const sessions = useExposureStore.getState().sessions;
    const hierarchies = useExposureStore.getState().hierarchies;
    const sessionCount = sessions.length;
    const hierarchyCount = hierarchies.length;

    // Проверяем рефлексию
    const hasReflection = sessions.some((s) => s.reflection && s.reflection.trim().length > 0);

    recordAction('sessions', sessionCount);
    recordAction('hierarchies', hierarchyCount);

    tryUnlock('first_hierarchy', hierarchyCount >= 1, unlockAchievement, isUnlocked, showToast);
    tryUnlock('sessions_3', sessionCount >= 3, unlockAchievement, isUnlocked, showToast);
    tryUnlock('sessions_10', sessionCount >= 10, unlockAchievement, isUnlocked, showToast);
    tryUnlock('sessions_25', sessionCount >= 25, unlockAchievement, isUnlocked, showToast);
    tryUnlock('hierarchies_3', hierarchyCount >= 3, unlockAchievement, isUnlocked, showToast);
    tryUnlock('first_reflection', hasReflection, unlockAchievement, isUnlocked, showToast);
  }, [unlockAchievement, isUnlocked, recordAction, showToast]);

  const checkAfterBreathing = useCallback(() => {
    recordAction('breathing', 1);
    tryUnlock('first_breathing', true, unlockAchievement, isUnlocked, showToast);
  }, [unlockAchievement, isUnlocked, recordAction, showToast]);

  const checkAfterGrounding = useCallback(() => {
    recordAction('grounding', 1);
    tryUnlock('first_grounding', true, unlockAchievement, isUnlocked, showToast);
  }, [unlockAchievement, isUnlocked, recordAction, showToast]);

  const checkAfterCarePlan = useCallback(() => {
    const carePlan = useCarePlanStore.getState();
    const isFilled = !!(
      carePlan.fatigueSigns.trim() ||
      carePlan.whatHelps.trim() ||
      carePlan.contacts.trim()
    );

    recordAction('care_plan_updates', 1);

    tryUnlock('care_plan_filled', isFilled, unlockAchievement, isUnlocked, showToast);

    const updatesCount = useGamificationStore.getState().actions['care_plan_updates'] ?? 0;
    tryUnlock('care_plan_5_updates', updatesCount >= 5, unlockAchievement, isUnlocked, showToast);
  }, [unlockAchievement, isUnlocked, recordAction, showToast]);

  const checkAppUsage = useCallback(() => {
    // Проверяем дату первого использования (из хранилища достижений)
    const actions = useGamificationStore.getState().actions;
    const firstUse = actions['app_first_use'];

    if (!firstUse) {
      recordAction('app_first_use', Date.now());
      return;
    }

    const firstDate = new Date(firstUse);
    const now = new Date();
    const diffMs = now.getTime() - firstDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    tryUnlock('app_7_days', diffDays >= 7, unlockAchievement, isUnlocked, showToast);
  }, [unlockAchievement, isUnlocked, recordAction, showToast]);

  return {
    checkAfterJournalSave,
    checkAfterSession,
    checkAfterBreathing,
    checkAfterGrounding,
    checkAfterCarePlan,
    checkAppUsage,
  };
}
