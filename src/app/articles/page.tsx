import type { Metadata } from 'next';
import Link from 'next/link';
import { articles } from './data';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://zabotapsy.ru';

export const metadata: Metadata = {
    title: 'Статьи о тревоге — ЗаботаPsy',
  description:
    'Полезные статьи о тревоге, панических атаках и самоподдержке: что делать при приступе, как вести дневник мыслей, как работать со страхом по лестнице смелости.',
  alternates: { canonical: `${APP_URL}/articles` },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: `${APP_URL}/articles`,
    siteName: 'ЗаботаPsy — поддержка при тревоге',
  title: 'Статьи о тревоге — ЗаботаPsy',
    description:
      'Как справиться с панической атакой, вести дневник мыслей и работать со страхом по лестнице смелости.',
  },
};

export default function ArticlesPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        <header className="mb-10">
          <h1 className="text-3xl font-semibold text-foreground">Статьи о тревоге</h1>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            Короткие практические статьи о том, как поддержать себя при тревоге,
            панических атаках и страхах. Каждая статья — это инструкция, которую
            можно применить уже сегодня.
          </p>
        </header>

        <div className="flex flex-col gap-4">
          {articles.map((article) => (
            <article
              key={article.slug}
              className="rounded-2xl border border-border bg-card p-5 hover:border-primary/30 transition-colors"
            >
              <Link href={`/articles/${article.slug}`} className="block">
                <h2 className="text-lg font-semibold text-foreground hover:text-primary transition-colors">
                  {article.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{article.description}</p>
                <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <time dateTime={article.date}>
                    {new Date(article.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </time>
                  <span aria-hidden="true">·</span>
                  <span>{article.readingMinutes} мин</span>
                </div>
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6">
          <h2 className="text-lg font-semibold text-foreground mb-2">Открой приложение «ЗаботаPsy»</h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Практические инструменты: дневник мыслей, лестница смелости, план заботы,
            дыхание и заземление. Бесплатно и работает без интернета.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            Открыть приложение
          </Link>
        </div>
      </div>
    </main>
  );
}