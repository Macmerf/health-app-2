'use client';

import { useRouterStore, useThemeStore } from '@/shared/lib/stores';
import { ZBottomNav } from '@/shared/ui/ZBottomNav';
import { ZToastContainer } from '@/shared/ui/ZToast';
import { PageTransition } from '@/shared/ui/PageTransition';
import { PremiumFab } from '@/shared/ui/PremiumFab';
import { texts } from '@/shared/constants/texts';

import { HomePage } from '@/shared/ui/HomePage';
import { JournalWizard } from '@/features/journal';
import { JournalHistory } from '@/features/journal';
import { HierarchyList } from '@/features/exposure';
import { HierarchyBuilder } from '@/features/exposure';
import { ExposureSession } from '@/features/exposure';
import { HabituationChart } from '@/features/exposure';
import { CarePlanScreen } from '@/features/care-plan';
import { BreathingExercise } from '@/features/care-plan';
import { Grounding54321 } from '@/features/care-plan';
import { AchievementsGallery } from '@/features/gamification';
import { NotificationsScreen } from '@/features/gamification';
import { PaywallScreen } from '@/features/payments';
import { MoodTracker } from '@/features/mood';
import { CareTree } from '@/features/care-tree';
import { ThemePicker } from '@/features/themes';
import { BodyScan } from '@/features/body-scan';
import { DataExport } from '@/features/export';

import {
  Settings,
  Moon,
  Sun,
  BarChart3,
  Bell,
  Heart,
  RotateCcw,
  Sparkles,
  Smile,
  TreePine,
  Palette,
  Download,
  Scan,
} from 'lucide-react';
import { ZCard } from '@/shared/ui/ZCard';
import { ZButton } from '@/shared/ui/ZButton';
import { ZHeader } from '@/shared/ui/ZHeader';
import { ZBadge } from '@/shared/ui/ZBadge';
import { usePaymentStore } from '@/features/payments';
import { OnboardingTour } from '@/shared/ui/OnboardingTour';
import { useOnboardingStore } from '@/shared/lib/onboarding-store';
import { FeatureGate } from '@/features/payments';
import { AnalyticsPageInner } from '@/shared/ui/AnalyticsPageInner';

