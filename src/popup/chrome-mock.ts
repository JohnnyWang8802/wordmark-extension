// Mock Chrome APIs for dev server preview mode
// This allows the popup to render in a regular browser tab

import type { VocabWord, Settings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { isDueForReview } from '../utils/review';

const STORAGE_KEY = 'wordmark_dev_words';
const SETTINGS_KEY = 'wordmark_dev_settings';
const AI_LOOKUP_CONFIG_KEY = 'wordmark_dev_ai_lookup_config';

function getStoredWords(): VocabWord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function setStoredWords(words: VocabWord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

function getStoredSettings(): Settings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function setStoredSettings(settings: Settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function getAiLookupConfig() {
  try {
    return { apiKey: '', ...JSON.parse(localStorage.getItem(AI_LOOKUP_CONFIG_KEY) || '{}') };
  } catch {
    return { apiKey: '' };
  }
}

function setAiLookupConfig(config: { apiKey?: string }) {
  localStorage.setItem(AI_LOOKUP_CONFIG_KEY, JSON.stringify({ ...getAiLookupConfig(), ...config }));
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isThisWeek(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay());
  start.setHours(0, 0, 0, 0);
  return d >= start;
}

// Sample words for preview
const SAMPLE_WORDS: VocabWord[] = [
  {
    id: 'demo-1',
    word: 'ephemeral',
    originalForm: 'ephemeral',
    phonetic: '/ɪˈfem.ər.əl/',
    audioUrl: 'https://api.dictionaryapi.dev/media/pronunciations/en/ephemeral-us.mp3',
    definitions: [
      { partOfSpeech: 'adj', meaning: 'lasting for a very short time', meaningZh: '短暂的；转瞬即逝的', source: 'dictionary', translationSource: 'free-translation' },
      { partOfSpeech: 'adj', meaning: '(biology) lasting for only a day, as certain plants or insects', meaningZh: '（生物学）仅存活一天的', source: 'dictionary', translationSource: 'free-translation' },
    ],
    context: {
      sentence: 'The beauty of cherry blossoms is ephemeral, lasting only a week.',
      pageTitle: 'Nature Magazine',
      pageUrl: 'https://example.com/nature',
    },
    tags: ['GRE', 'nature'],
    mastered: false,
    createdAt: new Date().toISOString(),
    sr: { nextReviewDate: formatDate(new Date()), interval: 1, easeFactor: 2.5, repetitions: 0 },
  },
  {
    id: 'demo-2',
    word: 'ubiquitous',
    originalForm: 'ubiquitous',
    phonetic: '/juːˈbɪk.wɪ.təs/',
    audioUrl: '',
    definitions: [
      { partOfSpeech: 'adj', meaning: 'present, appearing, or found everywhere', meaningZh: '无处不在的；普遍存在的', source: 'dictionary', translationSource: 'free-translation' },
    ],
    context: {
      sentence: 'Smartphones have become ubiquitous in modern society.',
      pageTitle: 'Tech Review',
      pageUrl: 'https://example.com/tech',
    },
    tags: ['tech', 'GRE'],
    mastered: false,
    createdAt: new Date().toISOString(),
    sr: { nextReviewDate: formatDate(new Date()), interval: 1, easeFactor: 2.5, repetitions: 0 },
  },
  {
    id: 'demo-3',
    word: 'serendipity',
    originalForm: 'serendipity',
    phonetic: '/ˌser.ənˈdɪp.ə.ti/',
    audioUrl: '',
    definitions: [
      { partOfSpeech: 'noun', meaning: 'the occurrence of events by chance in a happy or beneficial way', meaningZh: '意外发现的好运；机缘巧合', source: 'dictionary', translationSource: 'free-translation' },
    ],
    context: {
      sentence: 'Finding that rare book at the garage sale was pure serendipity.',
      pageTitle: 'Daily Blog',
      pageUrl: 'https://example.com/blog',
    },
    tags: ['life'],
    mastered: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(), // yesterday
    sr: { nextReviewDate: formatDate(new Date()), interval: 21, easeFactor: 2.8, repetitions: 5 },
  },
];

// Initialize dev storage with sample data if empty or missing meaningZh
const existingWords = getStoredWords();
if (existingWords.length === 0 || (existingWords[0]?.id?.startsWith('demo-') && !existingWords[0]?.definitions?.[0]?.meaningZh)) {
  setStoredWords(SAMPLE_WORDS);
}

async function handleMessage(message: any): Promise<any> {
  const words = getStoredWords();
  const settings = getStoredSettings();

  switch (message.type) {
    case 'GET_SETTINGS':
      return { settings };

    case 'SAVE_SETTINGS':
      setStoredSettings({ ...settings, ...message.settings });
      return { success: true };

    case 'GET_AI_LOOKUP_CONFIG':
      return { config: getAiLookupConfig() };

    case 'SAVE_AI_LOOKUP_CONFIG':
      setAiLookupConfig(message.config || {});
      return { success: true };

    case 'GET_STATS': {
      const today = formatDate(new Date());
      return {
        stats: {
          total: words.length,
          thisWeek: words.filter((w) => isThisWeek(w.createdAt)).length,
          mastered: words.filter((w) => w.mastered).length,
          reviewDue: words.filter((w) => isDueForReview(w, today)).length,
        },
      };
    }

    case 'GET_SAVED_WORDS': {
      const date = message.date || formatDate(new Date());
      const filtered = words
        .filter((w) => formatDate(new Date(w.createdAt)) === date)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return { words: filtered };
    }

    case 'GET_ALL_WORDS':
      return { words };

    case 'UPDATE_WORD': {
      const idx = words.findIndex((w) => w.id === message.word.id);
      if (idx >= 0) {
        words[idx] = message.word;
        setStoredWords(words);
      }
      return { success: true };
    }

    case 'DELETE_WORD': {
      setStoredWords(words.filter((w) => w.id !== message.id));
      return { success: true };
    }

    case 'GET_REVIEW_WORDS': {
      const today = formatDate(new Date());
      return { words: words.filter((w) => isDueForReview(w, today)) };
    }

    case 'LOOKUP_WORD': {
      const w = String(message.word || '').trim().toLowerCase();
      if (!w) return { data: null };
      try {
        const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(w)}`);
        if (!resp.ok) return { data: null };
        const json = await resp.json();
        if (!Array.isArray(json) || !json[0]) return { data: null };
        const entry = json[0];
        const phoneticObj = (entry.phonetics || []).find((p: any) => p.text) || {};
        const audioObj = (entry.phonetics || []).find((p: any) => p.audio) || {};
        const definitions = (entry.meanings || []).flatMap((m: any) =>
          (m.definitions || []).slice(0, 1).map((d: any) => ({
            partOfSpeech: m.partOfSpeech || '',
            meaning: d.definition || '',
            source: 'dictionary',
          }))
        );
        return {
          data: {
            word: entry.word || w,
            phonetic: phoneticObj.text || '',
            audioUrl: audioObj.audio || '',
            definitions,
          },
        };
      } catch {
        return { data: null };
      }
    }

    case 'REGENERATE_DEFINITION': {
      const base = message.dictionaryResult;
      const w = String(message.word || base?.word || '').trim().toLowerCase();
      if (!w) return { data: null, error: 'Missing word' };
      return {
        data: {
          word: base?.word || w,
          phonetic: base?.phonetic || '',
          phoneticUK: base?.phoneticUK,
          audioUrl: base?.audioUrl || '',
          audioUrlUK: base?.audioUrlUK,
          source: 'ai',
          confidence: 0.9,
          definitions: [
            {
              partOfSpeech: base?.definitions?.[0]?.partOfSpeech || 'word',
              meaning: base?.definitions?.[0]?.meaning || `AI-refined definition for ${w}`,
              meaningZh: `AI 重新生成的「${w}」释义`,
              source: 'ai',
              translationSource: 'ai',
            },
          ],
        },
      };
    }

    case 'SAVE_WORD': {
      const incoming = message.word;
      const dup = words.find(
        (w) => w.word.toLowerCase() === incoming.word.toLowerCase()
      );
      if (dup) return { success: true, word: dup, created: false, duplicate: true };
      setStoredWords([incoming, ...words]);
      return { success: true, word: incoming, created: true, duplicate: false };
    }

    default:
      return { error: 'Unknown message type (dev mock)' };
  }
}

// Install mock
if (typeof globalThis.chrome === 'undefined' || !globalThis.chrome?.runtime?.sendMessage) {
  (globalThis as any).chrome = {
    ...(globalThis as any).chrome,
    runtime: {
      sendMessage: (msg: any) => handleMessage(msg),
    },
    action: {
      setBadgeText: () => {},
      setBadgeBackgroundColor: () => {},
    },
    storage: {
      local: {
        get: async () => ({}),
        set: async () => {},
        clear: async () => { localStorage.clear(); },
      },
      sync: {
        get: async () => ({}),
        set: async () => {},
      },
    },
  };
}

export {};
