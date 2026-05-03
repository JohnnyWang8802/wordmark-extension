import React, { useState, useEffect, useCallback } from 'react';
import { t, setLanguage, getLanguage } from '../utils/i18n';
import type { Settings, VocabWord } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import Logo from './components/Logo';
import StatsBar from './components/StatsBar';
import SearchBar from './components/SearchBar';
import TodayView from './pages/TodayView';
import HistoryView from './pages/HistoryView';
import ReviewView from './pages/ReviewView';
import SettingsView from './pages/SettingsView';

type Tab = 'today' | 'history' | 'review' | 'settings';

const TAB_ICONS: Record<Tab, (active: boolean) => React.ReactNode> = {
  today: (active) => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  history: (active) => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  review: (active) => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
    </svg>
  ),
  settings: (active) => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={active ? 2 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

export default function App() {
  const [tab, setTab] = useState<Tab>('today');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }).then((res) => {
      if (res?.settings) {
        setLanguage(res.settings.language || 'zh');
        setSettings(res.settings);
        applyTheme(res.settings.darkMode);
      }
    });
  }, []);

  const applyTheme = useCallback((mode: Settings['darkMode']) => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else if (mode === 'light') {
      root.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, []);

  useEffect(() => {
    if (settings.darkMode !== 'system') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme('system');
    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, [applyTheme, settings.darkMode]);

  useEffect(() => {
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes.wordmark_words) {
        setDataVersion((version) => version + 1);
      }
    };

    chrome.storage?.onChanged?.addListener(handleStorageChange);
    return () => chrome.storage?.onChanged?.removeListener(handleStorageChange);
  }, []);

  const notifyDataChanged = useCallback(() => {
    setDataVersion((version) => version + 1);
  }, []);

  const handleSettingsChange = useCallback(
    (newSettings: Settings) => {
      if (newSettings.language !== settings.language) {
        setLanguage(newSettings.language);
      }
      setSettings(newSettings);
      applyTheme(newSettings.darkMode);
      chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings: newSettings });
    },
    [applyTheme, settings.language]
  );

  const tabs: Tab[] = ['today', 'history', 'review', 'settings'];

  return (
    <div className="flex flex-col h-full bg-[var(--color-bg)]">
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <Logo size={28} className="rounded-lg" />
            <div>
              <h1 className="text-sm font-semibold text-[var(--color-text)] leading-tight tracking-tight">
                WordMark
              </h1>
              <p className="text-[10px] text-[var(--color-text-secondary)] leading-tight">
                {t('app.subtitle')}
              </p>
            </div>
          </div>
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-[var(--color-border)]">
          {tabs.map((key) => (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                setSearchQuery('');
              }}
              className={`
                flex-1 flex items-center justify-center pt-1 text-[11px] font-medium
                transition-colors duration-200
                ${
                  tab === key
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
                }
              `}
            >
              <span
                className={`inline-flex items-center gap-1.5 pb-2.5 -mb-px border-b-2 transition-colors ${
                  tab === key ? 'border-primary-500' : 'border-transparent'
                }`}
              >
                {TAB_ICONS[key](tab === key)}
                <span>{t(`nav.${key}`)}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar (only on today/history) */}
      {(tab === 'today' || tab === 'history') && (
        <div className="flex-shrink-0">
          <StatsBar refreshKey={dataVersion} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'today' && (
          <TodayView
            searchQuery={searchQuery}
            settings={settings}
            refreshKey={dataVersion}
            onDataChange={notifyDataChanged}
          />
        )}
        {tab === 'history' && (
          <HistoryView
            searchQuery={searchQuery}
            settings={settings}
            refreshKey={dataVersion}
            onDataChange={notifyDataChanged}
          />
        )}
        {tab === 'review' && (
          <ReviewView
            settings={settings}
            onDataChange={notifyDataChanged}
          />
        )}
        {tab === 'settings' && (
          <SettingsView settings={settings} onSettingsChange={handleSettingsChange} />
        )}
      </div>
    </div>
  );
}
