import React, { useState, useRef, useEffect } from 'react';
import { t } from '../../utils/i18n';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
}

export default function SearchBar({ value, onChange }: SearchBarProps) {
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  useEffect(() => {
    if (value && !expanded) setExpanded(true);
  }, [value, expanded]);

  const collapse = () => {
    if (!value) setExpanded(false);
  };

  const clearAndCollapse = () => {
    onChange('');
    setExpanded(false);
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        aria-label={t('search.placeholder')}
        className="
          w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
          bg-[var(--color-surface)] border border-[var(--color-border)]
          text-[var(--color-text-secondary)]
          hover:text-[var(--color-text)] hover:border-primary-400
          transition-colors
        "
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="relative flex-shrink-0">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={collapse}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            clearAndCollapse();
          }
        }}
        placeholder={t('search.placeholder')}
        className="
          w-40 pl-7 pr-7 py-1.5 text-xs rounded-lg
          bg-[var(--color-surface)] border border-[var(--color-border)]
          text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]
          focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400
          dark:focus:ring-primary-800 dark:focus:border-primary-600
          transition-all
        "
      />
      <svg
        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-text-secondary)] pointer-events-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      {value && (
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={clearAndCollapse}
          aria-label={t('common.clear')}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-divider)] transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
