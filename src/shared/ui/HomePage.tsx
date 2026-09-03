'use client';

import { useState, useSyncExternalStore } from 'react';
import { motion, type Variants } from 'framer-motion';
import { useRouterStore } from '@/shared/lib/stores';
import { useJournalDraftStore } from '@/features/journal/draftStore';
import { useQuickNotesStore } from '@/features/quick-notes/store';
import { useHydrated } from '@/shared/lib/storage';
import { useToast } from '@/shared/ui/ZToast';
import { ZCard } from '@/shared/ui/ZCard';
import { ZButton } from '@/shared/ui/ZButton';
import { ZBadge } from '@/shared/ui/ZBadge';
import { texts } from '@/shared/constants/texts';
import { ARTICLES } from '@/shared/constants/articles';
import {
  BookOpen,
  BookText,
  Check,
  ChevronDown,
  ChevronRight,
  Footprints,
  Heart,
  LifeBuoy,
  NotebookPen,
  Wind,
  TreePine,
} from 'lucide-react';
import { AuthSuggestion } from '@/shared/ui/AuthSuggestion';
import { ZSlider } from '@/shared/ui/ZSlider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useMoodNudgeStore,
  useSudsCheckInStore,
  POST_CHECK_MIN_AGE_MS,
  POST_CHECK_MAX_AGE_MS,
  type PracticeRoute,
} from '@/features/checkin/store';
import { usePaymentStore } from '@/features/payments/store';
import { useMoodStore } from '@/shared/lib/stores';
import { MOODS } from '@/features/mood';

const container: Variants = {
  animate: { transition: { staggerChildren: 0.08 } },
};

const item: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] as const } },
};

interface HomeCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  howTo: string;
  onNavigate: () => void;
}

