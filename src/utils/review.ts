import type { VocabWord } from '../types';
import { formatDate } from './date.js';

function normalizeDateString(date: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return formatDate(parsed);
}

export function isDueForReview(word: VocabWord, today = formatDate(new Date())): boolean {
  return !word.mastered && normalizeDateString(word.sr.nextReviewDate) <= today;
}
