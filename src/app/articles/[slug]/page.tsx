import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { articles, getArticle } from '../data';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://zabotapsy.ru';

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};

  return {
    title: `${article.title} — ЗаботаPsy`,
    description: article.description,
    keywords: article.keywords,
    alternates: { canonical: `${APP_URL}/articles/${article.slug}` },
    openGraph: {
      type: 'article',
      locale: 'ru_RU',
      url: `${APP_URL}/articles/${article.slug}`,
      siteName: 'ЗаботаPsy — поддержка при тревоге',
      title: article.title,
      description: article.description,
      publishedTime: article.date,
      modifiedTime: article.updated,
      images: [{ url: '/og/cover.png', width: 1200, height: 630, alt: article.title }],
    },
  };
}

function ArticleJsonLd({ slug, title, description, date }: { slug: string; title: string; description: string; date: string }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: title,
        description,
        datePublished: date,
        dateModified: date,
        inLanguage: 'ru',
        mainEntityOfPage: `${APP_URL}/articles/${slug}`,
        author: { '@type': 'Organization', name: 'ЗаботаPsy' },
        publisher: { '@type': 'Organization', name: 'ЗаботаPsy' },
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: article.faq.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };

  return (
    <main className="min-h-screen bg-background">
      <ArticleJsonLd slug={article.slug} title={article.title} description={article.description} date={article.date} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <div className="mx-auto w-full max-w-2xl px-6 py-10">
        {/* Хлебные крошки */}
        <nav aria-label="Хлебные крошки" className="mb-6">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-primary transition-colors">
                ЗаботаPsy
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/articles" className="hover:text-primary transition-colors">
                Статьи
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-foreground">
              {article.title}
            </li>
          </ol>
        </nav>

        <header className="mb-10">
          <h1 className="text-3xl font-semibold text-foreground leading-tight">{article.title}</h1>
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <time dateTime={article.date}>
              {new Date(article.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </time>
            <span aria-hidden="true">·</span>
            <span>{article.readingMinutes} мин чтения</span>
          </div>
          <p className="mt-4 text-base text-muted-foreground leading-relaxed">{article.description}</p>
        </header>

        <div className="flex flex-col gap-10">
          {article.sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-xl font-semibold text-foreground mb-3">{section.heading}</h2>
              <div className="flex flex-col gap-3">
                {section.body.map((paragraph, j) => (
                  <p key={j} className="text-[15px] text-foreground/90 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}

          {/* FAQ */}
          <section aria-label="Частые вопросы">
            <h2 className="text-xl font-semibold text-foreground mb-4">Частые вопросы</h2>
            <div className="flex flex-col gap-4">
              {article.faq.map((faq, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-2">{faq.question}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA на установку */}
          <aside className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Попробуй упражнения в приложении «ЗаботаPsy»
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Дневник мыслей, лестница смелости и план заботы — бесплатно и без интернета.
              Установи приложение с этой страницы: кнопка «Установить» в адресной строке браузера.
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              Открыть приложение
            </Link>
          </aside>

          {/* Дисклеймер */}
          <p className="text-xs text-muted-foreground leading-relaxed">
            Статья носит ознакомительный характер и не заменяет консультацию врача или психолога.
            При сильной тревоге, панических атаках или других тяжёлых состояниях обратись к специалисту.
          </p>
        </div>
      </div>
    </main>
  );
}