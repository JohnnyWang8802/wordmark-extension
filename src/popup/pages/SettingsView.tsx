import React, { useState } from 'react';
import { t } from '../../utils/i18n';
import type { Settings } from '../../types';
import ExportModal from '../components/ExportModal';

interface SettingsViewProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}

export default function SettingsView({ settings, onSettingsChange }: SettingsViewProps) {
  const [showExport, setShowExport] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = (partial: Partial<Settings>) => {
    const updated = { ...settings, ...partial };
    onSettingsChange(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="px-5 py-4 pb-6 space-y-5">
      <h3 className="text-[10px] font-medium text-[var(--color-text-secondary)] uppercase tracking-widest">
        {t('settings.title')}
      </h3>

      {/* Review reminder */}
      <div>
        <label className="text-xs font-medium text-[var(--color-text)] block mb-1.5">
          {t('settings.reminder')}
        </label>
        <input
          type="time"
          value={settings.reviewReminderTime}
          onChange={(e) => update({ reviewReminderTime: e.target.value })}
          className="px-3 py-2 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 dark:focus:ring-primary-800 dark:focus:border-primary-600 transition-all"
        />
      </div>

      {/* Accent */}
      <div>
        <label className="text-xs font-medium text-[var(--color-text)] block mb-1.5">
          {t('settings.accent')}
        </label>
        <div className="flex gap-2">
          {(['us', 'uk'] as const).map((acc) => (
            <button
              key={acc}
              onClick={() => update({ defaultAccent: acc })}
              className={`flex-1 min-h-[38px] px-2 py-2 text-xs leading-snug rounded-lg border font-medium transition-all whitespace-normal text-center ${
                settings.defaultAccent === acc
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
              }`}
            >
              {t(acc === 'us' ? 'settings.accentUS' : 'settings.accentUK')}
            </button>
          ))}
        </div>
      </div>

      {/* Highlight saved words */}
      <div className="flex items-center justify-between py-1">
        <label className="text-xs font-medium text-[var(--color-text)]">
          {t('settings.highlight')}
        </label>
        <button
          onClick={() => update({ highlightSavedWords: !settings.highlightSavedWords })}
          className={`w-10 h-[22px] rounded-full transition-colors relative ${
            settings.highlightSavedWords ? 'bg-primary-500' : 'bg-sand-400 dark:bg-sand-700'
          }`}
        >
          <div
            className={`w-[18px] h-[18px] bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${
              settings.highlightSavedWords ? 'translate-x-[22px]' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Language */}
      <div>
        <label className="text-xs font-medium text-[var(--color-text)] block mb-1.5">
          {t('settings.language')}
        </label>
        <div className="flex gap-2">
          {([{ key: 'zh', label: '中文' }, { key: 'en', label: 'English' }] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => update({ language: key })}
              className={`flex-1 min-h-[36px] px-2 py-2 text-xs leading-snug rounded-lg border font-medium transition-all whitespace-normal text-center ${
                settings.language === key
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div>
        <label className="text-xs font-medium text-[var(--color-text)] block mb-1.5">
          {t('settings.theme')}
        </label>
        <div className="flex gap-2">
          {(['system', 'light', 'dark'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => update({ darkMode: mode })}
              className={`flex-1 min-h-[36px] px-2 py-2 text-xs leading-snug rounded-lg border font-medium transition-all whitespace-normal text-center ${
                settings.darkMode === mode
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
              }`}
            >
              {t(`settings.theme${mode.charAt(0).toUpperCase() + mode.slice(1)}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Data management */}
      <div>
        <button
          onClick={() => setShowExport(true)}
          className="w-full py-2.5 text-xs rounded-lg border border-[var(--color-border)] text-[var(--color-text)] font-medium hover:bg-[var(--color-surface)] transition-colors"
        >
          {t('settings.data')}
        </button>
      </div>

      {/* Saved indicator */}
      {saved && (
        <div className="flex items-center justify-center gap-1.5 animate-fade-up">
          <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">
            {t('settings.saved')}
          </p>
        </div>
      )}

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </div>
  );
}
