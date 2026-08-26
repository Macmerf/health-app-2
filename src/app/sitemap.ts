import type { MetadataRoute } from 'next';
import { articles } from './articles/data';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://zabotapsy.ru';

/**
 * Sitemap «Заботы»: главная (SPA), все статьи и теги статей.
 * Статьи — серверные страницы — индексируются и являются точкой входа для SEO.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const articleEntries = articles.map((article) => ({
    url: `${APP_URL}/articles/${article.slug}`,
    lastModified: article.updated,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: APP_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${APP_URL}/articles`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${APP_URL}/oferta`,
      lastModified: now,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    ...articleEntries,
  ];
}