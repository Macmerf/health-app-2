/**
 * Ссылки на SEO-статьи для отображения внутри SPA.
 * Дублирует src/app/articles/data.ts (серверные страницы) — только slug и заголовок,
 * чтобы не тянуть весь контент статей в клиентский бандл.
 */

export interface ArticleLink {
  slug: string;
  title: string;
  description: string;
}

export const ARTICLES: ArticleLink[] = [
  {
    slug: 'panichka-chto-delat',
    title: 'Паническая атака: что делать прямо сейчас',
    description: 'Пошаговая инструкция: дыхание, заземление, безопасные позы.',
  },
  {
    slug: 'dnevnik-myslej',
    title: 'Как вести дневник мыслей при тревоге',
    description: 'Классическая техника КПТ: ситуация → мысль → эмоция → альтернатива.',
  },
  {
    slug: 'lestnica-smelosti',
    title: 'Лестница смелости: как перестать избегать',
    description: 'Постепенное столкновение со страхом — от простых шагов к сложным.',
  },
];
