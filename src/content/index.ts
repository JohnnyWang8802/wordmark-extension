import type { DictionaryResult, Settings, VocabWord } from '../types';

function cleanSelection(text: string): string {
  return text.replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, '').trim();
}

function lemmatize(word: string): string {
  const lower = cleanSelection(word).toLowerCase();
  if (lower.length <= 2) return lower;
  if (lower.endsWith('ies') && lower.length > 4) return lower.slice(0, -3) + 'y';
  if (
    lower.endsWith('ses') ||
    lower.endsWith('xes') ||
    lower.endsWith('zes') ||
    lower.endsWith('ches') ||
    lower.endsWith('shes')
  ) {
    return lower.slice(0, -2);
  }
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 3) return lower.slice(0, -1);
  return lower;
}

function extractSentence(word: string, anchorNode: Node | null): string {
  if (!anchorNode) return '';
  const parent = anchorNode.nodeType === Node.TEXT_NODE
    ? anchorNode.parentElement
    : anchorNode as HTMLElement;
  if (!parent) return '';

  let container: HTMLElement = parent;
  const inlineElements = new Set([
    'A', 'ABBR', 'ACRONYM', 'B', 'BDO', 'BIG', 'BR', 'BUTTON', 'CITE',
    'CODE', 'DFN', 'EM', 'I', 'IMG', 'INPUT', 'KBD', 'LABEL', 'MAP',
    'OBJECT', 'OUTPUT', 'Q', 'SAMP', 'SCRIPT', 'SELECT', 'SMALL', 'SPAN',
    'STRONG', 'SUB', 'SUP', 'TEXTAREA', 'TIME', 'TT', 'U', 'VAR',
  ]);
  while (container.parentElement && inlineElements.has(container.tagName)) {
    container = container.parentElement;
  }

  const text = container.textContent || '';
  const sentences = text.split(/(?<=[.!?])\s+/);
  const lowerWord = word.toLowerCase();
  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(lowerWord)) {
      const cleaned = sentence.replace(/\s+/g, ' ').trim();
      if (cleaned.length > 200) {
        const idx = cleaned.toLowerCase().indexOf(lowerWord);
        const start = Math.max(0, idx - 80);
        const end = Math.min(cleaned.length, idx + word.length + 80);
        return `${start > 0 ? '...' : ''}${cleaned.slice(start, end).trim()}${end < cleaned.length ? '...' : ''}`;
      }
      return cleaned;
    }
  }

  const trimmed = text.replace(/\s+/g, ' ').trim();
  return trimmed.length > 200 ? `${trimmed.slice(0, 197)}...` : trimmed;
}

// Inline getInitialSR to avoid shared chunk with background service worker
function getInitialSR() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextReviewDate = formatLocalDate(tomorrow);
  return { nextReviewDate, interval: 1, easeFactor: 2.5, repetitions: 0 };
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ---------- Shadow DOM ----------

let shadowHost: HTMLDivElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let bubbleEl: HTMLDivElement | null = null;
let isShowing = false;
let highlightStyle: HTMLStyleElement | null = null;
let highlightRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let contentDarkMode: Settings['darkMode'] = 'system';
let contentLanguage: Settings['language'] = 'zh';
let systemThemeQuery: MediaQueryList | null = null;
let onSystemThemeChange: (() => void) | null = null;

const wordmarkWindow = window as Window & {
  __wordmarkCleanupContentScript?: () => void;
};

function ensureShadowHost() {
  if (shadowHost) return;
  shadowHost = document.createElement('div');
  shadowHost.id = 'wordmark-root';
  shadowHost.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;';
  document.body.appendChild(shadowHost);
  shadowRoot = shadowHost.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = CONTENT_STYLES;
  shadowRoot.appendChild(style);
}

