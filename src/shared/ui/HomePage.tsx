'use client';

import { motion, type Variants } from 'framer-motion';
import { useRouterStore } from '@/shared/lib/stores';
import { ZCard } from '@/shared/ui/ZCard';
import { ZButton } from '@/shared/ui/ZButton';
import { texts } from '@/shared/constants/texts';
import { ARTICLES } from '@/shared/constants/articles';
import {
  BookOpen,
  BookText,
  Footprints,
  Heart,
  Wind,
  TreePine,
} from 'lucide-react';

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

export function HomePage() {
  const navigate = useRouterStore((s) => s.navigate);

  return (
    <motion.div
      variants={container}
      initial='initial'
      animate='animate'
      className='flex flex-col gap-5'
    >
      <motion.div variants={item} className='pt-2'>
        <h1 className='text-2xl font-semibold text-foreground'>
          {texts.common.appTagline}
        </h1>
        <p className='text-sm text-muted-foreground mt-1'>
          Помогает при тревоге, стрессе, панических атаках и когда просто тяжело
        </p>
        <p className='text-xs text-muted-foreground mt-2'>
          {texts.common.disclaimer}
        </p>
      </motion.div>

      {/* Journal */}
      <motion.div variants={item}>
        <HomeCard
          icon={<BookOpen size={24} strokeWidth={1.5} className='text-primary' />}
          iconBg='bg-primary/15 text-primary'
          title='Дневник эмоций'
          description='Запиши ситуацию, опиши свои эмоции и что произошло в теле. Оцени тревогу до и после, попробуй посмотреть на свою жизнь с другой стороны.'
          howTo='Нажми «Новая запись» ниже — откроется пошаговый мастер'
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

      {/* Quick Practices */}
      <motion.div variants={item}>
        <h2 className='text-lg font-medium text-foreground mb-1'>Быстрые практики</h2>
        <p className='text-sm text-muted-foreground mb-3'>
          Используй в любой момент, когда чувствуешь тревогу. Работают сразу.
        </p>
        <div className='grid grid-cols-2 gap-3'>
          <ZCard
            className='cursor-pointer text-center py-5'
            onClick={() => navigate('breathing')}
            aria-label='Дыхательная практика'
          >
            <Wind size={24} strokeWidth={1.5} className='mx-auto text-primary mb-2' />
            <p className='text-sm font-medium'>Дыхание</p>
            <p className='text-xs text-muted-foreground mt-1 px-1 leading-relaxed'>
              Вдох 4 сек, выдох 4 сек. Следи за кругом.
            </p>
          </ZCard>

          <ZCard
            className='cursor-pointer text-center py-5'
            onClick={() => navigate('grounding')}
            aria-label='Заземление 5-4-3-2-1'
          >
            <TreePine size={24} strokeWidth={1.5} className='mx-auto text-lavender mb-2' />
            <p className='text-sm font-medium'>Заземление</p>
            <p className='text-xs text-muted-foreground mt-1 px-1 leading-relaxed'>
              5-4-3-2-1: вернись в момент через органы чувств.
            </p>
          </ZCard>
        </div>
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

      {/* Navigation hint */}
      <motion.div variants={item}>
        <div className='rounded-2xl bg-muted/50 border border-border p-4'>
          <h3 className='text-sm font-semibold text-foreground mb-2'>Как перемещаться</h3>
          <div className='flex flex-col gap-1.5'>
            <p className='text-xs text-muted-foreground leading-relaxed'>
              <span className='font-medium text-foreground'>Внизу экрана</span> — три вкладки: Главная, Дневник, Лестница. Нажми, чтобы перейти.
            </p>
            <p className='text-xs text-muted-foreground leading-relaxed'>
              <span className='font-medium text-foreground'>Кнопка «Профиль»</span> — настройки, смена темы, аналитика и достижения.
            </p>
            <p className='text-xs text-muted-foreground leading-relaxed'>
              <span className='font-medium text-terracotta'>Красная кнопка с сердцем</span> — мгновенный доступ к плану заботы.
            </p>
          </div>
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
          {texts.journal.newEntry}
        </ZButton>
        <p className='text-xs text-muted-foreground text-center mt-2'>
          Начни с дневника эмоций — это самая удобная точка входа
        </p>
      </motion.div>
    </motion.div>
  );
}
