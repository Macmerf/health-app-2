// ====================
// Gamification & Notifications (Block 7)
// ====================

export { useGamificationStore } from './store';

export { useCheckAchievements } from './hooks/useCheckAchievements';

export { AchievementUnlocked } from './components/AchievementUnlocked';
export { AchievementsGallery } from './components/AchievementsGallery';
export { NotificationsScreen } from './components/NotificationsScreen';

export {
  checkNotificationPermission,
  requestNotificationPermission,
  scheduleNotification,
} from './lib/notifications';

export { achievements } from './data/achievements';