// Resolve the extension theme setting. "system" still follows the page/browser preference.
function isDarkMode(): boolean {
  if (contentDarkMode === 'dark') return true;
  if (contentDarkMode === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// ---------- Styles with dark mode ----------

const CONTENT_STYLES = `
:host {
  all: initial;
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.wm-bubble {
  position: fixed; z-index: 2147483647; width: 340px;
  border-radius: 14px; padding: 0; border: 0;
  animation: wm-bubble-in 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  overflow: hidden; pointer-events: auto;
}
.wm-bubble.wm-light {
  background: #FDFCFA; color: #2C2418;
  box-shadow: 0 2px 8px rgba(44,36,24,0.24);
}
.wm-bubble.wm-dark {
  background: #262320; color: #EDE8E0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.52);
}

@keyframes wm-bubble-in {
  from { opacity: 0; transform: scale(0.96) translateY(6px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes wm-bubble-out {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.96) translateY(6px); }
}
.wm-bubble.wm-closing { animation: wm-bubble-out 0.15s ease-in forwards; }

.wm-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 16px 18px 10px; }
.wm-word-section { flex: 1; min-width: 0; }
.wm-word { font-family: Georgia, Cambria, serif; font-size: 22px; font-weight: 700; margin: 0; line-height: 1.2; letter-spacing: -0.01em; }
.wm-light .wm-word { color: #2C2418; }
.wm-dark .wm-word { color: #EDE8E0; }

.wm-phonetic-row { display: flex; align-items: center; gap: 8px; margin-top: 5px; }
.wm-phonetic { font-size: 12px; font-weight: 300; }
.wm-light .wm-phonetic { color: #8C7E6E; }
.wm-dark .wm-phonetic { color: #9A8B7A; }

.wm-audio-btn {
  cursor: pointer; width: 24px; height: 24px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s, border-color 0.15s; border: 1px solid;
}
.wm-light .wm-audio-btn { background: #F5F0EA; border-color: #EDE8E0; }
.wm-light .wm-audio-btn:hover { background: #F2D9BF; border-color: #D9996A; }
.wm-dark .wm-audio-btn { background: #3D3630; border-color: #4D453D; }
.wm-dark .wm-audio-btn:hover { background: #5A4E42; border-color: #C87B4A; }
.wm-audio-btn svg { width: 12px; height: 12px; }
.wm-light .wm-audio-btn svg { fill: #8C7E6E; }
.wm-dark .wm-audio-btn svg { fill: #B8A898; }

.wm-close-btn {
  background: none; border: none; cursor: pointer; padding: 4px;
  line-height: 1; border-radius: 6px; transition: background 0.15s, color 0.15s; flex-shrink: 0;
}
.wm-light .wm-close-btn { color: #B8A898; }
.wm-light .wm-close-btn:hover { background: #F5F0EA; color: #7D6F60; }
.wm-dark .wm-close-btn { color: #7D6F60; }
.wm-dark .wm-close-btn:hover { background: #3D3630; color: #B8A898; }
.wm-close-btn svg { width: 16px; height: 16px; }

.wm-divider { height: 1px; margin: 0 18px; }
.wm-light .wm-divider { background: #EDE8E0; }
.wm-dark .wm-divider { background: #3D3630; }

.wm-definitions { padding: 10px 18px 12px; }
.wm-definition { margin: 0 0 3px; font-size: 13px; line-height: 1.6; }
.wm-light .wm-definition { color: #2C2418; }
.wm-dark .wm-definition { color: #EDE8E0; }
.wm-pos { font-weight: 500; color: #C87B4A; margin-right: 5px; }
.wm-meaning-zh { font-size: 12px; margin: 2px 0 6px 0; padding-left: 2px; }
.wm-light .wm-meaning-zh { color: #8C7E6E; }
.wm-dark .wm-meaning-zh { color: #9A8B7A; }
.wm-source-row { display: flex; flex-wrap: wrap; gap: 4px; margin: 2px 0 8px; }
.wm-source-pill { font-size: 10px; line-height: 1.2; border-radius: 999px; padding: 2px 6px; border: 1px solid; }
.wm-light .wm-source-pill { color: #8C7E6E; border-color: #EDE8E0; background: #F9F6F1; }
.wm-dark .wm-source-pill { color: #9A8B7A; border-color: #3D3630; background: #1C1A17; }

.wm-context { padding: 10px 18px; }
.wm-context-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 5px; font-weight: 500; }
.wm-light .wm-context-label { color: #B8A898; }
.wm-dark .wm-context-label { color: #7D6F60; }
.wm-context-text { font-size: 13px; line-height: 1.6; margin: 0; border-radius: 8px; padding: 8px 10px; }
.wm-light .wm-context-text { color: #7D6F60; background: #F9F6F1; }
.wm-dark .wm-context-text { color: #B8A898; background: #1C1A17; }
.wm-context-text mark { font-weight: 600; padding: 1px 3px; border-radius: 3px; }
.wm-light .wm-context-text mark { background: #F2D9BF; color: #7A452E; }
.wm-dark .wm-context-text mark { background: #5A3E28; color: #F2D9BF; }

.wm-footer { padding: 12px 18px 16px; display: flex; gap: 8px; }
.wm-save-btn {
  flex: 1; background: #C87B4A; color: #FFF; border: none; border-radius: 10px;
  padding: 9px 16px; font-size: 13px; font-weight: 600; cursor: pointer;
  transition: background 0.15s, transform 0.1s; font-family: inherit;
}
.wm-save-btn:hover { background: #B5693D; }
.wm-save-btn:active { transform: scale(0.98); }
.wm-save-btn.wm-saved { background: #3D8B5F; cursor: default; }
.wm-save-btn:disabled { background: #D4C7B5; cursor: not-allowed; }
.wm-dark .wm-save-btn:disabled { background: #4D453D; }
.wm-regenerate-btn {
  flex: 0 0 auto; border: 1px solid; border-radius: 10px; background: transparent;
  padding: 9px 10px; font-size: 12px; font-weight: 600; cursor: pointer;
  transition: background 0.15s, border-color 0.15s; font-family: inherit;
}
.wm-light .wm-regenerate-btn { color: #B5693D; border-color: #E8D7C6; }
.wm-light .wm-regenerate-btn:hover { background: #F9F1E8; border-color: #D9996A; }
.wm-dark .wm-regenerate-btn { color: #D9996A; border-color: #5A4E42; }
.wm-dark .wm-regenerate-btn:hover { background: #3D3630; border-color: #C87B4A; }
.wm-regenerate-btn:disabled { opacity: 0.6; cursor: wait; }

.wm-loading { padding: 28px 18px; text-align: center; font-size: 13px; }
.wm-light .wm-loading { color: #B8A898; }
.wm-dark .wm-loading { color: #7D6F60; }
.wm-loading-spinner {
  display: inline-block; width: 20px; height: 20px;
  border: 2px solid; border-top-color: #C87B4A;
  border-radius: 50%; animation: wm-spin 0.6s linear infinite; margin-bottom: 8px;
}
.wm-light .wm-loading-spinner { border-color: #EDE8E0; border-top-color: #C87B4A; }
.wm-dark .wm-loading-spinner { border-color: #3D3630; border-top-color: #C87B4A; }
@keyframes wm-spin { to { transform: rotate(360deg); } }

.wm-error { padding: 24px 18px; text-align: center; font-size: 13px; }
.wm-light .wm-error { color: #B8A898; }
.wm-dark .wm-error { color: #7D6F60; }

@keyframes wm-check-draw {
  0% { stroke-dashoffset: 20; }
  100% { stroke-dashoffset: 0; }
}

.wm-bubble :focus-visible {
  outline: 2px solid #C87B4A;
  outline-offset: 2px;
}
`;

// ---------- Helpers ----------

function isEditableElement(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return el.closest('[contenteditable="true"], input, textarea, select') !== null;
}

function isValidWord(text: string): boolean {
  const cleaned = cleanSelection(text);
  if (!cleaned || cleaned.length < 2 || cleaned.length > 40) return false;
  if (!/^[a-zA-Z]+(?:[-'][a-zA-Z]+)*$/.test(cleaned)) return false;
  if (cleaned.length <= 3 && cleaned === cleaned.toUpperCase()) return false;
  return true;
}

function positionBubble(bubble: HTMLDivElement, rect: DOMRect) {
  const padding = 8;
  const bubbleWidth = 340;
  const bubbleHeight = 300;

  let left = rect.left + rect.width / 2 - bubbleWidth / 2;
  let top = rect.bottom + padding;

  if (left < padding) left = padding;
  if (left + bubbleWidth > window.innerWidth - padding) left = window.innerWidth - bubbleWidth - padding;
  if (top + bubbleHeight > window.innerHeight - padding) top = rect.top - bubbleHeight - padding;
  if (top < padding) top = padding;

  bubble.style.left = `${left}px`;
  bubble.style.top = `${top}px`;
}

function closeBubble() {
  if (!bubbleEl || !isShowing) return;
  isShowing = false;
  bubbleEl.classList.add('wm-closing');
  setTimeout(() => {
    if (bubbleEl && shadowRoot) {
      bubbleEl.remove();
      bubbleEl = null;
    }
  }, 150);
}

function themeClass(): string {
  return isDarkMode() ? 'wm-dark' : 'wm-light';
}

function applyBubbleTheme() {
  if (!bubbleEl) return;
  bubbleEl.classList.remove('wm-light', 'wm-dark');
  bubbleEl.classList.add(themeClass());
}

function applyBubbleLanguage() {
  if (!bubbleEl) return;
  const contextLabel = bubbleEl.querySelector<HTMLElement>('.wm-context-label');
  if (contextLabel) contextLabel.textContent = label('context');

  const regenerateBtn = bubbleEl.querySelector<HTMLButtonElement>('.wm-regenerate-btn');
  if (regenerateBtn && !regenerateBtn.disabled) {
    regenerateBtn.textContent = label('useAi');
  }

  const saveBtn = bubbleEl.querySelector<HTMLButtonElement>('.wm-save-btn');
  if (saveBtn && !saveBtn.disabled && !saveBtn.classList.contains('wm-saved')) {
    saveBtn.textContent = label('save');
  }
}

const CONTENT_LABELS = {
  en: {
    context: 'Context',
    useAi: 'Use AI to optimize',
    loading: 'Loading...',
    improving: 'Improving...',
    checkAiSettings: 'Check AI settings',
    save: '+ Save to WordMark',
    saving: 'Saving...',
    saved: 'Saved!',
    alreadySaved: 'Already saved',
    saveFailed: 'Save failed, try again',
    failedLookup: 'Failed to look up word',
    noDefinition: 'No definition found for "{word}"',
    definition: 'Definition',
    translation: 'Translation',
    localDictionary: 'Local dictionary',
    freeTranslation: 'Free translation',
    ai: 'AI',
  },
  zh: {
    context: '上下文',
    useAi: '使用 AI 优化',
    loading: '加载中...',
    improving: '正在优化...',
    checkAiSettings: '检查 AI 设置',
    save: '+ 保存到 WordMark',
    saving: '正在保存...',
    saved: '已保存',
    alreadySaved: '已保存过',
    saveFailed: '保存失败，请重试',
    failedLookup: '查词失败',
    noDefinition: '没有找到 “{word}” 的释义',
    definition: '释义',
    translation: '翻译',
    localDictionary: '本地词典',
    freeTranslation: '免费翻译',
    ai: 'AI',
  },
} as const;

function label(key: keyof typeof CONTENT_LABELS.en): string {
  return CONTENT_LABELS[contentLanguage]?.[key] || CONTENT_LABELS.en[key];
}

async function syncContentSettings() {
  try {
    const settingsRes = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    const settings = settingsRes?.settings as Settings | undefined;
    contentDarkMode = settings?.darkMode || 'system';
    contentLanguage = settings?.language || 'zh';
    applyBubbleTheme();
    applyBubbleLanguage();
  } catch {
    contentDarkMode = 'system';
    contentLanguage = 'zh';
  }
}

function definitionSourceLabel(source: string | undefined): string {
  if (source === 'ai') return label('ai');
  if (source === 'free-translation') return label('freeTranslation');
  return label('localDictionary');
}

function definitionSourceHtml(def: DictionaryResult['definitions'][number]): string {
  const source = def.source || 'dictionary';
  const labels = [`${label('definition')}: ${definitionSourceLabel(source)}`];
  if (def.meaningZh) {
    const translationSource = def.translationSource || (source === 'ai' ? 'ai' : 'free-translation');
    labels.push(`${label('translation')}: ${definitionSourceLabel(translationSource)}`);
  }
  return `<div class="wm-source-row">${labels.map((label) => `<span class="wm-source-pill">${esc(label)}</span>`).join('')}</div>`;
}

// Sanitize text for safe HTML insertion
function esc(text: string): string {
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function speakFallback(word: string) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang === 'en-US' && (v.name.includes('Premium') || v.name.includes('Enhanced') || v.name.includes('Natural')))
      || voices.find(v => v.lang === 'en-US')
      || voices.find(v => v.lang.startsWith('en'));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  }
}

function highlightInSentence(sentence: string, word: string): string {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return esc(sentence).replace(regex, '<mark>$1</mark>');
}

// ---------- Saved Word Highlights ----------

function ensureHighlightStyle() {
  if (highlightStyle) return;
  highlightStyle = document.createElement('style');
  highlightStyle.id = 'wordmark-highlight-style';
  highlightStyle.textContent = `
    mark.wordmark-saved-highlight {
      background: rgba(200, 123, 74, 0.22) !important;
      color: inherit !important;
      border-radius: 3px !important;
      padding: 0 2px !important;
      box-shadow: inset 0 -1px 0 rgba(200, 123, 74, 0.55) !important;
    }
  `;
  document.documentElement.appendChild(highlightStyle);
}

function removeSavedHighlights() {
  document.querySelectorAll('mark.wordmark-saved-highlight').forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
    parent.normalize();
  });
}

function shouldSkipHighlightNode(node: Text): boolean {
  const parent = node.parentElement;
  if (!parent || !node.nodeValue?.trim()) return true;
  const tag = parent.tagName;
  if (['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'CODE', 'PRE'].includes(tag)) return true;
  if (parent.closest('#wordmark-root, mark.wordmark-saved-highlight, [contenteditable="true"]')) return true;
  return false;
}

function buildSavedWordRegex(words: string[]): RegExp | null {
  const unique = Array.from(new Set(words.map((w) => lemmatize(w)).filter((w) => /^[a-z]+(?:[-'][a-z]+)*$/.test(w))));
  if (unique.length === 0) return null;
  unique.sort((a, b) => b.length - a.length);
  const pattern = unique.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  return new RegExp(`\\b(${pattern})\\b`, 'gi');
}

function highlightSavedWords(words: VocabWord[]) {
  removeSavedHighlights();
  const regex = buildSavedWordRegex(words.map((w) => w.word));
  if (!regex) return;
  ensureHighlightStyle();

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      return shouldSkipHighlightNode(node as Text)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current && nodes.length < 500) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }

  for (const node of nodes) {
    const text = node.nodeValue || '';
    regex.lastIndex = 0;
    if (!regex.test(text)) continue;

    regex.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    for (const match of text.matchAll(regex)) {
      const index = match.index ?? 0;
      if (index > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, index)));
      }
      const mark = document.createElement('mark');
      mark.className = 'wordmark-saved-highlight';
      mark.textContent = match[0];
      fragment.appendChild(mark);
      lastIndex = index + match[0].length;
    }
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    node.parentNode?.replaceChild(fragment, node);
  }
}

async function refreshSavedHighlights() {
  try {
    const settingsRes = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    const settings = settingsRes?.settings as Settings | undefined;
    contentDarkMode = settings?.darkMode || 'system';
    contentLanguage = settings?.language || 'zh';
    applyBubbleTheme();
    applyBubbleLanguage();
    if (!settings?.highlightSavedWords) {
      removeSavedHighlights();
      return;
    }

    const wordsRes = await chrome.runtime.sendMessage({ type: 'GET_ALL_WORDS' });
    highlightSavedWords(wordsRes?.words || []);
  } catch {
    // Content scripts should not break page interaction if the extension context is unavailable.
  }
}

function scheduleHighlightRefresh() {
  if (highlightRefreshTimer) clearTimeout(highlightRefreshTimer);
  highlightRefreshTimer = setTimeout(refreshSavedHighlights, 250);
}

// ---------- UI States ----------

function showLoading(rect: DOMRect) {
  ensureShadowHost();
  if (!shadowRoot) return;
  closeBubble();

  bubbleEl = document.createElement('div');
  bubbleEl.className = `wm-bubble ${themeClass()}`;
  bubbleEl.innerHTML = `
    <div class="wm-loading">
      <div class="wm-loading-spinner"></div>
      <div>${esc(label('loading'))}</div>
    </div>
  `;
  positionBubble(bubbleEl, rect);
  shadowRoot.appendChild(bubbleEl);
  isShowing = true;
}

function showError(rect: DOMRect, message: string) {
  ensureShadowHost();
  if (!shadowRoot) return;
  if (bubbleEl) bubbleEl.remove();

  bubbleEl = document.createElement('div');
  bubbleEl.className = `wm-bubble ${themeClass()}`;
  const errorDiv = document.createElement('div');
  errorDiv.className = 'wm-error';
  errorDiv.textContent = message;
  bubbleEl.appendChild(errorDiv);
  positionBubble(bubbleEl, rect);
  shadowRoot.appendChild(bubbleEl);
  isShowing = true;
  setTimeout(closeBubble, 2000);
}

// ---------- Main Bubble ----------

function showBubble(
  rect: DOMRect,
  data: DictionaryResult,
  contextSentence: string,
  originalForm: string
) {
  ensureShadowHost();
  if (!shadowRoot) return;
  if (bubbleEl) bubbleEl.remove();

  const defsHtml = data.definitions
    .map(d =>
      `<p class="wm-definition"><span class="wm-pos">${esc(d.partOfSpeech)}.</span> ${esc(d.meaning)}</p>${d.meaningZh ? `<p class="wm-meaning-zh">${esc(d.meaningZh)}</p>` : ''}${definitionSourceHtml(d)}`
    )
    .join('');

  const contextHtml = contextSentence ? highlightInSentence(contextSentence, originalForm) : '';

  bubbleEl = document.createElement('div');
  bubbleEl.className = `wm-bubble ${themeClass()}`;
  bubbleEl.setAttribute('role', 'dialog');
  bubbleEl.setAttribute('aria-label', `Definition of ${data.word}`);
  bubbleEl.innerHTML = `
    <div class="wm-header">
      <div class="wm-word-section">
        <h3 class="wm-word">${esc(data.word)}</h3>
        <div class="wm-phonetic-row">
          ${data.phonetic ? `<span class="wm-phonetic">${esc(data.phonetic)}</span>` : ''}
          <button class="wm-audio-btn" data-action="pronounce" aria-label="Pronounce ${esc(data.word)}" tabindex="0"><svg viewBox="0 0 24 24"><path d="M11.383 3.07C11.009 2.893 10.579 2.91 10.224 3.114L4.839 6.5H2.5A1.5 1.5 0 001 8v8a1.5 1.5 0 001.5 1.5h2.339l5.385 3.386A1 1 0 0011.75 20V4a1 1 0 00-.367-.93zM14.5 7.5a.75.75 0 011.06 0 5.5 5.5 0 010 7.778.75.75 0 11-1.06-1.06 4 4 0 000-5.658.75.75 0 010-1.06z"/></svg></button>
        </div>
      </div>
      <button class="wm-close-btn" data-action="close" aria-label="Close" tabindex="0"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
    </div>
    ${defsHtml ? `<div class="wm-divider"></div><div class="wm-definitions">${defsHtml}</div>` : ''}
    ${contextHtml ? `
      <div class="wm-divider"></div>
      <div class="wm-context">
        <div class="wm-context-label">${esc(label('context'))}</div>
        <p class="wm-context-text">"${contextHtml}"</p>
      </div>
    ` : ''}
    <div class="wm-divider"></div>
    <div class="wm-footer">
      <button class="wm-regenerate-btn" data-action="regenerate" tabindex="0">${esc(label('useAi'))}</button>
      <button class="wm-save-btn" data-action="save" tabindex="0">${esc(label('save'))}</button>
    </div>
  `;

  positionBubble(bubbleEl, rect);
  shadowRoot.appendChild(bubbleEl);
  isShowing = true;

  // Focus first button for keyboard nav
  const firstBtn = bubbleEl.querySelector<HTMLButtonElement>('[data-action="pronounce"]');
  firstBtn?.focus();

  // Event handlers
  bubbleEl.addEventListener('click', async (e) => {
    const target = (e.target as HTMLElement).closest('[data-action]') as HTMLElement;
    if (!target) return;
    const action = target.dataset.action;

    if (action === 'close') closeBubble();

    if (action === 'pronounce') {
      chrome.runtime.sendMessage(
        { type: 'GET_TTS_AUDIO', word: data.word, accent: 'us' }
      ).then((res) => {
        if (res?.dataUrl) {
          new Audio(res.dataUrl).play().catch(() => speakFallback(data.word));
        } else if (data.audioUrl) {
          new Audio(data.audioUrl).play().catch(() => speakFallback(data.word));
        } else {
          speakFallback(data.word);
        }
      }).catch(() => speakFallback(data.word));
    }

    if (action === 'regenerate') {
      const regenerateBtn = target as HTMLButtonElement;
      regenerateBtn.disabled = true;
      regenerateBtn.textContent = label('improving');
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'REGENERATE_DEFINITION',
          word: data.word,
          contextSentence,
          pageTitle: document.title,
          dictionaryResult: data,
        });
        if (response?.data) {
          showBubble(rect, response.data, contextSentence, originalForm);
        } else {
          regenerateBtn.disabled = false;
          regenerateBtn.textContent = label('checkAiSettings');
        }
      } catch {
        regenerateBtn.disabled = false;
        regenerateBtn.textContent = label('checkAiSettings');
      }
    }

    if (action === 'save') {
      const saveBtn = target as HTMLButtonElement;
      if (saveBtn.classList.contains('wm-saved')) return;
      saveBtn.disabled = true;
      saveBtn.textContent = label('saving');

      const word: VocabWord = {
        id: crypto.randomUUID(),
        word: data.word,
        originalForm,
        phonetic: data.phonetic || '',
        phoneticUK: data.phoneticUK,
        audioUrl: data.audioUrl,
        audioUrlUK: data.audioUrlUK,
        definitions: data.definitions,
        context: {
          sentence: contextSentence,
          pageTitle: document.title,
          pageUrl: window.location.href,
        },
        tags: [],
        mastered: false,
        createdAt: new Date().toISOString(),
        sr: getInitialSR(),
      };

      try {
        const response = await chrome.runtime.sendMessage({ type: 'SAVE_WORD', word });
        if (response.success) {
          saveBtn.classList.add('wm-saved');
          saveBtn.innerHTML = `
            <svg style="width:16px;height:16px;vertical-align:middle;margin-right:4px;" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 13l4 4L19 7" style="stroke-dasharray:20;animation:wm-check-draw 0.3s ease-out forwards;"/>
            </svg>
            ${response.duplicate ? esc(label('alreadySaved')) : esc(label('saved'))}
          `;
          scheduleHighlightRefresh();
          setTimeout(closeBubble, 1200);
        } else {
          saveBtn.disabled = false;
          saveBtn.textContent = label('saveFailed');
        }
      } catch {
        saveBtn.disabled = false;
        saveBtn.textContent = label('saveFailed');
      }
    }
  });

  // Keyboard: Tab trap within bubble
  bubbleEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeBubble(); return; }
    if (e.key !== 'Tab') return;
    const focusable = bubbleEl!.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]');
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });
}

