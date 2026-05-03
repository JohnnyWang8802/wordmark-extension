import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, addDays, isThisWeek } from '../src/utils/date.js';
import { lemmatize, cleanSelection, getLookupCandidates } from '../src/utils/lemmatizer.js';
import { isDueForReview } from '../src/utils/review.js';
import { getInitialSR, reviewAgain, reviewGotIt, reviewHard, shouldMarkMastered } from '../src/services/spaced-repetition.js';
import type { VocabWord } from '../src/types/index.js';

function makeWord(overrides: Partial<VocabWord> = {}): VocabWord {
  return {
    id: 'w1',
    word: 'test',
    originalForm: 'test',
    phonetic: '',
    definitions: [{ partOfSpeech: 'noun', meaning: 'a procedure' }],
    context: { sentence: '', pageTitle: '', pageUrl: '' },
    tags: [],
    mastered: false,
    createdAt: new Date().toISOString(),
    sr: getInitialSR(),
    ...overrides,
  };
}

test('date helpers use local calendar formatting', () => {
  const date = new Date(2026, 0, 2, 3, 4, 5);
  assert.equal(formatDate(date), '2026-01-02');
  assert.equal(formatDate(addDays(date, 1)), '2026-01-03');
  assert.equal(isThisWeek(new Date().toISOString()), true);
});

test('lemmatizer handles common forms and punctuation cleanup', () => {
  assert.equal(cleanSelection(' “Running,” '), 'Running');
  assert.equal(lemmatize('running'), 'run');
  assert.equal(lemmatize('making'), 'make');
  assert.equal(lemmatize('learning'), 'learn');
  assert.equal(lemmatize('interesting'), 'interest');
  assert.equal(lemmatize('cities'), 'city');
  assert.equal(lemmatize('children'), 'child');
  assert.equal(lemmatize('quickly'), 'quick');
  assert.deepEqual(getLookupCandidates('  “Learning,”  ').slice(0, 2), ['learn', 'learning']);
  assert.deepEqual(getLookupCandidates('coded').slice(0, 2), ['code', 'cod']);
});

test('spaced repetition schedules initial and failed reviews', () => {
  const word = makeWord({
    sr: { nextReviewDate: formatDate(new Date()), interval: 8, easeFactor: 2.5, repetitions: 3 },
  });
  const failed = reviewAgain(word);
  assert.equal(failed.interval, 1);
  assert.equal(failed.repetitions, 0);
  assert.equal(failed.easeFactor, 2.3);
});

test('spaced repetition advances successful reviews and mastery threshold', () => {
  const first = makeWord({
    sr: { nextReviewDate: formatDate(new Date()), interval: 1, easeFactor: 2.5, repetitions: 0 },
  });
  assert.equal(reviewGotIt(first).interval, 1);

  const second = makeWord({
    sr: { nextReviewDate: formatDate(new Date()), interval: 1, easeFactor: 2.5, repetitions: 1 },
  });
  assert.equal(reviewHard(second).interval, 6);

  assert.equal(shouldMarkMastered({ nextReviewDate: '2026-01-01', interval: 21, easeFactor: 2.5, repetitions: 5 }), true);
  assert.equal(shouldMarkMastered({ nextReviewDate: '2026-01-01', interval: 20, easeFactor: 2.5, repetitions: 5 }), false);
});

test('review due filter excludes mastered words and normalizes date strings', () => {
  assert.equal(isDueForReview(makeWord({
    mastered: false,
    sr: { nextReviewDate: '2026-01-01T12:00:00.000Z', interval: 1, easeFactor: 2.5, repetitions: 0 },
  }), '2026-01-02'), true);

  assert.equal(isDueForReview(makeWord({
    mastered: true,
    sr: { nextReviewDate: '2026-01-01', interval: 1, easeFactor: 2.5, repetitions: 0 },
  }), '2026-01-02'), false);

  assert.equal(isDueForReview(makeWord({
    mastered: false,
    sr: { nextReviewDate: '2026-01-03', interval: 1, easeFactor: 2.5, repetitions: 0 },
  }), '2026-01-02'), false);
});
