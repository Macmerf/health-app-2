import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkCrisisKeywords } from '../src/shared/lib/crisis-detector.ts';

describe('checkCrisisKeywords', () => {
  it('находит суицидальные маркеры', () => {
    assert.equal(checkCrisisKeywords('Мне кажется, я не хочу жить'), true);
    assert.equal(checkCrisisKeywords('Хочу умереть'), true);
    assert.equal(checkCrisisKeywords('Лучше умереть, чем так жить'), true);
  });

  it('находит маркеры самоповреждения и паники', () => {
    assert.equal(checkCrisisKeywords('У меня паническая атака'), true);
    assert.equal(checkCrisisKeywords('Я не справляюсь, больше нет сил'), true);
    assert.equal(checkCrisisKeywords('Похоже, я теряю контроль'), true);
  });

  it('не срабатывает на обычные тексты', () => {
    assert.equal(checkCrisisKeywords('Сегодня был обычный день, я гулял в парке'), false);
    assert.equal(checkCrisisKeywords('На работе много задач, но я справляюсь'), false);
  });

  it('обрабатывает пустые строки', () => {
    assert.equal(checkCrisisKeywords(''), false);
    assert.equal(checkCrisisKeywords('   '), false);
    assert.equal(checkCrisisKeywords(undefined as unknown as string), false);
  });

  it('не зависит от регистра', () => {
    assert.equal(checkCrisisKeywords('НЕ ВИЖУ ВЫХОДА'), true);
    assert.equal(checkCrisisKeywords('не вижу выхода'), true);
  });
});
