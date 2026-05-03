import React, { useEffect, useState } from 'react';
import { t } from '../../utils/i18n';
import type { Settings } from '../../types';
import ExportModal from '../components/ExportModal';

interface SettingsViewProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
}

const AI_MODEL_EXAMPLE = 'gpt-4o-mini';
const AI_BASE_URL_EXAMPLE = 'https://api.openai.com/v1';

export default function SettingsView({ settings, onSettingsChange }: SettingsViewProps) {
  const [showExport, setShowExport] = useState(false);
  const [saved, setSaved] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const aiInputClassName = 'w-full px-3 py-2 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] placeholder:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400 dark:focus:ring-primary-800 dark:focus:border-primary-600 transition-all';
  const aiModelValue = settings.aiModel === AI_MODEL_EXAMPLE ? '' : settings.aiModel;
  const aiBaseUrlValue = settings.aiApiBaseUrl === AI_BASE_URL_EXAMPLE ? '' : settings.aiApiBaseUrl;

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_AI_LOOKUP_CONFIG' }).then((res) => {
      if (res?.config?.apiKey) setApiKey(res.config.apiKey);
    });
  }, []);

  const update = (partial: Partial<Settings>) => {
    const updated = { ...settings, ...partial };
    onSettingsChange(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const saveApiKey = (value: string) => {
    chrome.runtime.sendMessage({ type: 'SAVE_AI_LOOKUP_CONFIG', config: { apiKey: value.trim() } });
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

      {/* AI lookup */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 py-1">
          <div>
            <label className="text-xs font-medium text-[var(--color-text)] block">
              {t('settings.aiLookup')}
            </label>
            <p className="mt-0.5 text-[10px] leading-snug text-[var(--color-text-secondary)]">
              {t('settings.aiLookupHint')}
            </p>
          </div>
          <button
            onClick={() => update({ aiLookupEnabled: !settings.aiLookupEnabled })}
            className={`w-10 h-[22px] rounded-full transition-colors relative flex-shrink-0 ${
              settings.aiLookupEnabled ? 'bg-primary-500' : 'bg-sand-400 dark:bg-sand-700'
            }`}
          >
            <div
              className={`w-[18px] h-[18px] bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${
                settings.aiLookupEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {settings.aiLookupEnabled && (
          <div className="space-y-3 rounded-lg border border-[var(--color-border)] p-3">
            <div>
              <label className="text-[10px] font-medium text-[var(--color-text-secondary)] block mb-1">
                {t('settings.aiMode')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['fallback', 'always'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => update({ aiLookupMode: mode })}
                    className={`min-h-[34px] px-2 py-1.5 text-[11px] leading-snug rounded-lg border font-medium transition-all ${
                      settings.aiLookupMode === mode
                        ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
                    }`}
                  >
                    {t(mode === 'fallback' ? 'settings.aiModeFallback' : 'settings.aiModeAlways')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-medium text-[var(--color-text-secondary)] block mb-1">
                {t('settings.aiModel')}
              </label>
              <input
                type="text"
                value={aiModelValue}
                onChange={(e) => update({ aiModel: e.target.value })}
                placeholder={AI_MODEL_EXAMPLE}
                className={aiInputClassName}
              />
            </div>

            <div>
              <label className="text-[10px] font-medium text-[var(--color-text-secondary)] block mb-1">
                {t('settings.aiBaseUrl')}
              </label>
              <input
                type="url"
                value={aiBaseUrlValue}
                onChange={(e) => update({ aiApiBaseUrl: e.target.value })}
                placeholder={AI_BASE_URL_EXAMPLE}
                className={aiInputClassName}
              />
              <p className="mt-1 text-[10px] leading-snug text-[var(--color-text-secondary)]">
                {t('settings.aiBaseUrlHint')}
              </p>
            </div>

            <div>
              <label className="text-[10px] font-medium text-[var(--color-text-secondary)] block mb-1">
                {t('settings.aiApiKey')}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onBlur={(e) => saveApiKey(e.target.value)}
                placeholder="sk-..."
                className={aiInputClassName}
              />
              <p className="mt-1 text-[10px] leading-snug text-[var(--color-text-secondary)]">
                {t('settings.aiPrivacy')}
              </p>
            </div>
          </div>
        )}
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
