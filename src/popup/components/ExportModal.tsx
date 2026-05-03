import React, { useState } from 'react';
import { t } from '../../utils/i18n';
import { exportData, exportCSV, exportAnki, importData, clearAllData } from '../../services/storage';
import type { Settings, VocabWord } from '../../types';

interface ExportModalProps {
  onClose: () => void;
}

export default function ExportModal({ onClose }: ExportModalProps) {
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');

  const download = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = async () => {
    const data = await exportData();
    download(JSON.stringify(data, null, 2), 'wordmark-backup.json', 'application/json');
    setMessage(t('data.jsonExported'));
  };

  const handleExportCSV = async () => {
    const csv = await exportCSV();
    download(csv, 'wordmark-vocabulary.csv', 'text/csv');
    setMessage(t('data.csvExported'));
  };

  const handleExportAnki = async () => {
    const anki = await exportAnki();
    download(anki, 'wordmark-anki.txt', 'text/plain');
    setMessage(t('data.ankiExported'));
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImporting(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!isImportPayload(data)) {
          throw new Error('Invalid format');
        }
        if (!data.words.every(isValidWordEntry)) {
          setMessage(t('data.importInvalidWords'));
          setImporting(false);
          return;
        }
        const count = await importData(data);
        setMessage(t('data.imported').replace('{0}', String(count)));
      } catch (err) {
        setMessage(t('data.importFailed'));
      }
      setImporting(false);
    };
    input.click();
  };

  const handleClearAll = async () => {
    if (confirm(t('data.clearConfirm'))) {
      await clearAllData();
      setMessage(t('data.cleared'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--color-card)] rounded-xl w-full max-w-sm shadow-2xl animate-fade-up">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-bold text-[var(--color-text)]">{t('settings.data')}</h3>
          <button
            onClick={onClose}
            className="text-[var(--color-text-secondary)] hover:text-[var(--color-text)] p-1 rounded-md hover:bg-[var(--color-surface)] transition-colors"
            aria-label={t('common.close')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Export options */}
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
            {t('settings.export')}
          </p>
          <div className="space-y-2">
            <button
              onClick={handleExportJSON}
              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-[var(--color-divider)] transition-colors flex items-center gap-2"
            >
              <FileIcon />
              <span>{t('export.json')}</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-[var(--color-divider)] transition-colors flex items-center gap-2"
            >
              <TableIcon />
              <span>{t('export.csv')}</span>
            </button>
            <button
              onClick={handleExportAnki}
              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-[var(--color-divider)] transition-colors flex items-center gap-2"
            >
              <CardsIcon />
              <span>{t('export.anki')}</span>
            </button>
          </div>

          {/* Import */}
          <p className="text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider pt-2">
            {t('settings.import')}
          </p>
          <button
            onClick={handleImport}
            disabled={importing}
            className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-[var(--color-divider)] transition-colors flex items-center gap-2"
          >
            <ImportIcon />
            <span>{importing ? t('data.importing') : `${t('settings.import')} JSON`}</span>
          </button>

          {/* Clear all */}
          <div className="pt-2 border-t border-[var(--color-border)]">
            <button
              onClick={handleClearAll}
              className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 transition-colors flex items-center gap-2"
            >
              <WarningIcon />
              <span>{t('settings.clearAll')}</span>
            </button>
          </div>

          {/* Status message */}
          {message && (
            <p className="text-xs text-center text-primary-500 font-medium">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isImportPayload(value: unknown): value is { words: VocabWord[]; settings?: Settings } {
  return isRecord(value)
    && Array.isArray(value.words)
    && (value.settings === undefined || isValidSettings(value.settings));
}

function isDefinition(value: unknown): boolean {
  return isRecord(value)
    && typeof value.partOfSpeech === 'string'
    && typeof value.meaning === 'string'
    && (value.meaningZh === undefined || typeof value.meaningZh === 'string')
    && (value.source === undefined || value.source === 'dictionary' || value.source === 'free-translation' || value.source === 'ai')
    && (value.translationSource === undefined || value.translationSource === 'dictionary' || value.translationSource === 'free-translation' || value.translationSource === 'ai');
}

function isValidWordEntry(value: unknown): value is VocabWord {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== 'string'
    || typeof value.word !== 'string'
    || typeof value.originalForm !== 'string'
    || typeof value.phonetic !== 'string'
    || !Array.isArray(value.definitions)
    || !value.definitions.every(isDefinition)
    || !isRecord(value.context)
    || typeof value.context.sentence !== 'string'
    || typeof value.context.pageTitle !== 'string'
    || typeof value.context.pageUrl !== 'string'
    || !Array.isArray(value.tags)
    || !value.tags.every((tag) => typeof tag === 'string')
    || typeof value.mastered !== 'boolean'
    || typeof value.createdAt !== 'string'
    || !isRecord(value.sr)
    || typeof value.sr.nextReviewDate !== 'string'
    || typeof value.sr.interval !== 'number'
    || typeof value.sr.easeFactor !== 'number'
    || typeof value.sr.repetitions !== 'number'
  ) {
    return false;
  }
  return true;
}

function isValidSettings(value: unknown): value is Settings {
  if (!isRecord(value)) return false;
  return typeof value.reviewReminderTime === 'string'
    && (value.defaultAccent === 'us' || value.defaultAccent === 'uk')
    && typeof value.highlightSavedWords === 'boolean'
    && (value.language === 'en' || value.language === 'zh')
    && (value.darkMode === 'system' || value.darkMode === 'light' || value.darkMode === 'dark')
    && (value.aiLookupEnabled === undefined || typeof value.aiLookupEnabled === 'boolean')
    && (value.aiLookupMode === undefined || value.aiLookupMode === 'fallback' || value.aiLookupMode === 'always')
    && (value.aiModel === undefined || typeof value.aiModel === 'string')
    && (value.aiApiBaseUrl === undefined || typeof value.aiApiBaseUrl === 'string');
}

function ModalIcon({ children, danger = false }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <span className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
      danger
        ? 'border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-900/20 text-red-500'
        : 'border-[var(--color-border)] bg-[var(--color-surface)] text-primary-600 dark:text-primary-400'
    }`}>
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
        {children}
      </svg>
    </span>
  );
}

function FileIcon() {
  return (
    <ModalIcon>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5a1 1 0 001 1h5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
    </ModalIcon>
  );
}

function TableIcon() {
  return (
    <ModalIcon>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16M9 6v12M15 6v12" />
    </ModalIcon>
  );
}

function CardsIcon() {
  return (
    <ModalIcon>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 11h6" />
      <rect x="4" y="4" width="16" height="12" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 20h8" />
    </ModalIcon>
  );
}

function ImportIcon() {
  return (
    <ModalIcon>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v12m0 0l-4-4m4 4l4-4M5 19h14" />
    </ModalIcon>
  );
}

function WarningIcon() {
  return (
    <ModalIcon danger>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5m0 3h.01" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L2.82 17a2 2 0 001.71 3h14.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </ModalIcon>
  );
}