// ---------- Event Listeners ----------

function onDblClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (isEditableElement(target)) return;
  if (target.closest('#wordmark-root')) return;

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;

  const text = selection.toString().trim();
  if (!isValidWord(text)) return;

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const contextSentence = extractSentence(text, selection.anchorNode);
  handleWordLookup(text, rect, contextSentence);
}

let selectionTimeout: ReturnType<typeof setTimeout> | null = null;

function onMouseUp(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (isEditableElement(target)) return;
  if (target.closest('#wordmark-root')) return;
  if (shadowRoot && e.composedPath().some((el) => el === shadowHost)) return;

  if (selectionTimeout) clearTimeout(selectionTimeout);

  selectionTimeout = setTimeout(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    const wordCount = text.split(/\s+/).length;
    if (wordCount < 2 || wordCount > 3) return;
    if (!text || text.length > 60) return;
    if (!/^[a-zA-Z\s'-]+$/.test(text)) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const contextSentence = extractSentence(text, selection.anchorNode);
    handleWordLookup(text, rect, contextSentence);
  }, 300);
}

function onMouseDown(e: MouseEvent) {
  if (!isShowing) return;
  const path = e.composedPath();
  if (bubbleEl && path.includes(bubbleEl)) return;
  closeBubble();
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && isShowing) closeBubble();
}

