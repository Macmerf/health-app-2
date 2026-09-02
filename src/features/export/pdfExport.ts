'use client';

import type { JournalEntry, ExposureHierarchy, ExposureSession, MoodEntry } from '@/shared/schemas';

interface ExportCounts {
  journal: number;
  exposure: number;
  sessions: number;
  mood: number;
}

const SUDS_BAR_WIDTH = 220; // px
const SUDS_BAR_MAX = 100;

/**
 * Экранирует HTML-символы. Используется при формировании отчёта PDF,
 * чтобы текст записи не сломал вёрстку (XSS-safe).
 * Экспортируется для unit-тестов.
 */
export function esc(s: string): string {
  return (s ?? '').replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&#39;',
  );
}

/**
 * Заменяет переносы строк на <br>. Экспортируется для unit-тестов.
 */
export function nl2br(s: string): string {
  return esc(s).replace(/\n/g, '<br>');
}

/**
 * Форматирует ISO-дату в локализованную строку «01 января 2026, 14:30».
 * Экспортируется для unit-тестов.
 */
export function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function sudsBar(value: number, color: string): string {
  const v = Math.max(0, Math.min(SUDS_BAR_MAX, value));
  const w = Math.round((v / SUDS_BAR_MAX) * SUDS_BAR_WIDTH);
  return `
    <div class="suds-bar"><div class="suds-fill" style="width:${w}px;background:${color}"></div></div>
    <div class="suds-num" style="color:${color}">${v}</div>
  `;
}

/**
 * Стили для печати: минималистичная тёплая вёрстка, чёткая структура
 * для терапевта. A4, поля 18мм, чёрный текст, разделители.
 */
