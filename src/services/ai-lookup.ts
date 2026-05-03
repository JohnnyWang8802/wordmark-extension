import type { DictionaryResult, Settings } from '../types';
import { allowRequest, fetchWithTimeout, isTemporarilyFailed, rememberTemporaryFailure } from './network';

interface AiLookupParams {
  word: string;
  contextSentence?: string;
  pageTitle?: string;
  dictionaryResult?: DictionaryResult | null;
  settings: Settings;
  apiKey: string;
}

function getChatCompletionsUrl(baseUrl: string): string {
  const trimmed = (baseUrl || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
  if (trimmed.endsWith('/chat/completions')) return trimmed;
  if (trimmed.endsWith('/v1')) return `${trimmed}/chat/completions`;
  return `${trimmed}/v1/chat/completions`;
}

interface AiLookupResponse {
  word?: string;
  partOfSpeech?: string;
  englishDefinition?: string;
  chineseMeaning?: string;
  confidence?: number;
}

function safeJsonParse(text: string): AiLookupResponse | null {
  try {
    return JSON.parse(text) as AiLookupResponse;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as AiLookupResponse;
    } catch {
      return null;
    }
  }
}

function dictionaryContext(result: DictionaryResult | null | undefined): string {
  if (!result?.definitions?.length) return 'No dictionary result was found.';
  return result.definitions
    .slice(0, 4)
    .map((d) => `${d.partOfSpeech || 'unknown'}: ${d.meaning}${d.meaningZh ? ` / ${d.meaningZh}` : ''}`)
    .join('\n');
}

export async function lookupWordWithAI(params: AiLookupParams): Promise<DictionaryResult | null> {
  const { word, contextSentence, pageTitle, dictionaryResult, settings, apiKey } = params;
  const normalized = word.toLowerCase().trim();
  if (!normalized || !apiKey.trim()) return null;

  const model = settings.aiModel || 'gpt-4o-mini';
  const apiUrl = getChatCompletionsUrl(settings.aiApiBaseUrl);
  const failureKey = `aiLookup:${apiUrl}:${model}`;
  if (isTemporarilyFailed(failureKey)) return null;
  if (!allowRequest('aiLookup', 20, 60 * 1000)) return null;

  const prompt = [
    `Target word or phrase: ${word}`,
    contextSentence ? `Sentence context: ${contextSentence}` : '',
    pageTitle ? `Page title: ${pageTitle}` : '',
    `Existing dictionary result:\n${dictionaryContext(dictionaryResult)}`,
    '',
    'Return one JSON object only. Choose the meaning that best fits the context.',
    'Fields: word, partOfSpeech, englishDefinition, chineseMeaning, confidence.',
    'Use concise Simplified Chinese for chineseMeaning.',
  ].filter(Boolean).join('\n');

  try {
    const body = {
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a precise English-Chinese learner dictionary. Return strict JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    };

    const makeRequest = (withJsonFormat: boolean) => fetchWithTimeout(
      apiUrl,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify(withJsonFormat
          ? { ...body, response_format: { type: 'json_object' } }
          : body),
      },
      15000
    );

    let response = await makeRequest(true);
    if (response.status === 400) {
      // Some OpenAI-compatible providers do not implement response_format.
      response = await makeRequest(false);
    }

    if (!response.ok) {
      rememberTemporaryFailure(failureKey, response.status === 401 ? 60 * 1000 : 5 * 60 * 1000);
      return null;
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return null;

    const parsed = safeJsonParse(content);
    if (!parsed?.chineseMeaning && !parsed?.englishDefinition) return null;

    const baseDefinition = dictionaryResult?.definitions?.[0];
    return {
      word: parsed.word || dictionaryResult?.word || normalized,
      phonetic: dictionaryResult?.phonetic || '',
      phoneticUK: dictionaryResult?.phoneticUK,
      audioUrl: dictionaryResult?.audioUrl,
      audioUrlUK: dictionaryResult?.audioUrlUK,
      source: 'ai',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : undefined,
      definitions: [
        {
          partOfSpeech: parsed.partOfSpeech || baseDefinition?.partOfSpeech || '',
          meaning: parsed.englishDefinition || baseDefinition?.meaning || '',
          meaningZh: parsed.chineseMeaning || baseDefinition?.meaningZh || '',
          source: 'ai',
          translationSource: 'ai',
        },
      ],
    };
  } catch (error) {
    console.error('AI lookup error:', error);
    rememberTemporaryFailure(failureKey);
    return null;
  }
}
