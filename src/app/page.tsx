'use client';

import { useRouterStore, useThemeStore } from '@/shared/lib/stores';
import { ZBottomNav } from '@/shared/ui/ZBottomNav';
import { ZDesktopNav } from '@/shared/ui/ZDesktopNav';
import { ZToastContainer } from '@/shared/ui/ZToast';
import { PageTransition } from '@/shared/ui/PageTransition';
import dynamic from 'next/dynamic';

const PremiumFab = dynamic(() => import('@/shared/ui/PremiumFab').then(m => ({ default: m.PremiumFab })), {
  ssr: false,
});
import { texts } from '@/shared/constants/texts';

import { HomePage } from '@/shared/ui/HomePage';

/**
 * Код-сплиттинг экранов: каждый экран — отдельный чанк, грузится по требованию.
 * Раньше все 20+ экранов (включая recharts и dnd-kit) были в главном бандле —
 * старт занимал секунды на парсинг мегабайтов JS. Скелетон смягчает паузу.
 */
const screenLoading = (
  <div className='space-y-3 py-8' aria-busy='true'>
    <div className='h-6 w-40 rounded-lg bg-muted animate-pulse' />
    <div className='h-24 rounded-2xl bg-muted animate-pulse' />
    <div className='h-24 rounded-2xl bg-muted animate-pulse' />
  </div>
);

/* eslint-disable @typescript-eslint/no-explicit-any */
const dynamicScreen = (loader: () => Promise<{ default: any }>) =>
  dynamic(loader as any, { ssr: false, loading: () => screenLoading });

const JournalWizard = dynamicScreen(() => import('@/features/journal').then(m => ({ default: m.JournalWizard })));
const JournalHistory = dynamicScreen(() => import('@/features/journal').then(m => ({ default: m.JournalHistory })));
const QuickNoteList = dynamicScreen(() => import('@/features/quick-notes').then(m => ({ default: m.QuickNoteList })));
const HierarchyList = dynamicScreen(() => import('@/features/exposure').then(m => ({ default: m.HierarchyList })));
const HierarchyBuilder = dynamicScreen(() => import('@/features/exposure').then(m => ({ default: m.HierarchyBuilder })));
const ExposureSession = dynamicScreen(() => import('@/features/exposure').then(m => ({ default: m.ExposureSession })));
const CarePlanScreen = dynamicScreen(() => import('@/features/care-plan').then(m => ({ default: m.CarePlanScreen })));
const BreathingExercise = dynamicScreen(() => import('@/features/care-plan').then(m => ({ default: m.BreathingExercise })));
const Grounding54321 = dynamicScreen(() => import('@/features/care-plan').then(m => ({ default: m.Grounding54321 })));
const AchievementsGallery = dynamicScreen(() => import('@/features/gamification').then(m => ({ default: m.AchievementsGallery })));
const NotificationsScreen = dynamicScreen(() => import('@/features/gamification').then(m => ({ default: m.NotificationsScreen })));
const PaywallScreen = dynamicScreen(() => import('@/features/payments').then(m => ({ default: m.PaywallScreen })));
const MoodTracker = dynamicScreen(() => import('@/features/mood').then(m => ({ default: m.MoodTracker })));
const CareTree = dynamicScreen(() => import('@/features/care-tree').then(m => ({ default: m.CareTree })));
const ThemePicker = dynamicScreen(() => import('@/features/themes').then(m => ({ default: m.ThemePicker })));
const BodyScan = dynamicScreen(() => import('@/features/body-scan').then(m => ({ default: m.BodyScan })));
const DataExport = dynamicScreen(() => import('@/features/export').then(m => ({ default: m.DataExport })));

import {
  BarChart3,
  Bell,
  Heart,
  NotebookPen,
  RotateCcw,
  Sparkles,
  Smile,
  TreePine,
  Palette,
  Download,
  Scan,
} from 'lucide-react';
import { ZCard } from '@/shared/ui/ZCard';
import { ZHeader } from '@/shared/ui/ZHeader';
import { ZBadge } from '@/shared/ui/ZBadge';
import { usePaymentStore } from '@/features/payments';
import { OnboardingTour } from '@/shared/ui/OnboardingTour';
import { useOnboardingStore } from '@/shared/lib/onboarding-store';

const AnalyticsPageInner = dynamicScreen(() => import('@/shared/ui/AnalyticsPageInner').then(m => ({ default: m.AnalyticsPageInner })));

