import React, { useState, useEffect } from 'react';
import { t } from '../../utils/i18n';
import type { VocabWord, Settings } from '../../types';
import { reviewGotIt, reviewHard, reviewAgain, shouldMarkMastered } from '../../services/spaced-repetition';
import { posAbbr } from '../../utils/pos';
import { getDefinitionSourceLabels } from '../../utils/source-labels';


interface ReviewViewProps {
  settings: Settings;
}

export default function ReviewView({ settings }: ReviewViewProps) {
  const [words, setWords] = useState<VocabWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [playState, setPlayState] = useState<'idle' | 'loading' | 'playing'>('idle');

  useEffect(() => {
    loadReviewWords();
  }, []);

  const loadReviewWords = async () => {
    setLoading(true);
    const res = await chrome.runtime.sendMessage({ type: 'GET_REVIEW_WORDS' });
    if (res?.words) {
      const shuffled = [...res.words];
      // Fisher-Yates shuffle
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setWords(shuffled);
    }
    setLoading(false);
  };

  const currentWord = words[currentIndex];

  const handleGotIt = async () => {
    if (!currentWord) return;
    const newSR = reviewGotIt(currentWord);
    const mastered = shouldMarkMastered(newSR);
    const updated = {
      ...currentWord,
      sr: newSR,
      mastered: mastered || currentWord.mastered,
    };
    await chrome.runtime.sendMessage({ type: 'UPDATE_WORD', word: updated });
    advance();
  };

  const handleHard = async () => {
    if (!currentWord) return;
    const newSR = reviewHard(currentWord);
    const updated = { ...currentWord, sr: newSR };
    await chrome.runtime.sendMessage({ type: 'UPDATE_WORD', word: updated });
    advance();
  };

  const handleAgain = async () => {
    if (!currentWord) return;
    const newSR = reviewAgain(currentWord);
    const updated = { ...currentWord, sr: newSR };
    await chrome.runtime.sendMessage({ type: 'UPDATE_WORD', word: updated });
    setWords((prev) => [...prev, updated]);
    advance(words.length + 1);
  };

  const advance = (queueLength = words.length) => {
    setFlipped(false);
    setPlayState('idle');
    if (currentIndex >= queueLength - 1) {
      setCompleted(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const playAudio = (src: string) => new Promise<void>((resolve, reject) => {
    const audio = new Audio(src);
    audio.onplay = () => setPlayState('playing');
    audio.onended = () => { setPlayState('idle'); resolve(); };
    audio.onerror = () => reject(new Error('audio error'));
    audio.play().catch(reject);
  });

  const handlePronounce = () => {
    if (!currentWord || playState !== 'idle') return;
    setPlayState('loading');
    const accent = settings.defaultAccent;
    const tl = accent === 'uk' ? 'en-GB' : 'en-US';
    const dictUrl = accent === 'uk' && currentWord.audioUrlUK ? currentWord.audioUrlUK : currentWord.audioUrl;
    const tryTts = () => {
      chrome.runtime.sendMessage(
        { type: 'GET_TTS_AUDIO', word: currentWord.word, accent }
      ).then(async (res) => {
        if (res?.dataUrl) {
          await playAudio(res.dataUrl).catch(() => speakFallback(currentWord.word, tl));
        } else {
          speakFallback(currentWord.word, tl);
        }
      }).catch(() => speakFallback(currentWord.word, tl));
    };
    if (dictUrl) {
      playAudio(dictUrl).catch(() => tryTts());
    } else {
      tryTts();
    }
  };

  const speakFallback = (word: string, lang: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = lang;
      u.rate = 0.85;
      u.volume = 1;
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.lang === lang && (v.name.includes('Premium') || v.name.includes('Enhanced') || v.name.includes('Natural')))
        || voices.find(v => v.lang === lang)
        || voices.find(v => v.lang.startsWith('en'));
      if (voice) u.voice = voice;
      u.onstart = () => setPlayState('playing');
      u.onend = () => setPlayState('idle');
      u.onerror = () => setPlayState('idle');
      window.speechSynthesis.speak(u);
    } else {
      setPlayState('idle');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16 text-[var(--color-text-secondary)] text-xs">
        {t('common.loading')}
      </div>
    );
  }

  if (words.length === 0 || completed) {
    return (
      <div className="text-center py-16 px-8">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center">
          <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-[var(--color-text)]">
          {completed ? t('review.complete') : t('review.empty')}
        </p>
        {completed && (
          <button
            onClick={() => {
              setCompleted(false);
              setCurrentIndex(0);
              loadReviewWords();
            }}
            className="mt-4 px-5 py-2 bg-primary-500 text-white rounded-lg text-xs font-medium hover:bg-primary-600 transition-colors"
          >
            {t('review.title')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="px-5 py-3">
      {/* Progress */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-widest">
          {t('review.title')}
        </h3>
        <span className="text-[11px] text-[var(--color-text-secondary)] tabular-nums">
          {currentIndex + 1} {t('review.progress')} {words.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-[var(--color-divider)] rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
        />
      </div>

      {/* Flashcard */}
      <div
        className={`bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] overflow-hidden cursor-pointer flex flex-col transition-shadow hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] ${flipped ? '' : 'min-h-[220px]'}`}
        onClick={() => setFlipped(true)}
      >
        {/* Front: Word */}
        <div className="p-5 flex-1 flex flex-col items-center justify-center text-center">
          <h2 className="font-word text-2xl font-bold text-[var(--color-text)] mb-2">
            {currentWord.word}
          </h2>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePronounce();
            }}
            disabled={playState !== 'idle'}
            aria-label="Pronounce"
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors mb-4 ${
              playState === 'playing'
                ? 'bg-primary-100 dark:bg-primary-900/40 border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400'
                : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400'
            }`}
          >
            {playState === 'loading' ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40 20" strokeLinecap="round" />
              </svg>
            ) : (
              <svg className={`w-4 h-4 ${playState === 'playing' ? 'animate-pulse' : ''}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.383 3.07C11.009 2.893 10.579 2.91 10.224 3.114L4.839 6.5H2.5A1.5 1.5 0 001 8v8a1.5 1.5 0 001.5 1.5h2.339l5.385 3.386A1 1 0 0011.75 20V4a1 1 0 00-.367-.93zM14.5 7.5a.75.75 0 011.06 0 5.5 5.5 0 010 7.778.75.75 0 11-1.06-1.06 4 4 0 000-5.658.75.75 0 010-1.06z"/>
              </svg>
            )}
          </button>

          {!flipped && (
            <div className="mt-4 flex flex-col items-center gap-1.5">
              <p className="text-xs text-[var(--color-text-secondary)]">
                {t('review.front')}
              </p>
              <p className="text-[10px] text-[var(--color-text-secondary)]/70 tracking-wide">
                {t('review.rhythm')}
              </p>
            </div>
          )}
        </div>

        {/* Back: Definition + Context */}
        {flipped && (
          <div className="border-t border-[var(--color-divider)] p-4 animate-fade-up">
            {currentWord.phonetic && (
              <p className="text-xs text-[var(--color-text-secondary)] text-center mb-3">
                {currentWord.phonetic}
              </p>
            )}

            <div className="space-y-3 mb-3">
              {currentWord.definitions.map((def, i) => (
                <div key={i} className="border-l-2 border-[var(--color-divider)] pl-2.5">
                  <p className="text-sm text-[var(--color-text)] leading-relaxed">
                    <span className="inline-block align-[1px] mr-1.5 px-1.5 py-[1px] rounded text-[11px] font-semibold tabular-nums text-primary-700 dark:text-primary-300 bg-primary-100/70 dark:bg-primary-900/40">
                      {posAbbr(def.partOfSpeech)}
                    </span>
                    {def.meaning}
                  </p>
                  {def.meaningZh && (
                    <p className="font-zh text-xs text-[var(--color-text-secondary)]/85 mt-1 leading-relaxed">
                      {def.meaningZh}
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {getDefinitionSourceLabels(def).map((label) => (
                      <span
                        key={label}
                        className="rounded-full border border-[var(--color-border)] px-1.5 py-[1px] text-[9px] leading-snug text-[var(--color-text-secondary)]"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {currentWord.context.sentence && (
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed px-3 py-2 rounded-lg bg-[var(--color-surface)]">
                "{currentWord.context.sentence}"
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {flipped && (
        <div className="grid grid-cols-3 gap-2 mt-4 animate-fade-up">
          <button
            onClick={handleAgain}
            className="py-2.5 rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            {t('review.again')}
          </button>
          <button
            onClick={handleHard}
            className="py-2.5 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] text-sm font-medium hover:bg-[var(--color-surface)] transition-colors"
          >
            {t('review.hard')}
          </button>
          <button
            onClick={handleGotIt}
            className="py-2.5 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            {t('review.gotIt')}
          </button>
        </div>
      )}
    </div>
  );
}
