import { lookupWord } from '../services/dictionary';
import { allowRequest, fetchWithTimeout, isTemporarilyFailed, rememberTemporaryFailure } from '../services/network';
import {
  getAllWords,
  getWordsByDate,
  saveWord,
  updateWord,
  deleteWord,
  isWordSaved,
  getReviewWords,
  getStats,
  getSettings,
  saveSettings,
  getCachedLookup,
  setCachedLookup,
} from '../services/storage';
import { formatDate } from '../utils/date';
import type { DictionaryResult, MessageType } from '../types';

const ttsCache = new Map<string, string>();

// ---------- Message Handling ----------

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message as MessageType).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(message: MessageType): Promise<unknown> {
  switch (message.type) {
    case 'LOOKUP_WORD': {
      const { word } = message;
      // Check cache — skip if it lacks Chinese translations
      const cached = await getCachedLookup(word);
      if (cached && cached.definitions?.some((d: { meaningZh?: string }) => d.meaningZh)) {
        return { type: 'LOOKUP_WORD_RESULT', data: cached as DictionaryResult };
      }
      const data = await lookupWord(word);
      if (data) {
        await setCachedLookup(word, data);
      }
      return { type: 'LOOKUP_WORD_RESULT', data };
    }

    case 'GET_TTS_AUDIO': {
      const { word: ttsWord, accent: ttsAccent } = message;
      const tl = ttsAccent === 'uk' ? 'en-GB' : 'en-US';
      const cacheKey = `${tl}:${ttsWord.toLowerCase()}`;
      const hit = ttsCache.get(cacheKey);
      if (hit) return { type: 'TTS_AUDIO_RESULT', dataUrl: hit };
      if (isTemporarilyFailed(`tts:${cacheKey}`) || !allowRequest('tts', 40, 60 * 1000)) {
        return { type: 'TTS_AUDIO_RESULT', dataUrl: null };
      }
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(ttsWord)}&tl=${tl}&client=tw-ob`;
      try {
        const res = await fetchWithTimeout(ttsUrl, {}, 6000);
        if (!res.ok) throw new Error('TTS fetch failed');
        const blob = await res.blob();
        const reader = new FileReader();
        const dataUrl: string = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        if (ttsCache.size >= 200) ttsCache.delete(ttsCache.keys().next().value as string);
        ttsCache.set(cacheKey, dataUrl);
        return { type: 'TTS_AUDIO_RESULT', dataUrl };
      } catch {
        rememberTemporaryFailure(`tts:${cacheKey}`);
        return { type: 'TTS_AUDIO_RESULT', dataUrl: null };
      }
    }

    case 'SAVE_WORD': {
      try {
        const result = await saveWord(message.word);
        await updateBadge();
        return { type: 'SAVE_WORD_RESULT', success: true, ...result };
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        return { type: 'SAVE_WORD_RESULT', success: false, error: msg };
      }
    }

    case 'GET_SAVED_WORDS': {
      const date = message.date || formatDate(new Date());
      const words = await getWordsByDate(date);
      return { type: 'GET_SAVED_WORDS_RESULT', words };
    }

    case 'GET_ALL_WORDS': {
      const words = await getAllWords();
      return { type: 'GET_ALL_WORDS_RESULT', words };
    }

    case 'DELETE_WORD': {
      await deleteWord(message.id);
      await updateBadge();
      return { success: true };
    }

    case 'UPDATE_WORD': {
      await updateWord(message.word);
      await updateBadge();
      return { success: true };
    }

    case 'CHECK_WORD_SAVED': {
      const saved = await isWordSaved(message.word);
      return { type: 'CHECK_WORD_SAVED_RESULT', saved };
    }

    case 'GET_REVIEW_WORDS': {
      const words = await getReviewWords();
      return { type: 'GET_REVIEW_WORDS_RESULT', words };
    }

    case 'GET_STATS': {
      const stats = await getStats();
      return { type: 'GET_STATS_RESULT', stats };
    }

    case 'GET_SETTINGS': {
      const settings = await getSettings();
      return { type: 'GET_SETTINGS_RESULT', settings };
    }

    case 'SAVE_SETTINGS': {
      await saveSettings(message.settings);
      if (message.settings.reviewReminderTime) {
        await setupAlarms();
      }
      return { success: true };
    }

    default:
      return { error: 'Unknown message type' };
  }
}

// ---------- Badge ----------

async function updateBadge() {
  const stats = await getStats();
  const count = stats.reviewDue;
  if (count > 0) {
    chrome.action.setBadgeText({ text: String(count) });
    chrome.action.setBadgeBackgroundColor({ color: '#C87B4A' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// ---------- Alarms ----------

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'review-reminder') {
    const stats = await getStats();
    if (stats.reviewDue > 0) {
      const settings = await getSettings();
      const msg = settings.language === 'zh'
        ? `你有 ${stats.reviewDue} 个单词需要复习！`
        : `You have ${stats.reviewDue} word${stats.reviewDue > 1 ? 's' : ''} to review today!`;
      chrome.notifications.create('review-reminder', {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'WordMark',
        message: msg,
      });
    }
  }

  if (alarm.name === 'badge-update') {
    await updateBadge();
  }
});

// Set up daily reminder
async function setupAlarms() {
  const settings = await getSettings();
  const [hours, minutes] = settings.reviewReminderTime.split(':').map(Number);

  await chrome.alarms.clearAll();

  const now = new Date();
  const reminderTime = new Date();
  reminderTime.setHours(hours, minutes, 0, 0);
  if (reminderTime <= now) {
    reminderTime.setDate(reminderTime.getDate() + 1);
  }

  chrome.alarms.create('review-reminder', {
    when: reminderTime.getTime(),
    periodInMinutes: 24 * 60,
  });

  chrome.alarms.create('badge-update', {
    periodInMinutes: 30,
  });
}

// ---------- Initialization ----------

chrome.runtime.onInstalled.addListener(async () => {
  await setupAlarms();
  await updateBadge();
});

chrome.runtime.onStartup.addListener(async () => {
  await setupAlarms();
  await updateBadge();
});
