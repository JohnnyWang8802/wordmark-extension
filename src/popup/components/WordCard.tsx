import React, { useState, useRef } from 'react';
import { t } from '../../utils/i18n';
import { posAbbr } from '../../utils/pos';
import type { VocabWord, Settings } from '../../types';


interface WordCardProps {
  word: VocabWord;
  settings: Settings;
  onUpdate: (word: VocabWord) => void;
  onDelete: (id: string) => void;
}

export default function WordCard({ word, settings, onUpdate, onDelete }: WordCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [playState, setPlayState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const playAudio = (src: string) => {
    return new Promise<void>((resolve, reject) => {
      const audio = new Audio(src);
      audio.onplay = () => setPlayState('playing');
      audio.onended = () => { setPlayState('idle'); resolve(); };
      audio.onerror = () => reject(new Error('audio error'));
      audio.play().catch(reject);
    });
  };

  const handlePronounce = () => {
    if (playState !== 'idle') return;
    setPlayState('loading');
    const accent = settings.defaultAccent;
    const dictUrl = accent === 'uk' && word.audioUrlUK ? word.audioUrlUK : word.audioUrl;
    const tryTts = () => {
      chrome.runtime.sendMessage(
        { type: 'GET_TTS_AUDIO', word: word.word, accent }
      ).then(async (res) => {
        if (res?.dataUrl) {
          await playAudio(res.dataUrl).catch(() => fallbackSpeak());
        } else {
          fallbackSpeak();
        }
      }).catch(() => fallbackSpeak());
    };
    if (dictUrl) {
      playAudio(dictUrl).catch(() => tryTts());
    } else {
      tryTts();
    }
  };

  const fallbackSpeak = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(word.word);
      utterance.lang = settings.defaultAccent === 'uk' ? 'en-GB' : 'en-US';
      utterance.rate = 0.85;
      utterance.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const targetLang = utterance.lang;
      const voice = voices.find(v => v.lang === targetLang && (v.name.includes('Premium') || v.name.includes('Enhanced') || v.name.includes('Natural')))
        || voices.find(v => v.lang === targetLang)
        || voices.find(v => v.lang.startsWith('en'));
      if (voice) utterance.voice = voice;
      utterance.onstart = () => setPlayState('playing');
      utterance.onend = () => setPlayState('idle');
      utterance.onerror = () => setPlayState('idle');
      window.speechSynthesis.speak(utterance);
    } else {
      setPlayState('idle');
    }
  };

  const handleToggleMastered = () => {
    onUpdate({ ...word, mastered: !word.mastered });
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !word.tags.includes(tag)) {
      onUpdate({ ...word, tags: [...word.tags, tag] });
    }
    setTagInput('');
    setShowTagInput(false);
  };

  const handleRemoveTag = (tag: string) => {
    onUpdate({ ...word, tags: word.tags.filter((t) => t !== tag) });
  };

  const handleDeleteClick = () => {
    if (confirmingDelete) {
      onDelete(word.id);
      return;
    }
    setConfirmingDelete(true);
    window.setTimeout(() => setConfirmingDelete(false), 3000);
  };

  const phonetic = settings.defaultAccent === 'uk' && word.phoneticUK
    ? word.phoneticUK : word.phonetic;

  const sourceHost = (() => {
    try {
      return new URL(word.context.pageUrl).hostname;
    } catch {
      return word.context.pageUrl;
    }
  })();

  const createdDate = new Date(word.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="animate-fade-up bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden transition-shadow hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
      {/* Header row */}
      <div
        className="px-4 pt-3 pb-2.5 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-word text-[17px] font-bold text-[var(--color-text)] truncate leading-snug">
                {word.word}
              </h3>
              {word.mastered && (
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              {phonetic && (
                <span className="text-xs text-[var(--color-text-secondary)] font-light">
                  {phonetic}
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePronounce();
                }}
                disabled={playState !== 'idle'}
                className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                  playState === 'playing'
                    ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-primary-100 dark:hover:bg-primary-900/30 hover:text-primary-600 dark:hover:text-primary-400'
                }`}
                title="Pronounce"
                aria-label="Pronounce"
              >
                {playState === 'loading' ? (
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40 20" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg className={`w-3.5 h-3.5 ${playState === 'playing' ? 'animate-pulse' : ''}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.383 3.07C11.009 2.893 10.579 2.91 10.224 3.114L4.839 6.5H2.5A1.5 1.5 0 001 8v8a1.5 1.5 0 001.5 1.5h2.339l5.385 3.386A1 1 0 0011.75 20V4a1 1 0 00-.367-.93zM14.5 7.5a.75.75 0 011.06 0 5.5 5.5 0 010 7.778.75.75 0 11-1.06-1.06 4 4 0 000-5.658.75.75 0 010-1.06z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          <svg
            className={`flex-shrink-0 w-4 h-4 text-[var(--color-text-secondary)] transition-transform duration-200 mt-1 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Definitions */}
        <div className="mt-2 space-y-2">
          {word.definitions.map((def, i) => (
            <div key={i} className="border-l-2 border-[var(--color-divider)] pl-2.5">
              <p className="text-xs text-[var(--color-text)] leading-relaxed">
                <span className="inline-block align-[1px] mr-1.5 px-1.5 py-[1px] rounded text-[10px] font-semibold tabular-nums text-primary-700 dark:text-primary-300 bg-primary-100/70 dark:bg-primary-900/40">
                  {posAbbr(def.partOfSpeech)}
                </span>
                {def.meaning}
              </p>
              {def.meaningZh && (
                <p className="font-zh text-[11px] text-[var(--color-text-secondary)]/85 mt-1 leading-relaxed">
                  {def.meaningZh}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="animate-slide-in">
          {/* Context */}
          {word.context.sentence && (
            <div className="mx-4 px-3 py-2.5 rounded-lg bg-[var(--color-surface)] mb-2">
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)] font-medium mb-1.5">
                {t('card.context')}
              </p>
              <p className="text-xs text-[var(--color-text)] leading-relaxed">
                "{highlightWord(word.context.sentence, word.originalForm || word.word)}"
              </p>
            </div>
          )}

          {/* Tags */}
          <div className="px-4 py-2.5">
            <div className="flex items-center flex-wrap gap-1.5">
              {word.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 text-[10px] bg-[var(--color-surface)] text-[var(--color-text-secondary)] px-2 py-1 rounded-md border border-[var(--color-border)]"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="opacity-40 hover:opacity-100 transition-opacity"
                  >
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              {showTagInput ? (
                <input
                  ref={tagInputRef}
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTag();
                    if (e.key === 'Escape') setShowTagInput(false);
                  }}
                  onBlur={handleAddTag}
                  placeholder={t('card.addTag')}
                  className="text-[10px] w-20 px-2 py-1 rounded-md border border-[var(--color-border)] bg-transparent outline-none focus:border-primary-400 text-[var(--color-text)]"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => setShowTagInput(true)}
                  className="text-[10px] text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                >
                  + {t('card.addTag')}
                </button>
              )}
            </div>
          </div>

          {/* Footer: source + actions */}
          <div className="px-4 py-2.5 border-t border-[var(--color-divider)] flex items-center justify-between">
            <div className="text-[10px] text-[var(--color-text-secondary)]">
              {sourceHost} · {createdDate}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleToggleMastered}
                className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                  word.mastered
                    ? 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'
                    : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800'
                }`}
              >
                {word.mastered ? t('card.unmaster') : t('card.markMastered')}
              </button>
              <button
                onClick={handleDeleteClick}
                className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
                  confirmingDelete
                    ? 'text-white bg-red-500 border-red-500 hover:bg-red-600'
                    : 'text-red-500 dark:text-red-400 border-transparent hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800'
                }`}
              >
                {confirmingDelete ? t('card.confirmDelete') : t('card.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function highlightWord(sentence: string, word: string): React.ReactNode {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = sentence.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === word.toLowerCase() ? (
      <span key={i} className="font-semibold text-primary-600 dark:text-primary-400">
        {part}
      </span>
    ) : (
      part
    )
  );
}