const PRINT_CSS = `
  * { box-sizing: border-box; }
  @page { size: A4; margin: 18mm 16mm; }
  body {
    font-family: 'Onest', -apple-system, 'Segoe UI', system-ui, sans-serif;
    color: #1a1a1a;
    background: #fff;
    margin: 0;
    font-size: 11pt;
    line-height: 1.45;
  }
  .cover {
    text-align: center;
    padding: 30mm 0 20mm;
    border-bottom: 1px solid #e5e5e5;
    margin-bottom: 12mm;
  }
  .cover h1 {
    font-size: 26pt;
    font-weight: 600;
    margin: 0 0 4mm;
    color: #2a4a3a;
  }
  .cover .subtitle {
    font-size: 12pt;
    color: #6b6b6b;
    margin: 0;
  }
  .meta {
    margin: 0 0 8mm;
    padding: 4mm 5mm;
    background: #faf8f5;
    border-radius: 3mm;
    font-size: 10pt;
    color: #555;
  }
  .meta b { color: #1a1a1a; }
  h2 {
    font-size: 16pt;
    font-weight: 600;
    color: #2a4a3a;
    margin: 10mm 0 4mm;
    padding-bottom: 2mm;
    border-bottom: 1px solid #e5e5e5;
    page-break-after: avoid;
  }
  h3 {
    font-size: 12pt;
    font-weight: 600;
    margin: 6mm 0 2mm;
    color: #2a4a3a;
    page-break-after: avoid;
  }
  .entry {
    border: 1px solid #e8e6e0;
    border-radius: 4mm;
    padding: 5mm 6mm;
    margin: 0 0 5mm;
    background: #fff;
    page-break-inside: avoid;
  }
  .entry-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 3mm;
    flex-wrap: wrap;
    gap: 2mm;
  }
  .entry-date {
    font-size: 10pt;
    color: #6b6b6b;
  }
  .badge {
    display: inline-block;
    padding: 0.5mm 2mm;
    border-radius: 2mm;
    font-size: 9pt;
    margin-left: 2mm;
    background: #ede8e0;
    color: #4a3a2a;
  }
  .badge.primary { background: #d8e3da; color: #2a4a3a; }
  .label {
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.5pt;
    color: #888;
    margin: 3mm 0 1mm;
    font-weight: 600;
  }
  .body-text { margin: 0 0 2mm; white-space: pre-wrap; }
  .suds-row {
    display: flex;
    align-items: center;
    gap: 3mm;
    margin: 2mm 0;
  }
  .suds-bar {
    flex: 0 0 ${SUDS_BAR_WIDTH}px;
    height: 3mm;
    background: #f0ede5;
    border-radius: 1.5mm;
    overflow: hidden;
  }
  .suds-fill {
    height: 100%;
    border-radius: 1.5mm;
  }
  .suds-num {
    font-weight: 600;
    font-size: 10pt;
    font-variant-numeric: tabular-nums;
    min-width: 18px;
    text-align: right;
  }
  .hierarchy {
    page-break-inside: avoid;
    margin-bottom: 6mm;
    border: 1px solid #e8e6e0;
    border-radius: 4mm;
    padding: 4mm 5mm;
  }
  .step-list {
    list-style: none;
    padding: 0;
    margin: 2mm 0 0;
  }
  .step-list li {
    display: flex;
    gap: 3mm;
    padding: 1.5mm 0;
    align-items: baseline;
    font-size: 10.5pt;
  }
  .step-num {
    flex: 0 0 6mm;
    font-weight: 600;
    color: #2a4a3a;
  }
  .step-name { flex: 1; }
  .step-suds { color: #6b6b6b; font-variant-numeric: tabular-nums; }
  .session {
    border: 1px solid #e8e6e0;
    border-radius: 4mm;
    padding: 4mm 5mm;
    margin: 0 0 4mm;
    page-break-inside: avoid;
  }
  .mood-row {
    display: flex;
    align-items: center;
    gap: 3mm;
    padding: 1.5mm 0;
    border-bottom: 1px solid #f0ede5;
    font-size: 10.5pt;
  }
  .mood-row:last-child { border-bottom: none; }
  .mood-dot {
    width: 5mm;
    height: 5mm;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .mood-date { flex: 0 0 26mm; color: #6b6b6b; font-variant-numeric: tabular-nums; }
  .mood-note { flex: 1; }
  .empty {
    color: #999;
    font-style: italic;
    font-size: 10pt;
  }
  .footer {
    margin-top: 12mm;
    padding-top: 4mm;
    border-top: 1px solid #e5e5e5;
    text-align: center;
    color: #999;
    font-size: 9pt;
  }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

function buildJournalSection(entries: JournalEntry[]): string {
  if (entries.length === 0) {
    return '<p class="empty">Записей в дневнике пока нет.</p>';
  }
  const sorted = [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  return sorted
    .map((e) => {
      const badges: string[] = [];
      if (e.emotionName) badges.push(`<span class="badge primary">${esc(e.emotionName)}</span>`);
      if (e.patternName) badges.push(`<span class="badge">${esc(e.patternName)}</span>`);
      const sudsDown = e.sudsAfter != null && e.sudsAfter < e.sudsBefore;
      const sudsColor = sudsDown ? '#3a7a5a' : '#c8704a';
      return `
        <div class="entry">
          <div class="entry-head">
            <span class="entry-date">${formatDateTime(e.createdAt)}</span>
            <span>${badges.join('')}</span>
          </div>
          <div class="label">Ситуация</div>
          <p class="body-text">${nl2br(e.situation)}</p>
          <div class="label">Мысли и эмоции</div>
          <p class="body-text">${nl2br(e.thoughts)}</p>
          ${e.physical ? `<div class="label">Тело</div><p class="body-text">${nl2br(e.physical)}</p>` : ''}
          <div class="label">Тревога до</div>
          <div class="suds-row">${sudsBar(e.sudsBefore, '#c8704a')}</div>
          ${e.sudsAfter != null ? `
            <div class="label">Тревога после</div>
            <div class="suds-row">${sudsBar(e.sudsAfter, sudsColor)}</div>
          ` : ''}
          ${e.newView ? `<div class="label">Новый взгляд</div><p class="body-text">${nl2br(e.newView)}</p>` : ''}
        </div>
      `;
    })
    .join('');
}

function buildExposureSection(
  hierarchies: ExposureHierarchy[],
  sessions: ExposureSession[],
): string {
  if (hierarchies.length === 0 && sessions.length === 0) {
    return '<p class="empty">Лестниц смелости пока нет.</p>';
  }
  const parts: string[] = [];
  if (hierarchies.length > 0) {
    parts.push('<h3>Лестницы</h3>');
    parts.push(
      hierarchies
        .map((h) => {
          const steps = [...h.steps]
            .sort((a, b) => a.order - b.order)
            .map(
              (s, i) => `
              <li>
                <span class="step-num">${i + 1}.</span>
                <span class="step-name">${esc(s.name)}</span>
                <span class="step-suds">SUDS ${s.initialSuds}</span>
              </li>`,
            )
            .join('');
          return `
            <div class="hierarchy">
              <div class="entry-head">
                <span style="font-weight:600;font-size:11.5pt">${esc(h.title)}</span>
                <span class="entry-date">${formatDateTime(h.createdAt)}</span>
              </div>
              <ol class="step-list">${steps}</ol>
            </div>
          `;
        })
        .join(''),
    );
  }
  if (sessions.length > 0) {
    parts.push('<h3>Сессии практик</h3>');
    const sorted = [...sessions].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
    parts.push(
      sorted
        .slice(0, 30) // защита от огромных PDF
        .map((s) => {
          const mins = Math.floor(s.durationSeconds / 60);
          const secs = s.durationSeconds % 60;
          const checks = s.sudsChecks
            .map(
              (c) =>
                `<span style="margin-right:6mm;color:#6b6b6b">${c.time}с — <b>${c.suds}</b></span>`,
            )
            .join('');
          return `
            <div class="session">
              <div class="entry-head">
                <span style="font-weight:600">${esc(s.stepName)}</span>
                <span class="entry-date">${formatDateTime(s.startedAt)} · ${mins}м ${secs}с</span>
              </div>
              ${checks ? `<div style="font-size:10pt;margin:1mm 0">${checks}</div>` : ''}
              ${s.reflection ? `<div class="label">Рефлексия</div><p class="body-text">${nl2br(s.reflection)}</p>` : ''}
            </div>
          `;
        })
        .join(''),
    );
  }
  return parts.join('');
}

function buildMoodSection(entries: MoodEntry[]): string {
  if (entries.length === 0) {
    return '<p class="empty">Записей настроения пока нет.</p>';
  }
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  const moodColors = ['#c8704a', '#d89860', '#c8b870', '#9ac870', '#5a9a6a'];
  return sorted
    .map((m) => {
      const dot = moodColors[m.mood - 1] ?? '#bbb';
      return `
        <div class="mood-row">
          <span class="mood-dot" style="background:${dot}"></span>
          <span class="mood-date">${esc(m.date)}</span>
          <span style="font-weight:600;min-width:30px">${m.mood}/5</span>
          <span class="mood-note">${m.note ? nl2br(m.note) : ''}</span>
        </div>
      `;
    })
    .join('');
}

function buildHtml(opts: {
  title: string;
  generatedAt: string;
  sections: { title: string; html: string }[];
  counts: ExportCounts;
}): string {
  const sectionsHtml = opts.sections
    .map((s) => `<h2>${esc(s.title)}</h2>${s.html}`)
    .join('');
  const meta = `
    <div class="meta">
      Сгенерировано: <b>${esc(opts.generatedAt)}</b> ·
      Записей дневника: <b>${opts.counts.journal}</b> ·
      Лестниц: <b>${opts.counts.exposure}</b> ·
      Сессий: <b>${opts.counts.sessions}</b> ·
      Настроение: <b>${opts.counts.mood}</b>
    </div>
  `;
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>${esc(opts.title)}</title>
<style>${PRINT_CSS}</style>
</head>
<body>
  <div class="cover">
    <h1>${esc(opts.title)}</h1>
    <p class="subtitle">ЗаботаPsy — отчёт для терапевта</p>
  </div>
  ${meta}
  ${sectionsHtml}
  <div class="footer">
    ЗаботаPsy — поддержка при тревоге. Не является медицинским инструментом.
  </div>
</body>
</html>`;
}