function SettingsPage() {
  const theme = useThemeStore((s) => s.theme);
  const navigate = useRouterStore((s) => s.navigate);
  const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);
  // Подписка на результат, а не на ссылку функции — для мгновенного обновления статуса.
  const premium = usePaymentStore((s) => s.isPremium());

  return (
    <div className='flex flex-col gap-4'>
      {/* Забота+ карточка наверху */}
      <ZCard
        className='cursor-pointer bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20'
        onClick={() => navigate('paywall')}

      >
        <div className='flex items-center gap-3'>
          <div className='flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 flex-shrink-0'>
            <Sparkles size={20} className='text-primary' />
          </div>
          <div className='flex-1'>
            <div className='flex items-center gap-2'>
              <p className='text-sm font-semibold text-foreground'>{texts.common.premium}</p>
              {premium ? (
                <ZBadge variant='primary'>{texts.settings.premiumActive}</ZBadge>
              ) : (
                <ZBadge>{texts.settings.freeVersion}</ZBadge>
              )}
            </div>
            <p className='text-xs text-muted-foreground mt-0.5'>
              {premium ? texts.settings.premiumAllUnlocked : texts.settings.premiumHint}
            </p>
          </div>
        </div>
      </ZCard>

      {/* Тема */}
      <ZCard
        className='flex items-center justify-between cursor-pointer'
        onClick={() => navigate('themes')}

      >
        <div className='flex items-center gap-3'>
          <Palette size={20} strokeWidth={1.5} className='text-muted-foreground' />
          <span className='text-sm'>{texts.settings.appearance}</span>
        </div>
        <span className='text-xs text-muted-foreground'>
          {texts.settings.themeNames[theme]}
        </span>
      </ZCard>

      {/* Аналитика */}
      <ZCard
        className='flex items-center justify-between cursor-pointer'
        onClick={() => navigate('analytics')}

      >
        <div className='flex items-center gap-3'>
          <BarChart3 size={20} strokeWidth={1.5} className='text-muted-foreground' />
          <span className='text-sm'>{texts.settings.analytics}</span>
        </div>
      </ZCard>

      {/* Журнал настроения */}
      <ZCard
        className='flex items-center justify-between cursor-pointer'
        onClick={() => navigate('mood')}

      >
        <div className='flex items-center gap-3'>
          <Smile size={20} strokeWidth={1.5} className='text-muted-foreground' />
          <span className='text-sm'>{texts.settings.moodJournal}</span>
        </div>
        <ZBadge variant='primary' className='text-[10px]'>+</ZBadge>
      </ZCard>

      {/* Дерево заботы */}
      <ZCard
        className='flex items-center justify-between cursor-pointer'
        onClick={() => navigate('care-tree')}

      >
        <div className='flex items-center gap-3'>
          <TreePine size={20} strokeWidth={1.5} className='text-muted-foreground' />
          <span className='text-sm'>{texts.settings.careTree}</span>
        </div>
        <ZBadge variant='primary' className='text-[10px]'>+</ZBadge>
      </ZCard>

      {/* Body Scan */}
      <ZCard
        className='flex items-center justify-between cursor-pointer'
        onClick={() => navigate('body-scan')}

      >
        <div className='flex items-center gap-3'>
          <Scan size={20} strokeWidth={1.5} className='text-muted-foreground' />
          <span className='text-sm'>{texts.settings.bodyScan}</span>
        </div>
        <ZBadge variant='primary' className='text-[10px]'>+</ZBadge>
      </ZCard>

      {/* Экспорт */}
      <ZCard
        className='flex items-center justify-between cursor-pointer'
        onClick={() => navigate('export')}

      >
        <div className='flex items-center gap-3'>
          <Download size={20} strokeWidth={1.5} className='text-muted-foreground' />
          <span className='text-sm'>{texts.settings.exportData}</span>
        </div>
        <ZBadge variant='primary' className='text-[10px]'>+</ZBadge>
      </ZCard>

      {/* Быстрые заметки */}
      <ZCard
        className='flex items-center justify-between cursor-pointer'
        onClick={() => navigate('quick-notes')}

      >
        <div className='flex items-center gap-3'>
          <NotebookPen size={20} strokeWidth={1.5} className='text-muted-foreground' />
          <span className='text-sm'>Быстрые заметки</span>
        </div>
        <ZBadge className='text-[10px]'>free</ZBadge>
      </ZCard>

      {/* Достижения */}
      <ZCard
        className='flex items-center justify-between cursor-pointer'
        onClick={() => navigate('achievements')}

      >
        <div className='flex items-center gap-3'>
          <BarChart3 size={20} strokeWidth={1.5} className='text-muted-foreground' />
          <span className='text-sm'>{texts.settings.achievements}</span>
        </div>
      </ZCard>

      {/* Уведомления */}
      <ZCard
        className='flex items-center justify-between cursor-pointer'
        onClick={() => navigate('notifications')}

      >
        <div className='flex items-center gap-3'>
          <Bell size={20} strokeWidth={1.5} className='text-muted-foreground' />
          <span className='text-sm'>{texts.settings.notifications}</span>
        </div>
      </ZCard>

      {/* Повторить обучение */}
      <ZCard
        className='flex items-center justify-between cursor-pointer'
        onClick={() => { resetOnboarding(); navigate('home'); }}

      >
        <div className='flex items-center gap-3'>
          <RotateCcw size={20} strokeWidth={1.5} className='text-muted-foreground' />
          <span className='text-sm'>{texts.settings.repeatOnboarding}</span>
        </div>
      </ZCard>

      <div className='pt-2'>
        <p className='text-xs text-muted-foreground text-center'>
          {texts.settings.footerApp}
        </p>
        <p className='text-xs text-muted-foreground text-center mt-1'>
          {texts.settings.footerDisclaimer}
        </p>
        <p className='text-xs text-muted-foreground text-center mt-2'>
          <a
            href="/articles"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-primary transition-colors"
          >
            Статьи о тревоге и самоподдержке
          </a>
        </p>
        <p className='text-xs text-muted-foreground text-center mt-1'>
          <a
            href="/oferta"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-primary transition-colors"
          >
            Публичная оферта ЗаботаPsy+
          </a>
        </p>
      </div>
    </div>
  );
}