function HomeCard({ icon, iconBg, title, description, howTo, onNavigate }: HomeCardProps) {
  return (
    <ZCard className='cursor-pointer' onClick={onNavigate}>
      <div className='flex items-start gap-4'>
        <div className={`flex items-center justify-center w-12 h-12 rounded-2xl shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <div className='flex-1 min-w-0'>
          <p className='font-medium text-foreground'>{title}</p>
          <p className='text-sm text-muted-foreground mt-1 leading-relaxed'>{description}</p>
          <div className='mt-3 flex items-center gap-2 rounded-xl bg-primary/8 px-3 py-2'>
            <span className='text-xs font-medium text-primary'>{'>'} {howTo}</span>
          </div>
        </div>
      </div>
    </ZCard>
  );
}

/** Приветствие по времени суток — персонализация момента открытия приложения. */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Доброй ночи';
  if (hour < 12) return 'Доброе утро';
  if (hour < 18) return 'Добрый день';
  return 'Добрый вечер';
}

/** Пустая подписка: значение зависит только от времени, переподписка не нужна. */
const emptySubscribe = () => () => {};
/** Серверный снапшот — null, чтобы не было расхождения гидратации. */
const getServerGreeting = () => null;

export function HomePage() {
  const navigate = useRouterStore((s) => s.navigate);
  const { showToast } = useToast();

  // Гидрация: на сервере времени нет (null → слоган), на клиенте — приветствие.
  const greeting = useSyncExternalStore(emptySubscribe, getGreeting, getServerGreeting);

  // Незавершённая запись дневника — возвращаем пользователя в прерванный путь.
  const draftHydrated = useHydrated('zabotapsy-journal-draft');
  const draft = useJournalDraftStore((s) => s.draft);
  const hasDraft =
    draftHydrated &&
    Boolean(
      draft.situation.trim() ||
        draft.thoughts.trim() ||
        draft.physical.trim() ||
        draft.newView.trim() ||
        draft.selectedEmotionId,
    );

  // Захват быстрой заметки прямо с главной — 1 тап вместо трёх.
  const addNote = useQuickNotesStore((s) => s.addNote);
  const [noteText, setNoteText] = useState('');
  const handleSaveNote = () => {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    addNote(trimmed);
    setNoteText('');
    showToast('Заметка сохранена — позже разберёшь её в дневнике', 'success');
  };

  // === SUDS-чек-ин вокруг практик ===
  const checkInHydrated = useHydrated('zabotapsy-suds-checkin');
  const pending = useSudsCheckInStore((s) => s.pending);
  const startCheckIn = useSudsCheckInStore((s) => s.startCheckIn);
  const clearPending = useSudsCheckInStore((s) => s.clearPending);

  // Опциональная отметка тревоги ДО практики — никогда не блокирует SOS-доступ.
  const [showPreCheck, setShowPreCheck] = useState(false);
  const [preSuds, setPreSuds] = useState(50);

  const PRACTICE_NAMES: Record<PracticeRoute, string> = {
    breathing: texts.home.practiceNameBreathing,
    grounding: texts.home.practiceNameGrounding,
    'care-plan': texts.home.practiceNameCarePlan,
  };

  const handlePractice = (practice: PracticeRoute) => {
    if (showPreCheck) startCheckIn(preSuds, practice);
    navigate(practice);
  };

  // Карточка «отметь тревогу после» «созревает»: ≥2 мин и <24 ч с начала практики.
  const pendingAge = pending
    ? Date.now() - new Date(pending.startedAt).getTime()
    : 0;
  const postCheckReady =
    checkInHydrated &&
    pending !== null &&
    pendingAge >= POST_CHECK_MIN_AGE_MS &&
    pendingAge < POST_CHECK_MAX_AGE_MS;

  const [postSuds, setPostSuds] = useState<number | null>(null);
  const [postResult, setPostResult] = useState<number | null>(null);
  const handleSubmitPostCheck = () => {
    if (!pending || postSuds === null) return;
    const delta = pending.sudsBefore - postSuds;
    clearPending();
    setPostResult(delta);
  };

  // === Ежедневный чек-ин настроения (retention-петля, только для премиума:
  // журнал настроения — premium-фича, не заманиваем бесплатных в пейволл) ===
  const isPremium = usePaymentStore((s) => s.isPremium());
  const moodHydrated = useHydrated('zabotapsy-mood');
  const moodEntries = useMoodStore((s) => s.entries);
  const addMoodEntry = useMoodStore((s) => s.addEntry);
  const nudgeDismissed = useMoodNudgeStore((s) => s.lastDismissedDate);
  const dismissMoodNudge = useMoodNudgeStore((s) => s.dismissMoodNudge);

  const todayStr = moodHydrated ? new Date().toISOString().split('T')[0] : '';
  const moodToday = moodHydrated
    ? moodEntries.some((e) => e.date === todayStr)
    : false;
  const showMoodNudge =
    moodHydrated && isPremium && !moodToday && nudgeDismissed !== todayStr;
  const handleMoodPick = (mood: number) => {
    addMoodEntry(mood);
    showToast(texts.home.moodNudgeSaved, 'success');
  };

  // Кризисный диалог с телефонами помощи
  const [crisisOpen, setCrisisOpen] = useState(false);

  return (
    <motion.div
      variants={container}
      initial='initial'
      animate='animate'
      className='flex flex-col gap-5'
    >
      <motion.div variants={item} className='pt-2'>
        <h1 className='text-2xl font-semibold text-foreground'>
          {greeting ?? texts.common.appTagline}
        </h1>
        <p className='text-sm text-muted-foreground mt-1'>
          Помогает при тревоге, стрессе, панических атаках и когда просто тяжело
        </p>
        <p className='text-xs text-muted-foreground mt-2'>
          {texts.common.disclaimer}
        </p>
      </motion.div>

      {/* SOS-блок: состояние «мне сейчас тревожно» — помощь в один тап, выше всех фич */}
      <motion.div variants={item}>
        <h2 className='text-lg font-medium text-foreground mb-1'>{texts.home.sosTitle}</h2>
        <p className='text-sm text-muted-foreground mb-3'>
          {texts.home.sosSubtitle}
        </p>
        <div className='grid grid-cols-3 gap-2 sm:gap-3'>
          <ZCard
            className='cursor-pointer text-center px-2 py-4 sm:p-5'
            onClick={() => handlePractice('breathing')}
            aria-label='Дыхательная практика'
          >
            <Wind size={24} strokeWidth={1.5} className='mx-auto text-primary mb-2 shrink-0' />
            <p className='text-xs sm:text-sm font-medium leading-tight break-words'>
              {texts.home.practiceNameBreathing}
            </p>
            <p className='text-[10px] sm:text-xs text-muted-foreground mt-1 leading-snug'>
              Вдох 4 сек, выдох 4 сек
            </p>
          </ZCard>

          <ZCard
            className='cursor-pointer text-center px-2 py-4 sm:p-5'
            onClick={() => handlePractice('grounding')}
            aria-label='Заземление 5-4-3-2-1'
          >
            <TreePine size={24} strokeWidth={1.5} className='mx-auto text-lavender mb-2 shrink-0' />
            <p className='text-xs sm:text-sm font-medium leading-tight break-words'>
              {texts.home.practiceNameGrounding}
            </p>
            <p className='text-[10px] sm:text-xs text-muted-foreground mt-1 leading-snug'>
              5-4-3-2-1 через чувства
            </p>
          </ZCard>

          <ZCard
            className='cursor-pointer text-center px-2 py-4 sm:p-5'
            onClick={() => handlePractice('care-plan')}
            aria-label='План заботы'
          >
            <Heart size={24} strokeWidth={1.5} className='mx-auto text-terracotta mb-2 shrink-0' />
            <p className='text-xs sm:text-sm font-medium leading-tight break-words'>
              {texts.home.practiceNameCarePlan}
            </p>
            <p className='text-[10px] sm:text-xs text-muted-foreground mt-1 leading-snug'>
              Твои опоры рядом
            </p>
          </ZCard>
        </div>

        {/* Опциональная отметка тревоги до практики + тихая кризисная ссылка */}
        <div className='mt-3 flex flex-wrap items-center gap-x-4 gap-y-2'>
          <button
            onClick={() => setShowPreCheck((v) => !v)}
            aria-expanded={showPreCheck}
            className='flex items-center gap-1.5 text-left text-xs font-medium text-primary hover:underline'
          >
            <ChevronDown
              size={14}
              strokeWidth={2}
              className={`transition-transform ${showPreCheck ? 'rotate-180' : ''}`}
            />
            {texts.home.preCheckToggle}
          </button>
          <button
            onClick={() => setCrisisOpen(true)}
            className='ml-auto flex items-center gap-1.5 text-right text-xs text-muted-foreground hover:text-foreground hover:underline'
          >
            <LifeBuoy size={14} strokeWidth={1.5} />
            {texts.home.crisisLink}
          </button>
        </div>

        {showPreCheck && (
          <div className='mt-3 rounded-2xl border border-border bg-muted/40 p-4'>
            <ZSlider value={preSuds} onChange={setPreSuds} label={texts.journal.sudsLabel} />
            <p className='text-xs text-muted-foreground mt-2'>{texts.home.preCheckHint}</p>
          </div>
        )}
      </motion.div>

      {/* Чек-ин «после практики»: дельта тревоги — подкрепление ценности практик */}
      {postResult !== null ? (
        <motion.div variants={item}>
          <ZCard className='border-primary/30 bg-primary/5'>
            <div className='flex items-start gap-3'>
              <div className='flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 shrink-0'>
                <Check size={20} strokeWidth={2} className='text-primary' />
              </div>
              <p className='text-sm text-foreground leading-relaxed'>
                {postResult > 0
                  ? texts.journal.anxietyDecreased.replace('{n}', String(postResult))
                  : texts.home.anxietyNotChanged}
              </p>
            </div>
          </ZCard>
        </motion.div>
      ) : postCheckReady && pending ? (
        <motion.div variants={item}>
          <ZCard>
            <p className='text-sm font-medium text-foreground'>
              {texts.home.postCheckTitle.replace('{name}', PRACTICE_NAMES[pending.practice])}
            </p>
            <div className='mt-3'>
              <ZSlider
                value={postSuds ?? pending.sudsBefore}
                onChange={setPostSuds}
                label={texts.journal.sudsAfterLabel}
              />
            </div>
            <ZButton
              variant='primary'
              size='sm'
              className='mt-3 w-full'
              onClick={handleSubmitPostCheck}
            >
              {texts.home.postCheckSubmit}
            </ZButton>
          </ZCard>
        </motion.div>
      ) : null}

      {/* Ежедневный чек-ин настроения — мягкая retention-петля (премиум) */}
      {showMoodNudge && (
        <motion.div variants={item}>
          <ZCard>
            <div className='flex items-start justify-between gap-2'>
              <div>
                <p className='text-sm font-medium text-foreground'>{texts.home.moodNudgeTitle}</p>
                <p className='text-xs text-muted-foreground mt-0.5'>
                  {texts.home.moodNudgeSubtitle}
                </p>
              </div>
              <button
                onClick={() => dismissMoodNudge(todayStr)}
                className='text-xs text-muted-foreground hover:underline shrink-0'
              >
                {texts.home.moodNudgeDismiss}
              </button>
            </div>
            <div className='mt-3 flex items-center justify-between gap-1'>
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => handleMoodPick(m.value)}
                  aria-label={m.label}
                  className='text-2xl sm:text-3xl rounded-xl px-2 py-1 transition-transform hover:scale-110 active:scale-95'
                >
                  {m.emoji}
                </button>
              ))}
            </div>
            <button
              onClick={() => navigate('mood')}
              className='mt-3 w-full text-center text-xs font-medium text-primary hover:underline'
            >
              {texts.home.moodNudgeOpen}
            </button>
          </ZCard>
        </motion.div>
      )}

      {/* Незавершённая запись дневника — вернуться к прерванному пути */}
      {hasDraft && (
        <motion.div variants={item}>
          <ZCard className='cursor-pointer' onClick={() => navigate('journal-new')}>
            <div className='flex items-start gap-4'>
              <div className='flex items-center justify-center w-12 h-12 rounded-2xl shrink-0 bg-primary/15 text-primary'>
                <NotebookPen size={24} strokeWidth={1.5} />
              </div>
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2'>
                  <p className='font-medium text-foreground'>Продолжить запись</p>
                  <ZBadge variant='primary' className='text-[10px]'>
                    Шаг {draft.step + 1}
                  </ZBadge>
                </div>
                <p className='text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2'>
                  {draft.situation.trim()
                    ? draft.situation
                    : 'У тебя есть незавершённая запись — мастер откроется на том же шаге'}
                </p>
              </div>
              <ChevronRight size={18} strokeWidth={1.5} className='text-muted-foreground shrink-0 self-center' />
            </div>
          </ZCard>
        </motion.div>
      )}

      {/* Предложение сохранить данные */}
      <motion.div variants={item}>
        <AuthSuggestion />
      </motion.div>

      {/* Journal */}
      <motion.div variants={item}>
        <HomeCard
          icon={<BookOpen size={24} strokeWidth={1.5} className='text-primary' />}
          iconBg='bg-primary/15 text-primary'
          title='Дневник эмоций'
          description='Запиши ситуацию, опиши свои эмоции и что произошло в теле. Оцени тревогу до и после, попробуй посмотреть на свою жизнь с другой стороны.'
          howTo='Нажми «Продолжить путь» ниже — откроется пошаговый мастер'
          onNavigate={() => navigate('journal')}
        />
      </motion.div>

      {/* Exposure */}
      <motion.div variants={item}>
        <HomeCard
          icon={<Footprints size={24} strokeWidth={1.5} className='text-sand' />}
          iconBg='bg-sand/15 text-sand'
          title='Лестница смелости'
          description='Страх заставляет избегать — и от этого страх растёт. Лестница смелости ломает этот круг: ты составляешь шаги от простых к сложным и постепенно выполняешь их. С каждым разом тревога снижается.'
          howTo='Создай лестницу со ступеньками, затем начни практику с таймером'
          onNavigate={() => navigate('exposure')}
        />
      </motion.div>

      {/* Care Plan */}
      <motion.div variants={item}>
        <HomeCard
          icon={<Heart size={24} strokeWidth={1.5} className='text-terracotta' />}
          iconBg='bg-terracotta/15 text-terracotta'
          title='План заботы'
          description='Твой план безопасности: что помогает, контакты близких, безопасные места, фразы для поддержки себя. Доступен в 1-2 нажатия через красную кнопку с сердцем.'
          howTo='Заполни поля — они сохранятся автоматически. Быстрые практики внутри.'
          onNavigate={() => navigate('care-plan')}
        />
      </motion.div>

      {/* SEO-статьи */}
      <motion.div variants={item}>
        <h2 className='text-lg font-medium text-foreground mb-1'>Почитать</h2>
        <p className='text-sm text-muted-foreground mb-3'>
          Короткие статьи о том, как поддержать себя при тревоге
        </p>
        <div className='flex flex-col gap-2'>
          {ARTICLES.map((article) => (
            <a
              key={article.slug}
              href={`/articles/${article.slug}`}
              className='flex items-start gap-3 rounded-2xl border border-border bg-card p-4 hover:border-primary/30 transition-colors'
            >
              <div className='mt-0.5 flex-shrink-0 w-9 h-9 rounded-xl bg-lavender/15 flex items-center justify-center'>
                <BookText size={18} className='text-lavender' strokeWidth={1.5} />
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium text-foreground'>{article.title}</p>
                <p className='text-xs text-muted-foreground mt-0.5 leading-relaxed'>{article.description}</p>
              </div>
            </a>
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div variants={item}>
        <ZButton
          variant='primary'
          className='w-full'
          onClick={() => navigate('journal-new')}
        >
          <BookOpen size={20} className='mr-2' />
          {texts.home.ctaMain}
        </ZButton>
        <p className='text-xs text-muted-foreground text-center mt-2'>
          {texts.home.ctaHint}
        </p>
      </motion.div>

      {/* Быстрая заметка — захват мысли в один тап, без перехода на другой экран */}
      <motion.div variants={item}>
        <ZCard>
          <div className='flex items-center gap-3 mb-3'>
            <div className='flex items-center justify-center w-10 h-10 rounded-xl bg-terracotta/10 shrink-0'>
              <NotebookPen size={20} strokeWidth={1.5} className='text-terracotta' />
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-medium text-foreground'>Быстрая заметка</p>
              <p className='text-xs text-muted-foreground leading-relaxed'>
                Одно предложение — позже разберёшь в дневнике
              </p>
            </div>
            <button
              onClick={() => navigate('quick-notes')}
              className='text-xs font-medium text-primary shrink-0 hover:underline'
            >
              Все заметки
            </button>
          </div>
          <div className='flex gap-2'>
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveNote();
                }
              }}
              placeholder='Что тебя тревожит сейчас?'
              aria-label='Текст быстрой заметки'
              maxLength={500}
              className='flex-1 min-w-0 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30'
            />
            <ZButton
              variant='primary'
              size='sm'
              onClick={handleSaveNote}
              disabled={!noteText.trim()}
              aria-label='Сохранить заметку'
            >
              <Check size={18} strokeWidth={2} />
            </ZButton>
          </div>
        </ZCard>
      </motion.div>

      {/* Кризисный диалог: телефоны профессиональной помощи */}
      <Dialog open={crisisOpen} onOpenChange={setCrisisOpen}>
        <DialogContent className='rounded-3xl sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle className='text-left'>{texts.home.crisisTitle}</DialogTitle>
            <DialogDescription className='text-left leading-relaxed'>
              {texts.home.crisisBody}
            </DialogDescription>
          </DialogHeader>
          <div className='flex flex-col gap-2'>
            {[
              {
                label: 'Единый номер экстренных служб',
                value: '112',
                href: 'tel:112',
              },
              {
                label: 'Телефон доверия МЧС России',
                value: '+7 (495) 989-50-50',
                href: 'tel:+74959895050',
              },
              {
                label: 'Детский телефон доверия (бесплатно, круглосуточно)',
                value: '8-800-2000-122',
                href: 'tel:88002000122',
              },
            ].map((contact) => (
              <a
                key={contact.href}
                href={contact.href}
                className='flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border border-border px-4 py-3 hover:border-primary/40 transition-colors'
              >
                <span className='min-w-0 text-xs text-muted-foreground leading-snug'>
                  {contact.label}
                </span>
                <span className='shrink-0 text-sm font-semibold text-primary whitespace-nowrap'>
                  {contact.value}
                </span>
              </a>
            ))}
          </div>
          <DialogFooter>
            <ZButton
              variant='secondary'
              className='w-full'
              onClick={() => setCrisisOpen(false)}
            >
              {texts.home.crisisClose}
            </ZButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