/**
 * Открывает новое окно с красиво свёрстанным отчётом и вызывает печать.
 * Пользователь в диалоге браузера выбирает «Сохранить как PDF».
 *
 * Сделано через window.print() (а не pdf-lib/jspdf), чтобы:
 *  - не тащить в бандл 200+ КБ зависимостей ради двух кнопок;
 *  - пользоваться системными шрифтами и WYSIWYG-печатью;
 *  - пользователь сам выбрал место сохранения.
 *
 * Перед печатью в новом окне загружаются стили и шрифт; это даёт чистый PDF.
 */
export function openPrintableReport(opts: {
  title: string;
  journal: JournalEntry[];
  exposure: ExposureHierarchy[];
  sessions: ExposureSession[];
  mood: MoodEntry[];
  includeMood: boolean;
}): void {
  if (typeof window === 'undefined') return;
  const counts: ExportCounts = {
    journal: opts.journal.length,
    exposure: opts.exposure.length,
    sessions: opts.sessions.length,
    mood: opts.mood.length,
  };
  const generatedAt = new Date().toLocaleString('ru-RU');

  const sections: { title: string; html: string }[] = [
    { title: 'Дневник эмоций', html: buildJournalSection(opts.journal) },
    { title: 'Лестница смелости', html: buildExposureSection(opts.exposure, opts.sessions) },
  ];
  if (opts.includeMood) {
    sections.push({ title: 'Журнал настроения', html: buildMoodSection(opts.mood) });
  }

  const html = buildHtml({ title: opts.title, generatedAt, sections, counts });

  const w = window.open('', '_blank', 'width=900,height=1100');
  if (!w) {
    // Popup заблокирован — fallback: скачиваем HTML.
    downloadBlob(html, `${opts.title}.html`, 'text/html');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  // Дать браузеру время отрисовать стили, затем печатаем.
  w.addEventListener('load', () => {
    // Небольшая задержка для подгрузки шрифтов.
    setTimeout(() => {
      try {
        w.focus();
        w.print();
      } catch {
        // ignore
      }
    }, 250);
  });
  // Если окно уже загрузилось до установки слушателя (обычно для document.write так и есть).
  if (w.document.readyState === 'complete') {
    setTimeout(() => {
      try {
        w.focus();
        w.print();
      } catch {
        // ignore
      }
    }, 250);
  }
}

function downloadBlob(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
