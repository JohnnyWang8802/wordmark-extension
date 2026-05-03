export interface VocabWord {
  id: string;
  word: string;
  originalForm: string;
  phonetic: string;
  phoneticUK?: string;
  audioUrl?: string;
  audioUrlUK?: string;
  definitions: {
    partOfSpeech: string;
    meaning: string;
    meaningZh?: string;
  }[];
  context: {
    sentence: string;
    pageTitle: string;
    pageUrl: string;
  };
  tags: string[];
  mastered: boolean;
  createdAt: string;
  sr: {
    nextReviewDate: string;
    interval: number;
    easeFactor: number;
    repetitions: number;
  };
}

export interface DictionaryResult {
  word: string;
  phonetic?: string;
  phoneticUK?: string;
  audioUrl?: string;
  audioUrlUK?: string;
  definitions: {
    partOfSpeech: string;
    meaning: string;
    meaningZh?: string;
  }[];
}

export interface SaveWordResult {
  word: VocabWord;
  created: boolean;
  duplicate: boolean;
}

export interface Settings {
  reviewReminderTime: string;
  defaultAccent: 'us' | 'uk';
  highlightSavedWords: boolean;
  language: 'en' | 'zh';
  darkMode: 'system' | 'light' | 'dark';
}

export const DEFAULT_SETTINGS: Settings = {
  reviewReminderTime: '09:00',
  defaultAccent: 'us',
  highlightSavedWords: true,
  language: 'zh',
  darkMode: 'system',
};

export type MessageType =
  | { type: 'LOOKUP_WORD'; word: string }
  | { type: 'LOOKUP_WORD_RESULT'; data: DictionaryResult | null; error?: string }
  | { type: 'SAVE_WORD'; word: VocabWord }
  | { type: 'SAVE_WORD_RESULT'; success: boolean; word?: VocabWord; created?: boolean; duplicate?: boolean; error?: string }
  | { type: 'GET_SAVED_WORDS'; date?: string }
  | { type: 'GET_SAVED_WORDS_RESULT'; words: VocabWord[] }
  | { type: 'GET_ALL_WORDS' }
  | { type: 'GET_ALL_WORDS_RESULT'; words: VocabWord[] }
  | { type: 'DELETE_WORD'; id: string }
  | { type: 'UPDATE_WORD'; word: VocabWord }
  | { type: 'GET_TTS_AUDIO'; word: string; accent: 'us' | 'uk' }
  | { type: 'GET_SETTINGS' }
  | { type: 'GET_SETTINGS_RESULT'; settings: Settings }
  | { type: 'SAVE_SETTINGS'; settings: Partial<Settings> }
  | { type: 'GET_REVIEW_WORDS' }
  | { type: 'GET_REVIEW_WORDS_RESULT'; words: VocabWord[] }
  | { type: 'CHECK_WORD_SAVED'; word: string }
  | { type: 'CHECK_WORD_SAVED_RESULT'; saved: boolean }
  | { type: 'GET_STATS' }
  | { type: 'GET_STATS_RESULT'; stats: { total: number; thisWeek: number; mastered: number; reviewDue: number } };
