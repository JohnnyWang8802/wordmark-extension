// SM-2 Spaced Repetition Algorithm
import type { VocabWord } from '../types';
import { formatDate, addDays } from '../utils/date.js';

export interface ReviewResult {
  quality: number; // 0-5, where 0 = complete failure, 5 = perfect recall
}

export function getInitialSR() {
  return {
    nextReviewDate: formatDate(addDays(new Date(), 1)), // Review tomorrow
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
  };
}

export function processReview(
  word: VocabWord,
  quality: number // 0-5
): VocabWord['sr'] {
  const { easeFactor, interval, repetitions } = word.sr;

  // If quality < 3, reset repetitions
  if (quality < 3) {
    return {
      nextReviewDate: formatDate(addDays(new Date(), 1)),
      interval: 1,
      easeFactor: Math.max(1.3, easeFactor - 0.2),
      repetitions: 0,
    };
  }

  // Calculate new ease factor
  const newEF = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  // Calculate new interval
  let newInterval: number;
  if (repetitions === 0) {
    newInterval = 1;
  } else if (repetitions === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round(interval * newEF);
  }

  return {
    nextReviewDate: formatDate(addDays(new Date(), newInterval)),
    interval: newInterval,
    easeFactor: newEF,
    repetitions: repetitions + 1,
  };
}

// Simplified review: "Got it" = quality 4, "Hard" = quality 3, "Forgot" = quality 1
export function reviewGotIt(word: VocabWord): VocabWord['sr'] {
  return processReview(word, 4);
}

export function reviewHard(word: VocabWord): VocabWord['sr'] {
  return processReview(word, 3);
}

export function reviewAgain(word: VocabWord): VocabWord['sr'] {
  return processReview(word, 1);
}

// Check if a word should be marked as mastered (reviewed successfully 5+ times)
export function shouldMarkMastered(sr: VocabWord['sr']): boolean {
  return sr.repetitions >= 5 && sr.interval >= 21;
}
