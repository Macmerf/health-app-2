import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { JournalEntrySchema } from '../src/shared/schemas/index.ts';

const baseEntry = {
  id: 'entry-1',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
  situation: 'Разговор с начальником',
  thoughts: 'Я не справлюсь с задачей',
};

describe('JournalEntrySchema', () => {
  it('принимает корректную запись без опциональных полей', () => {
    const res = JournalEntrySchema.safeParse({ ...baseEntry, sudsBefore: 60 });
    assert.equal(res.success, true);
  });

  it('принимает запись с physical и emotion', () => {
    const res = JournalEntrySchema.safeParse({
      ...baseEntry,
      sudsBefore: 60,
      sudsAfter: 30,
      physical: 'Стучит сердце, потеют ладони',
      newView: 'Я справлялся с похожими задачами раньше',
      emotionId: 'anxiety',
      emotionName: 'Тревога',
    });
    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.data.physical, 'Стучит сердце, потеют ладони');
      assert.equal(res.data.emotionId, 'anxiety');
    }
  });

  it('принимает запись с выбранным узором мышления', () => {
    const res = JournalEntrySchema.safeParse({
      ...baseEntry,
      sudsBefore: 70,
      patternId: 'catastrophizing',
      patternName: 'Катастрофизация',
    });
    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.data.patternId, 'catastrophizing');
      assert.equal(res.data.patternName, 'Катастрофизация');
    }
  });

  it('отклоняет запись без ситуации', () => {
    const res = JournalEntrySchema.safeParse({
      id: 'entry-2',
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
      thoughts: 'Мысли без ситуации',
      sudsBefore: 40,
    });
    assert.equal(res.success, false);
  });

  it('отклоняет suds вне диапазона 0–100', () => {
    const res = JournalEntrySchema.safeParse({ ...baseEntry, sudsBefore: 150 });
    assert.equal(res.success, false);
  });
});