// Attach listeners
wordmarkWindow.__wordmarkCleanupContentScript?.();
document.addEventListener('dblclick', onDblClick);
document.addEventListener('mouseup', onMouseUp);
document.addEventListener('mousedown', onMouseDown);
document.addEventListener('keydown', onKeyDown);
systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
onSystemThemeChange = () => {
  if (contentDarkMode === 'system') applyBubbleTheme();
};
systemThemeQuery.addEventListener?.('change', onSystemThemeChange);
syncContentSettings();
scheduleHighlightRefresh();

const onStorageChanged = (
  changes: { [key: string]: chrome.storage.StorageChange },
  areaName: string
) => {
  if (areaName === 'local' && (changes.wordmark_words || changes.wordmark_settings)) {
    const nextSettings = changes.wordmark_settings?.newValue as Settings | undefined;
    if (nextSettings) {
      contentDarkMode = nextSettings.darkMode;
      contentLanguage = nextSettings.language;
      applyBubbleTheme();
      applyBubbleLanguage();
    } else if (changes.wordmark_settings) {
      syncContentSettings();
    }
    scheduleHighlightRefresh();
  }
};
chrome.storage?.onChanged?.addListener(onStorageChanged);

function cleanupContentScript() {
  document.removeEventListener('dblclick', onDblClick);
  document.removeEventListener('mouseup', onMouseUp);
  document.removeEventListener('mousedown', onMouseDown);
  document.removeEventListener('keydown', onKeyDown);
  if (systemThemeQuery && onSystemThemeChange) {
    systemThemeQuery.removeEventListener?.('change', onSystemThemeChange);
  }
  chrome.storage?.onChanged?.removeListener(onStorageChanged);
  if (selectionTimeout) clearTimeout(selectionTimeout);
  if (highlightRefreshTimer) clearTimeout(highlightRefreshTimer);
  if (shadowHost) { shadowHost.remove(); shadowHost = null; shadowRoot = null; }
  if (highlightStyle) { highlightStyle.remove(); highlightStyle = null; }
}

wordmarkWindow.__wordmarkCleanupContentScript = cleanupContentScript;
window.addEventListener('pagehide', cleanupContentScript, { once: true });

// ---------- Core Logic ----------

async function handleWordLookup(text: string, rect: DOMRect, contextSentence: string) {
  const cleaned = cleanSelection(text);
  if (!cleaned) return;

  showLoading(rect);

  try {
    const response = await chrome.runtime.sendMessage({
      type: 'LOOKUP_WORD',
      word: cleaned,
      contextSentence,
      pageTitle: document.title,
    });
    if (response?.data) {
      showBubble(rect, response.data, contextSentence, cleaned);
    } else {
      showError(rect, label('noDefinition').replace('{word}', cleaned));
    }
  } catch {
    showError(rect, label('failedLookup'));
  }
}
