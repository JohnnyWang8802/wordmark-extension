import React, { useState, useEffect } from 'react';
import { t } from '../../utils/i18n';
import { formatDate, formatDisplayDate } from '../../utils/date';
import { getLanguage } from '../../utils/i18n';
import type { VocabWord, Settings } from '../../types';
import WordCard from '../components/WordCard';

interface HistoryViewProps {
  searchQuery: string;
  settings: Settings;
  refreshKey: number;
  onDataChange: () => void;
}

interface DateGroup {
  date: string;
  displayDate: string;
  words: VocabWord[];
}

export default function HistoryView({ searchQuery, settings, refreshKey, onDataChange }: HistoryViewProps) {
  const [groups, setGroups] = useState<DateGroup[]>([]);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllWords();
  }, [refreshKey]);

  const loadAllWords = async () => {
    setLoading(true);
    const res = await chrome.runtime.sendMessage({ type: 'GET_ALL_WORDS' });
    if (res?.words) {
      const grouped = groupByDate(res.words);
      setGroups(grouped);
      if (grouped.length > 0) {
        setExpandedDates(new Set([grouped[0].date]));
      }
    }
    setLoading(false);
  };

  const groupByDate = (words: VocabWord[]): DateGroup[] => {
    const map = new Map<string, VocabWord[]>();
    for (const word of words) {
      const date = formatDate(word.createdAt);
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(word);
    }

    const lang = getLanguage() as 'en' | 'zh';
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, words]) => ({
        date,
        displayDate: formatDisplayDate(date, lang),
        words: words.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      }));
  };

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const handleUpdate = async (word: VocabWord) => {
    await chrome.runtime.sendMessage({ type: 'UPDATE_WORD', word });
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        words: g.words.map((w) => (w.id === word.id ? word : w)),
      }))
    );
    onDataChange();
  };

  const handleDelete = async (id: string) => {
    await chrome.runtime.sendMessage({ type: 'DELETE_WORD', id });
    setGroups((prev) =>
      prev
        .map((g) => ({ ...g, words: g.words.filter((w) => w.id !== id) }))
        .filter((g) => g.words.length > 0)
    );
    onDataChange();
  };

  const filteredGroups = searchQuery
    ? groups
        .map((g) => ({
          ...g,
          words: g.words.filter(
            (w) =>
              w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
              w.definitions.some((d) =>
                d.meaning.toLowerCase().includes(searchQuery.toLowerCase())
              ) ||
              w.context.sentence.toLowerCase().includes(searchQuery.toLowerCase()) ||
              w.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
          ),
        }))
        .filter((g) => g.words.length > 0)
    : groups;

  if (loading) {
    return (
      <div className="text-center py-16 text-[var(--color-text-secondary)] text-xs">
        {t('common.loading')}
      </div>
    );
  }

  if (filteredGroups.length === 0) {
    return (
      <div className="text-center py-16 px-8">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center">
          <svg className="w-6 h-6 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-[var(--color-text)]">
          {t('history.empty')}
        </p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {filteredGroups.map((group) => (
        <div key={group.date}>
          {/* Date header */}
          <button
            onClick={() => toggleDate(group.date)}
            className="w-full flex items-center justify-between px-5 py-2.5 hover:bg-[var(--color-surface)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <svg
                className={`w-3 h-3 text-[var(--color-text-secondary)] transition-transform duration-200 ${
                  expandedDates.has(group.date) ? 'rotate-90' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-xs font-medium text-[var(--color-text)]">
                {group.displayDate}
              </span>
            </div>
            <span className="text-[10px] bg-[var(--color-surface)] text-[var(--color-text-secondary)] px-2 py-0.5 rounded-md border border-[var(--color-border)] font-medium">
              {group.words.length} {t('history.words')}
            </span>
          </button>

          {/* Words */}
          {expandedDates.has(group.date) && (
            <div className="px-5 pb-2 space-y-1.5">
              {group.words.map((word) => (
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
      ))}
    </div>
  );
}
