'use client';

import React, { useState, useCallback } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { motion } from 'framer-motion';
import { Bell, BellOff, Clock, BookOpen, Wind } from 'lucide-react';
import { ZCard } from '@/shared/ui/ZCard';
import { ZButton } from '@/shared/ui/ZButton';
import { ZInput } from '@/shared/ui/ZInput';
import { useToast } from '@/shared/ui/ZToast';
import { FeatureGate } from '@/features/payments';
import { createPersistConfig } from '@/shared/lib/storage';
import {
  checkNotificationPermission,
  requestNotificationPermission,
} from '../lib/notifications';
import { texts } from '@/shared/constants/texts';

// ====================
// Хранилище настроек уведомлений
// ====================

interface NotificationSettingsStore {
  enabled: boolean;
  reminderTime: string;
  journalReminder: boolean;
  breathingReminder: boolean;
  setEnabled: (value: boolean) => void;
  setReminderTime: (value: string) => void;
  setJournalReminder: (value: boolean) => void;
  setBreathingReminder: (value: boolean) => void;
}

const useNotificationSettingsStore = create<NotificationSettingsStore>()(
  persist(
    (set) => ({
      enabled: false,
      reminderTime: '20:00',
      journalReminder: true,
      breathingReminder: true,

      setEnabled: (value) => set({ enabled: value }),
      setReminderTime: (value) => set({ reminderTime: value }),
      setJournalReminder: (value) => set({ journalReminder: value }),
      setBreathingReminder: (value) => set({ breathingReminder: value }),
    }),
    {
      name: 'zabotapsy-notification-settings',
      storage: createJSONStorage(() =>
        createPersistConfig('zabotapsy-notification-settings').storage,
      ),
      partialize: (state) => ({
        enabled: state.enabled,
        reminderTime: state.reminderTime,
        journalReminder: state.journalReminder,
        breathingReminder: state.breathingReminder,
      }),
    },
  ),
);

// ====================
// Компонент экрана уведомлений
// ====================

export function NotificationsScreen() {
  const { showToast } = useToast();
  const [permission, setPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>(() => {
    if (typeof Notification === 'undefined') return 'unsupported';
    return checkNotificationPermission();
  });

  const enabled = useNotificationSettingsStore((s) => s.enabled);
  const reminderTime = useNotificationSettingsStore((s) => s.reminderTime);
  const journalReminder = useNotificationSettingsStore((s) => s.journalReminder);
  const breathingReminder = useNotificationSettingsStore((s) => s.breathingReminder);
  const setEnabled = useNotificationSettingsStore((s) => s.setEnabled);
  const setReminderTime = useNotificationSettingsStore((s) => s.setReminderTime);
  const setJournalReminder = useNotificationSettingsStore((s) => s.setJournalReminder);
  const setBreathingReminder = useNotificationSettingsStore((s) => s.setBreathingReminder);

  // Permission is checked via lazy initializer above.
  // No effect needed — if permission changes in browser settings,
  // the user can revisit this screen.

  const handleRequestPermission = useCallback(async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : 'denied');
    if (granted) {
      setEnabled(true);
    }
  }, [setEnabled]);

  const handleToggleEnabled = useCallback(() => {
    if (!enabled && permission !== 'granted') {
      handleRequestPermission();
      return;
    }
    const next = !enabled;
    setEnabled(next);
  }, [enabled, permission, setEnabled, handleRequestPermission]);

  const handleSave = useCallback(() => {
    showToast(texts.notifications.saved, 'success');
  }, [showToast]);

  const canUseNotifications = permission === 'granted' || permission === 'default';

  return (
    <FeatureGate featureKey='notifications'>
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex-1 px-4 py-6 space-y-6 max-w-lg mx-auto w-full">
        {/* Подзаголовок */}
        <p className="text-sm text-muted-foreground text-center">
          {texts.notifications.subtitle}
        </p>

        {/* Статус разрешения */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <ZCard variant="elevated" className="space-y-4">
            {/* Кнопка включения/выключения */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {enabled ? (
                  <Bell size={20} strokeWidth={1.5} className="text-primary" />
                ) : (
                  <BellOff size={20} strokeWidth={1.5} className="text-muted-foreground" />
                )}
                <span className="text-sm font-medium text-foreground">
                  {texts.notifications.enabled}
                </span>
              </div>
              <ZButton
                variant={enabled ? 'primary' : 'secondary'}
                size="sm"
                onClick={handleToggleEnabled}
                disabled={!canUseNotifications}
              >
                {enabled ? texts.notifications.enabled : texts.notifications.disabled}
              </ZButton>
            </div>

            {/* Если разрешения нет — кнопка запроса */}
            {permission === 'denied' && (
              <p className="text-xs text-terracotta">
                {texts.notifications.permissionDenied}
              </p>
            )}

            {permission === 'default' && !enabled && (
              <ZButton
                variant="ghost"
                size="sm"
                onClick={handleRequestPermission}
                className="w-full"
              >
                {texts.notifications.grantPermission}
              </ZButton>
            )}

            {permission === 'unsupported' && (
              <p className="text-xs text-muted-foreground">
                Уведомления не поддерживаются в этом браузере
              </p>
            )}
          </ZCard>
        </motion.div>

        {/* Настройки — доступны только если уведомления включены */}
        {enabled && permission === 'granted' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="space-y-4"
          >
            {/* Время напоминания */}
            <ZCard variant="elevated" className="space-y-3">
              <div className="flex items-center gap-2.5 text-foreground">
                <Clock size={18} strokeWidth={1.5} className="text-muted-foreground" />
                <span className="text-sm font-medium">{texts.notifications.time}</span>
              </div>
              <ZInput
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
              />
            </ZCard>

            {/* Напоминание о дневнике */}
            <ZCard variant="elevated">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <BookOpen size={18} strokeWidth={1.5} className="text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {texts.notifications.journalReminder}
                  </span>
                </div>
                <ZButton
                  variant={journalReminder ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setJournalReminder(!journalReminder)}
                >
                  {journalReminder ? texts.notifications.enabled : texts.notifications.disabled}
                </ZButton>
              </div>
            </ZCard>

            {/* Напоминание о дыхании */}
            <ZCard variant="elevated">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Wind size={18} strokeWidth={1.5} className="text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {texts.notifications.breathingReminder}
                  </span>
                </div>
                <ZButton
                  variant={breathingReminder ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setBreathingReminder(!breathingReminder)}
                >
                  {breathingReminder ? texts.notifications.enabled : texts.notifications.disabled}
                </ZButton>
              </div>
            </ZCard>

            {/* Кнопка сохранения */}
            <ZButton variant="primary" className="w-full" onClick={handleSave}>
              {texts.common.save}
            </ZButton>
          </motion.div>
        )}
      </div>
    </div>
    </FeatureGate>
  );
}
