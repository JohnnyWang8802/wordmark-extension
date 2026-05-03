import React from 'react';
import { t, getLanguage } from '../../utils/i18n';
import { formatDate } from '../../utils/date';

function getDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const lang = getLanguage();
  if (lang === 'zh') {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

interface DateNavProps {
  currentDate: string;
  onChange: (date: string) => void;
}

export default function DateNav({ currentDate, onChange }: DateNavProps) {
  const isToday = currentDate === formatDate(new Date());

  const goBack = () => {
    const d = new Date(currentDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    onChange(formatDate(d));
  };

  const goForward = () => {
    if (isToday) return;
    const d = new Date(currentDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    onChange(formatDate(d));
  };

  const goToday = () => {
    onChange(formatDate(new Date()));
  };

  return (
    <div className="flex items-center justify-between px-5 py-2.5">
      <button
        onClick={goBack}
        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--color-surface)] transition-colors"
      >
        <svg className="w-4 h-4 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={goToday}
        className="text-[13px] font-medium text-[var(--color-text)] hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
      >
        {isToday ? t('nav.today') : getDisplayDate(currentDate)}
      </button>

      <button
        onClick={goForward}
        disabled={isToday}
        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
          isToday ? 'opacity-20 cursor-default' : 'hover:bg-[var(--color-surface)]'
        }`}
      >
        <svg className="w-4 h-4 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
