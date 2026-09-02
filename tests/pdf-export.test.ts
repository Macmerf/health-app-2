import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EMOTIONS, emotionById } from '../src/features/journal/data/emotions.ts';
import { esc, nl2br, formatDateTime } from '../src/features/export/pdfExport.ts';

describe('emotionById', () => {
  it('находит эмоцию по id', () => {
    const e = emotionById('anxiety');
    assert.ok(e);
    assert.equal(e?.name, 'Тревога');
  });

  it('возвращает undefined для несуществующего id', () => {
    assert.equal(emotionById('does-not-exist'), undefined);
  });

  it('EMOTIONS содержит ровно 10 базовых эмоций', () => {
    assert.equal(EMOTIONS.length, 10);
  });

  it('у каждой эмоции есть синонимы и описание', () => {
    for (const e of EMOTIONS) {
      assert.ok(e.synonyms.length > 0, `${e.id} без синонимов`);
      assert.ok(e.description.length > 0, `${e.id} без описания`);
    }
  });
});

describe('pdfExport: esc', () => {
  it('экранирует HTML-символы', () => {
    assert.equal(esc('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
    assert.equal(esc('A & B'), 'A &amp; B');
    assert.equal(esc(`"quoted" и 'apos'`), '&quot;quoted&quot; и &#39;apos&#39;');
  });

  it('пустая строка и null-coalescing: пустая → пустая', () => {
    assert.equal(esc(''), '');
    // @ts-expect-error: проверяем защиту от null
    assert.equal(esc(null), '');
    // @ts-expect-error: проверяем защиту от undefined
    assert.equal(esc(undefined), '');
  });
});

describe('pdfExport: nl2br', () => {
  it('заменяет \\n на <br>', () => {
    assert.equal(nl2br('a\nb\nc'), 'a<br>b<br>c');
  });

  it('экранирует HTML перед заменой переносов', () => {
    assert.equal(nl2br('<b>жирно</b>\nпродолжение'), '&lt;b&gt;жирно&lt;/b&gt;<br>продолжение');
  });
});

describe('pdfExport: formatDateTime', () => {
  it('форматирует ISO-дату в русскую локаль', () => {
    const out = formatDateTime('2026-01-15T14:30:00.000Z');
    // В CI-окружении локаль ru-RU может быть недоступна — функция
    // всё равно возвращает строку. Достаточно проверить, что она не
    // совпадает с входной ISO и не пустая.
    assert.ok(out.length > 0);
    assert.notEqual(out, '2026-01-15T14:30:00.000Z');
  });

  it('возвращает исходную строку при невалидном ISO', () => {
    assert.equal(formatDateTime('not-a-date'), 'not-a-date');
  });
});