function SettingsPage() {
  const theme = useThemeStore((s) => s.theme);
  const navigate = useRouterStore((s) => s.navigate);
  const entitlement = usePaymentStore((s) => s.entitlement);
  const resetOnboarding = useOnboardingStore((s) => s.resetOnboarding);
  const isPremium = usePaymentStore((s) => s.isPremium);

  const premium = isPremium();

  return (
    <div className='flex flex-col gap-4'>
      {/* Забота+ карточка наверху */}
      <ZCard
        className='cursor-pointer bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20'
        onClick={() => navigate('paywall')}
        role='button'
        tabIndex={0}
      >
        <div className='flex items-center gap-3'>
          <div className='flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 flex-shrink-0'>
            <Sparkles size={20} className='text-primary' />
          </div>
          <div className='flex-1'>
            <div className='flex items-center gap-2'>
              <p className='text-sm font-semibold text-foreground'>Забота+</p>
              {premium ? (
                <ZBadge variant='primary'>Активна</ZBadge>
              ) : (
                <ZBadge>Бесплатная версия</ZBadge>
              )}
            </div>
            <p className='text-xs text-muted-foreground mt-0.5'>
              {premium ? 'Все функции разблокированы' : 'Журнал настроения, темы, дерево заботы и другое'}
            </p>
          </div>
        </div>
      </ZCard>

      {/* Тема */}
      <ZCard
        className='flex items-center justify-between cursor-pointer'
        onClick={() => navigate('themes')}
        role='button'
        tabIndex={0}
      >
        <div className='flex items-center gap-3'>
          <Palette size={20} strokeWidth={1.5} className='text-muted-foreground' />
          <span className='text-sm'>Оформление</span>
        </div>
        <span className='text-xs text-muted-foreground'>
          {{ light: 'Светлая', dark: 'Тёмная', warm: 'Тёплая', forest: 'Лесная', ocean: 'Океан' }[theme]}
        </span>
      </ZCard>

      {/* Аналитика */}
      <ZCard
        className='flex items-center justify-between cursor-pointer'
        onClick={() => navigate('analytics')}
        role='button'
        tabIndex={0}
      >
        <div className='flex items-center gap-3'>
          <BarChart3 size={20} strokeWidth={1.5} className='text-muted-foreground' />
          <span className='text-sm'>Аналитика прогресса</span>
        </div>
      </ZCard>

      {/* Журнал настроения */}
      <ZCard
        className='flex items-center justify-between cursor-pointer'
        onClick={() => navigate('mood')}
        role='button'
        tabIndex={0}
      >
        <div className='flex items-center gap-3'>
          <Smile size={20} strokeWidth={1.5} className='text-muted-foreground' />
          <span className='text-sm'>Журнал настроения</span>
        </div>
        <ZBadge variant='primary' className='text-[10px]'>+</ZBadge>
      </ZCard>

      {/* Дерево заботы */}
      <ZCard
        className='flex items-center justify-between cursor-pointer'
        onClick={() => navigate('care-tree')}
        role='button'
        tabIndex={0}
      >
        <div className='flex items-center gap-3'>
          <TreePine size={20} strokeWidth={1.5} className='text-muted-foreground' />
          <span className='text-sm'>Дерево заботы</span>
        </div>
        <ZBadge variant='primary' className='text-[10px]'>+</ZBadge>
      </ZCard>

      {/* Body Scan */}
      <ZCard
        className='flex items-center justify-between cursor-pointer'
        onClick={() => navigate('body-scan')}
        role='button'
        tabIndex={0}
      >
        <div className='flex items-center gap-3'>
          <Scan size={20} strokeWidth={1.5} className='text-muted-foreground' />
          <span className='text-sm'>Сканирование тела</span>
        </div>
        <ZBadge variant='primary' className='text-[10px]'>+</ZBadge>
      </ZCard>

      {/* Экспорт */}
      <ZCard
        className='flex items-center justify-between cursor-pointer'
        onClick={() => navigate('export')}
        role='button'
        tabIndex={0}
      >
        <div className='flex items-center gap-3'>
          <Download size={20} strokeWidth={1.5} className='text-muted-foreground' />
          <span className='text-sm'>Экспорт данных</span>
        </div>
        <ZBadge variant='primary' className='text-[10px]'>+</ZBadge>
      </ZCard>

      {/* Достижения */}
      <ZCard
        className='flex items-center justify-between cursor-pointer'
        onClick={() => navigate('achievements')}
        role='button'
        tabIndex={0}
      >
        <div className='flex items-center gap-3'>
          <BarChart3 size={20} strokeWidth={1.5} className='text-muted-foreground' />
          <span className='text-sm'>Достижения</span>
        </div>
      </ZCard>

      {/* Уведомления */}
      <ZCard
        className='flex items-center justify-between cursor-pointer'
        onClick={() => navigate('notifications')}
        role='button'
        tabIndex={0}
      >
        <div className='flex items-center gap-3'>
          <Bell size={20} strokeWidth={1.5} className='text-muted-foreground' />
          <span className='text-sm'>Уведомления</span>
        </div>
      </ZCard>

      {/* Повторить обучение */}
      <ZCard
        className='flex items-center justify-between cursor-pointer'
        onClick={() => { resetOnboarding(); navigate('home'); }}
        role='button'
        tabIndex={0}
      >
        <div className='flex items-center gap-3'>
          <RotateCcw size={20} strokeWidth={1.5} className='text-muted-foreground' />
          <span className='text-sm'>Повторить обучение</span>
        </div>
      </ZCard>

      <div className='pt-2'>
        <p className='text-xs text-muted-foreground text-center'>
          Забота — поддержка при тревоге
        </p>
        <p className='text-xs text-muted-foreground text-center mt-1'>
          Не является медицинским инструментом
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
      case 'journal-new':
        return <JournalWizard onComplete={() => useRouterStore.getState().navigate('journal')} />;
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
      {showHeader && <ZHeader />}

      <main className='flex-1 px-8 py-6 pb-24 max-w-lg mx-auto w-full'>
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
