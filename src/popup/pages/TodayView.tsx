import React, { useState, useEffect, useCallback } from 'react';
import { t } from '../../utils/i18n';
import { formatDate } from '../../utils/date';
import type { VocabWord, Settings } from '../../types';
import WordCard from '../components/WordCard';
import DateNav from '../components/DateNav';
import AddWordBar from '../components/AddWordBar';

interface TodayViewProps {
  searchQuery: string;
  settings: Settings;
}

export default function TodayView({ searchQuery, settings }: TodayViewProps) {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [date, setDate] = useState(formatDate(new Date()));
  const [loading, setLoading] = useState(true);

  const loadWords = useCallback(async () => {
    setLoading(true);
    const res = await chrome.runtime.sendMessage({ type: 'GET_SAVED_WORDS', date });
    if (res?.words) setWords(res.words);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    loadWords();
  }, [loadWords]);

  const handleUpdate = async (word: VocabWord) => {
    await chrome.runtime.sendMessage({ type: 'UPDATE_WORD', word });
    setWords((prev) => prev.map((w) => (w.id === word.id ? word : w)));
  };

  const handleDelete = async (id: string) => {
    await chrome.runtime.sendMessage({ type: 'DELETE_WORD', id });
    setWords((prev) => prev.filter((w) => w.id !== id));
  };

  const handleAdded = (word: VocabWord) => {
    setWords((prev) => [word, ...prev]);
  };

  const isToday = date === formatDate(new Date());

  const filtered = searchQuery
    ? words.filter(
        (w) =>
          w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.definitions.some((d) => d.meaning.toLowerCase().includes(searchQuery.toLowerCase())) ||
          w.context.sentence.toLowerCase().includes(searchQuery.toLowerCase()) ||
          w.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : words;

  return (
    <div className="pb-4">
      <DateNav currentDate={date} onChange={setDate} />

      {isToday && (
        <div className="mb-2">
          <AddWordBar onAdded={handleAdded} />
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-[var(--color-text-secondary)] text-xs">
          {t('common.loading')}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 px-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center">
            <svg className="w-6 h-6 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <p className="text-sm font-medium text-[var(--color-text)] mb-1">
            {t('today.empty')}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            {t('today.tip')}
          </p>
        </div>
      ) : (
        <div className="px-5 space-y-1.5">
          <p className="text-[10px] text-[var(--color-text-secondary)] uppercase tracking-widest font-medium px-0.5">
            {t('today.words')} ({filtered.length})
          </p>
          {filtered.map((word) => (
            <WordCard
              key={word.id}
              word={word}
              settings={settings}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
