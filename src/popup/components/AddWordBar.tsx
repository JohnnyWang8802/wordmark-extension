import React, { useState, useRef, useEffect } from 'react';
import { t } from '../../utils/i18n';
import { getInitialSR } from '../../services/spaced-repetition';
import type { VocabWord, DictionaryResult } from '../../types';

interface AddWordBarProps {
  onAdded: (word: VocabWord) => void;
}

type State = 'idle' | 'loading' | 'error';

export default function AddWordBar({ onAdded }: AddWordBarProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    setValue('');
    setState('idle');
    setError('');
  };

  const submit = async () => {
    const word = value.trim().toLowerCase();
    if (!word) return;
    setState('loading');
    setError('');
    try {
      const res = await chrome.runtime.sendMessage({ type: 'LOOKUP_WORD', word });
      const data: DictionaryResult | null = res?.data;
      if (!data || !data.definitions?.length) {
        setState('error');
        setError(t('add.notFound'));
        return;
      }
      const vocab: VocabWord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        word: data.word || word,
        originalForm: word,
        phonetic: data.phonetic || '',
        phoneticUK: data.phoneticUK,
        audioUrl: data.audioUrl,
        audioUrlUK: data.audioUrlUK,
        definitions: data.definitions,
        context: { sentence: '', pageTitle: '', pageUrl: '' },
        tags: [],
        mastered: false,
        createdAt: new Date().toISOString(),
        sr: getInitialSR(),
      };
      const save = await chrome.runtime.sendMessage({ type: 'SAVE_WORD', word: vocab });
      if (!save?.success) {
        setState('error');
        setError(save?.error?.includes('duplicate') ? t('add.duplicate') : t('add.failed'));
        return;
      }
      if (save.duplicate) {
        setState('error');
        setError(t('add.duplicate'));
        return;
      }
      onAdded(save.word || vocab);
      close();
    } catch {
      setState('error');
      setError(t('add.failed'));
    }
  };

  if (!open) {
    return (
      <div className="px-5">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 text-[11px] text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {t('add.button')}
        </button>
      </div>
    );
  }

  return (
    <div className="px-5">
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); setState('idle'); setError(''); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') close();
            }}
            placeholder={t('add.placeholder')}
            disabled={state === 'loading'}
            className="
              w-full pl-8 pr-3 py-2 text-xs rounded-lg
              bg-[var(--color-surface)] border border-[var(--color-border)]
              text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]
              focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400
              dark:focus:ring-primary-800 dark:focus:border-primary-600
              disabled:opacity-60
            "
          />
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-secondary)] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <button
          onClick={close}
          className="text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] px-2 py-1"
        >
          {t('common.cancel')}
        </button>
      </div>
      {state === 'loading' && (
        <p className="mt-1.5 text-[10px] text-[var(--color-text-secondary)]">{t('add.looking')}</p>
      )}
      {state === 'error' && error && (
        <p className="mt-1.5 text-[10px] text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
