// Translation service: fetch Chinese definitions for English words
import type { VocabDefinition } from '../types';
import { allowRequest, fetchWithTimeout, isTemporarilyFailed, rememberTemporaryFailure } from './network';

const MYMEMORY_API = 'https://api.mymemory.translated.net/get';

export async function translateToZh(text: string): Promise<string> {
  const failureKey = `translation:${text.toLowerCase()}`;
  if (isTemporarilyFailed(failureKey)) return '';
  if (!allowRequest('translation', 20, 60 * 1000)) return '';

  try {
    const response = await fetchWithTimeout(
      `${MYMEMORY_API}?q=${encodeURIComponent(text)}&langpair=en|zh-CN`
    );
    if (!response.ok) {
      rememberTemporaryFailure(failureKey);
      return '';
    }
    const data = await response.json();
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const translated = data.responseData.translatedText;
      // MyMemory sometimes returns the original text when it can't translate
      if (translated === text) return '';
      return translated;
    }
    return '';
  } catch {
    rememberTemporaryFailure(failureKey);
    return '';
  }
}

// Translate multiple definitions in parallel
export async function translateDefinitions(
  definitions: VocabDefinition[]
): Promise<VocabDefinition[]> {
  const results = await Promise.all(
    definitions.map(async (def) => {
      const meaningZh = await translateToZh(def.meaning);
      return {
        ...def,
        meaningZh: meaningZh || undefined,
        translationSource: meaningZh ? 'free-translation' : def.translationSource,
      };
    })
  );
  return results;
}
