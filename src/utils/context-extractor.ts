// Extract the sentence containing a word from page text
export function extractSentence(word: string, anchorNode: Node | null): string {
  if (!anchorNode) return '';

  // Get text content from the parent element
  const parent = anchorNode.nodeType === Node.TEXT_NODE
    ? anchorNode.parentElement
    : anchorNode as HTMLElement;

  if (!parent) return '';

  // Walk up to find a block-level container
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

  // Split text into sentences
  const sentences = text.split(/(?<=[.!?])\s+/);
  const lowerWord = word.toLowerCase();

  for (const sentence of sentences) {
    if (sentence.toLowerCase().includes(lowerWord)) {
      // Clean up the sentence
      const cleaned = sentence.replace(/\s+/g, ' ').trim();
      if (cleaned.length > 200) {
        // If sentence is too long, extract a window around the word
        const idx = cleaned.toLowerCase().indexOf(lowerWord);
        const start = Math.max(0, idx - 80);
        const end = Math.min(cleaned.length, idx + word.length + 80);
        return (start > 0 ? '...' : '') +
          cleaned.slice(start, end).trim() +
          (end < cleaned.length ? '...' : '');
      }
      return cleaned;
    }
  }

  // Fallback: return the container text trimmed
  const trimmed = text.replace(/\s+/g, ' ').trim();
  return trimmed.length > 200 ? trimmed.slice(0, 197) + '...' : trimmed;
}
