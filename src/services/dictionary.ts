import { DictionaryResult } from '../types';
import { allowRequest, fetchWithTimeout, isTemporarilyFailed, rememberTemporaryFailure } from './network';
import { translateDefinitions } from './translation';

const API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';

export async function lookupWord(word: string): Promise<DictionaryResult | null> {
  const normalized = word.toLowerCase().trim();
  const failureKey = `dictionary:${normalized}`;
  if (isTemporarilyFailed(failureKey)) return null;
  if (!allowRequest('dictionary', 30, 60 * 1000)) return null;

  try {
    const response = await fetchWithTimeout(`${API_BASE}/${encodeURIComponent(normalized)}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      rememberTemporaryFailure(failureKey);
      throw new Error(`Dictionary API error: ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const entry = data[0];

    // Extract phonetics
    let phonetic = entry.phonetic || '';
    let phoneticUK = '';
    let audioUrl = '';
    let audioUrlUK = '';

    if (entry.phonetics && Array.isArray(entry.phonetics)) {
      for (const p of entry.phonetics) {
        if (p.audio && p.audio.includes('-us')) {
          audioUrl = p.audio;
          if (p.text) phonetic = p.text;
        } else if (p.audio && p.audio.includes('-uk')) {
          audioUrlUK = p.audio;
          if (p.text) phoneticUK = p.text;
        } else if (p.audio && !audioUrl) {
          audioUrl = p.audio;
          if (p.text && !phonetic) phonetic = p.text;
        } else if (p.text && !phonetic) {
          phonetic = p.text;
        }
      }
    }

    // Extract definitions (top 2 meanings)
    const definitions: DictionaryResult['definitions'] = [];
    if (entry.meanings && Array.isArray(entry.meanings)) {
      for (const meaning of entry.meanings.slice(0, 3)) {
        if (meaning.definitions && meaning.definitions.length > 0) {
          definitions.push({
            partOfSpeech: meaning.partOfSpeech || '',
            meaning: meaning.definitions[0].definition || '',
            source: 'dictionary',
          });
        }
      }
    }

    const finalDefs = definitions.slice(0, 2);

    // Fetch Chinese translations for definitions
    const defsWithZh = await translateDefinitions(finalDefs).catch(() => finalDefs);

    return {
      word: entry.word || normalized,
      phonetic,
      phoneticUK,
      audioUrl,
      audioUrlUK,
      source: 'dictionary',
      definitions: defsWithZh,
    };
  } catch (error) {
    console.error('Dictionary lookup error:', error);
    rememberTemporaryFailure(failureKey);
    return null;
  }
}