function Router() {
  const route = useRouterStore((s) => s.route);
  const navigate = useRouterStore((s) => s.navigate);

  const showNav = ![
    'journal-new',
    'exposure-new',
    'exposure-session',
    'breathing',
    'grounding',
    'body-scan',
  ].includes(route);

  const showHeader = route !== 'home';

  const renderRoute = () => {
    switch (route) {
      case 'home':
        return <HomePage />;
      case 'journal':
        return <JournalHistory />;
      case 'journal-new': {
        // dynamic() возвращает тип с props: unknown; приводим к реальным props компонента.
        const Wizard = JournalWizard as unknown as React.ComponentType<{ onComplete: () => void }>;
        return <Wizard onComplete={() => useRouterStore.getState().navigate('journal')} />;
      }
      case 'exposure':
        return <HierarchyList />;
      case 'exposure-new':
        return <HierarchyBuilder />;
      case 'exposure-session':
        return <ExposureSession />;
      case 'care-plan':
        return <CarePlanScreen />;
      case 'breathing':
        return <BreathingExercise />;
      case 'grounding':
        return <Grounding54321 />;
      case 'body-scan':
        return <BodyScan />;
      case 'achievements':
        return <AchievementsGallery />;
      case 'analytics':
        return <AnalyticsPageInner />;
      case 'mood':
        return <MoodTracker />;
      case 'care-tree':
        return <CareTree />;
      case 'themes':
        return <ThemePicker />;
      case 'export':
        return <DataExport />;
      case 'quick-notes':
        return <QuickNoteList />;
      case 'paywall':
        return <PaywallScreen />;
      case 'notifications':
        return <NotificationsScreen />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div className='min-h-screen flex flex-col'>
      {/* Десктопная навигация (lg+), таб-бар скрыт через CSS */}
      <ZDesktopNav />

      {showHeader && <ZHeader />}

      <main className='flex-1 px-4 py-4 pb-24 lg:pb-8 max-w-lg lg:max-w-3xl mx-auto w-full'>
        <PageTransition routeKey={route}>
          {renderRoute()}
        </PageTransition>
      </main>

      {showNav && <ZBottomNav />}

      {/* FAB для плана заботы */}
      {showNav && (
        <button
          onClick={() => navigate('care-plan')}
          className='fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-terracotta text-white flex items-center justify-center shadow-soft-lg active:scale-95 transition-transform'
          aria-label={texts.carePlan.fabLabel}
        >
          <Heart size={24} strokeWidth={1.5} />
        </button>
      )}

      {/* Premium FAB */}
      {showNav && <PremiumFab />}
    </div>
  );
}

export default function AppPage() {
  const tourCompleted = useOnboardingStore((s) => s.tourCompleted);

  return (
    <ZToastContainer>
      <Router />
      {!tourCompleted && <OnboardingTour />}
    </ZToastContainer>
  );
}
