const POS_MAP: Record<string, string> = {
  noun: 'n.',
  verb: 'v.',
  adjective: 'adj.',
  adverb: 'adv.',
  pronoun: 'pron.',
  preposition: 'prep.',
  conjunction: 'conj.',
  interjection: 'interj.',
  determiner: 'det.',
  article: 'art.',
  auxiliary: 'aux.',
  numeral: 'num.',
  particle: 'part.',
  abbreviation: 'abbr.',
};

export function posAbbr(input: string): string {
  if (!input) return '';
  const key = input.trim().toLowerCase().replace(/\.$/, '');
  if (POS_MAP[key]) return POS_MAP[key];
  if (key.length <= 6 && !key.endsWith('.')) return `${key}.`;
  return key;
}
