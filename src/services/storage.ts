import { VocabWord, Settings, DEFAULT_SETTINGS, SaveWordResult, AiLookupConfig } from '../types';
import { formatDate, isThisWeek } from '../utils/date';
import { isDueForReview } from '../utils/review';

const WORDS_KEY = 'wordmark_words';
const SETTINGS_KEY = 'wordmark_settings';
const AI_LOOKUP_CONFIG_KEY = 'wordmark_ai_lookup_config';
const CACHE_KEY = 'wordmark_dict_cache';

let writeQueue: Promise<unknown> = Promise.resolve();

function enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(operation, operation);
  writeQueue = next.catch(() => undefined);
  return next;
}

// ---------- Words ----------

export async function getAllWords(): Promise<VocabWord[]> {
  const result = await chrome.storage.local.get(WORDS_KEY);
  return result[WORDS_KEY] || [];
}

export async function getWordsByDate(date: string): Promise<VocabWord[]> {
  const all = await getAllWords();
  return all
    .filter((w) => formatDate(w.createdAt) === date)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function saveWord(word: VocabWord): Promise<SaveWordResult> {
  return enqueueWrite(async () => {
    const all = await getAllWords();
    const existing = all.find(
      (w) => w.word.toLowerCase() === word.word.toLowerCase()
    );

    if (existing) {
      return { word: existing, created: false, duplicate: true };
    }

    all.push(word);
    await chrome.storage.local.set({ [WORDS_KEY]: all });
    return { word, created: true, duplicate: false };
  });
}

export async function updateWord(word: VocabWord): Promise<void> {
  return enqueueWrite(async () => {
    const all = await getAllWords();
    const idx = all.findIndex((w) => w.id === word.id);
    if (idx >= 0) {
      all[idx] = word;
      await chrome.storage.local.set({ [WORDS_KEY]: all });
    }
  });
}

export async function deleteWord(id: string): Promise<void> {
  return enqueueWrite(async () => {
    const all = await getAllWords();
    const filtered = all.filter((w) => w.id !== id);
    await chrome.storage.local.set({ [WORDS_KEY]: filtered });
  });
}

export async function isWordSaved(word: string): Promise<boolean> {
  const all = await getAllWords();
  return all.some((w) => w.word.toLowerCase() === word.toLowerCase());
}

export async function getReviewWords(): Promise<VocabWord[]> {
  const all = await getAllWords();
  const today = formatDate(new Date());
  return all.filter((w) => isDueForReview(w, today));
}

export async function getStats(): Promise<{
  total: number;
  thisWeek: number;
  mastered: number;
  reviewDue: number;
}> {
  const all = await getAllWords();
  const today = formatDate(new Date());
  return {
    total: all.length,
    thisWeek: all.filter((w) => isThisWeek(w.createdAt)).length,
    mastered: all.filter((w) => w.mastered).length,
    reviewDue: all.filter((w) => isDueForReview(w, today)).length,
  };
}

// ---------- Settings ----------

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] || {}) };
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  return enqueueWrite(async () => {
    const current = await getSettings();
    const updated = { ...current, ...settings };
    await chrome.storage.local.set({ [SETTINGS_KEY]: updated });
  });
}

export async function getAiLookupConfig(): Promise<AiLookupConfig> {
  const result = await chrome.storage.local.get(AI_LOOKUP_CONFIG_KEY);
  return { apiKey: '', ...(result[AI_LOOKUP_CONFIG_KEY] || {}) };
}

export async function saveAiLookupConfig(config: Partial<AiLookupConfig>): Promise<void> {
  return enqueueWrite(async () => {
    const current = await getAiLookupConfig();
    await chrome.storage.local.set({ [AI_LOOKUP_CONFIG_KEY]: { ...current, ...config } });
  });
}

// ---------- Dictionary Cache ----------

export async function getCachedLookup(word: string): Promise<any | null> {
  const result = await chrome.storage.local.get(CACHE_KEY);
  const cache = result[CACHE_KEY] || {};
  return cache[word.toLowerCase()] || null;
}

export async function setCachedLookup(word: string, data: any): Promise<void> {
  return enqueueWrite(async () => {
    const result = await chrome.storage.local.get(CACHE_KEY);
    const cache = result[CACHE_KEY] || {};
    cache[word.toLowerCase()] = data;
    // Limit cache to 1000 entries
    const keys = Object.keys(cache);
    if (keys.length > 1000) {
      delete cache[keys[0]];
    }
    await chrome.storage.local.set({ [CACHE_KEY]: cache });
  });
}

// ---------- Export/Import ----------

export async function exportData(): Promise<{
  schemaVersion: 1;
  words: VocabWord[];
  settings: Settings;
  exportedAt: string;
}> {
  const words = await getAllWords();
  const settings = await getSettings();
  return {
    schemaVersion: 1,
    words,
    settings,
    exportedAt: new Date().toISOString(),
  };
}

export async function importData(data: { words: VocabWord[]; settings?: Settings }): Promise<number> {
  return enqueueWrite(async () => {
    const existing = await getAllWords();
    const existingIds = new Set(existing.map((w) => w.word.toLowerCase()));
    const newWords = data.words.filter((w) => !existingIds.has(w.word.toLowerCase()));
    const merged = [...existing, ...newWords];
    await chrome.storage.local.set({ [WORDS_KEY]: merged });
    if (data.settings) {
      const current = await getSettings();
      await chrome.storage.local.set({ [SETTINGS_KEY]: { ...current, ...data.settings } });
    }
    return newWords.length;
  });
}

export async function exportCSV(): Promise<string> {
  const words = await getAllWords();
  const header = 'Word,Phonetic,Part of Speech,Definition,Context,Source URL,Date,Tags,Mastered';
  const rows = words.map((w) => {
    const def = w.definitions[0];
    return [
      `"${w.word}"`,
      `"${w.phonetic}"`,
      `"${def?.partOfSpeech || ''}"`,
      `"${def?.meaning?.replace(/"/g, '""') || ''}"`,
      `"${w.context.sentence.replace(/"/g, '""')}"`,
      `"${w.context.pageUrl}"`,
      `"${formatDate(w.createdAt)}"`,
      `"${w.tags.join(', ')}"`,
      w.mastered ? 'Yes' : 'No',
    ].join(',');
  });
  return [header, ...rows].join('\n');
}

export async function exportAnki(): Promise<string> {
  // Anki tab-separated format: front \t back
  const words = await getAllWords();
  return words
    .map((w) => {
      const front = `${w.word} ${w.phonetic}`;
      const defs = w.definitions.map((d) => `${d.partOfSpeech}: ${d.meaning}`).join('<br>');
      const back = `${defs}<br><br>Context: ${w.context.sentence}`;
      return `${front}\t${back}`;
    })
    .join('\n');
}

export async function clearAllData(): Promise<void> {
  await chrome.storage.local.clear();
}
