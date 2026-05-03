// Basic English word lemmatizer
// Handles common suffixes to get base forms

const irregularVerbs: Record<string, string> = {
  was: 'be', were: 'be', been: 'be', being: 'be', am: 'be', is: 'be', are: 'be',
  had: 'have', has: 'have', having: 'have',
  did: 'do', does: 'do', doing: 'do', done: 'do',
  went: 'go', gone: 'go', goes: 'go', going: 'go',
  said: 'say', says: 'say', saying: 'say',
  got: 'get', gets: 'get', getting: 'get', gotten: 'get',
  made: 'make', makes: 'make', making: 'make',
  came: 'come', comes: 'come', coming: 'come',
  took: 'take', takes: 'take', taking: 'take', taken: 'take',
  knew: 'know', knows: 'know', knowing: 'know', known: 'know',
  thought: 'think', thinks: 'think', thinking: 'think',
  gave: 'give', gives: 'give', giving: 'give', given: 'give',
  found: 'find', finds: 'find', finding: 'find',
  told: 'tell', tells: 'tell', telling: 'tell',
  felt: 'feel', feels: 'feel', feeling: 'feel',
  became: 'become', becomes: 'become', becoming: 'become',
  left: 'leave', leaves: 'leave', leaving: 'leave',
  brought: 'bring', brings: 'bring', bringing: 'bring',
  began: 'begin', begins: 'begin', beginning: 'begin', begun: 'begin',
  wrote: 'write', writes: 'write', writing: 'write', written: 'write',
  ran: 'run', runs: 'run', running: 'run',
  kept: 'keep', keeps: 'keep', keeping: 'keep',
  held: 'hold', holds: 'hold', holding: 'hold',
  stood: 'stand', stands: 'stand', standing: 'stand',
  heard: 'hear', hears: 'hear', hearing: 'hear',
  let: 'let', lets: 'let', letting: 'let',
  meant: 'mean', means: 'mean', meaning: 'mean',
  set: 'set', sets: 'set', setting: 'set',
  met: 'meet', meets: 'meet', meeting: 'meet',
  paid: 'pay', pays: 'pay', paying: 'pay',
  sat: 'sit', sits: 'sit', sitting: 'sit',
  spoke: 'speak', speaks: 'speak', speaking: 'speak', spoken: 'speak',
  led: 'lead', leads: 'lead', leading: 'lead',
  grew: 'grow', grows: 'grow', growing: 'grow', grown: 'grow',
  lost: 'lose', loses: 'lose', losing: 'lose',
  fell: 'fall', falls: 'fall', falling: 'fall', fallen: 'fall',
  sent: 'send', sends: 'send', sending: 'send',
  built: 'build', builds: 'build', building: 'build',
  spent: 'spend', spends: 'spend', spending: 'spend',
  caught: 'catch', catches: 'catch', catching: 'catch',
  broke: 'break', breaks: 'break', breaking: 'break', broken: 'break',
  drove: 'drive', drives: 'drive', driving: 'drive', driven: 'drive',
  bought: 'buy', buys: 'buy', buying: 'buy',
  wore: 'wear', wears: 'wear', wearing: 'wear', worn: 'wear',
  chose: 'choose', chooses: 'choose', choosing: 'choose', chosen: 'choose',
  sang: 'sing', sings: 'sing', singing: 'sing', sung: 'sing',
  swam: 'swim', swims: 'swim', swimming: 'swim', swum: 'swim',
  drew: 'draw', draws: 'draw', drawing: 'draw', drawn: 'draw',
  threw: 'throw', throws: 'throw', throwing: 'throw', thrown: 'throw',
  flew: 'fly', flies: 'fly', flying: 'fly', flown: 'fly',
  ate: 'eat', eats: 'eat', eating: 'eat', eaten: 'eat',
  drank: 'drink', drinks: 'drink', drinking: 'drink', drunk: 'drink',
  slept: 'sleep', sleeps: 'sleep', sleeping: 'sleep',
  woke: 'wake', wakes: 'wake', waking: 'wake', woken: 'wake',
  taught: 'teach', teaches: 'teach', teaching: 'teach',
  sold: 'sell', sells: 'sell', selling: 'sell',
  read: 'read', reads: 'read', reading: 'read',
  hung: 'hang', hangs: 'hang', hanging: 'hang',
  won: 'win', wins: 'win', winning: 'win',
  lay: 'lie', lies: 'lie', lying: 'lie', lain: 'lie',
  laid: 'lay', lays: 'lay', laying: 'lay',
  hit: 'hit', hits: 'hit', hitting: 'hit',
  cut: 'cut', cuts: 'cut', cutting: 'cut',
  put: 'put', puts: 'put', putting: 'put',
  shut: 'shut', shuts: 'shut', shutting: 'shut',
  hurt: 'hurt', hurts: 'hurt', hurting: 'hurt',
  cost: 'cost', costs: 'cost', costing: 'cost',
  spread: 'spread', spreads: 'spread', spreading: 'spread',
  quit: 'quit', quits: 'quit', quitting: 'quit',
};

const irregularPlurals: Record<string, string> = {
  men: 'man', women: 'woman', children: 'child', teeth: 'tooth',
  feet: 'foot', mice: 'mouse', geese: 'goose', oxen: 'ox',
  people: 'person', dice: 'die', lives: 'life', knives: 'knife',
  wives: 'wife', halves: 'half', wolves: 'wolf', leaves: 'leaf',
  loaves: 'loaf', thieves: 'thief', shelves: 'shelf',
  criteria: 'criterion', phenomena: 'phenomenon', analyses: 'analysis',
  theses: 'thesis', hypotheses: 'hypothesis', crises: 'crisis',
  indices: 'index', appendices: 'appendix', matrices: 'matrix',
};

export function lemmatize(word: string): string {
  return getLookupCandidates(word)[0] || '';
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function isVowel(char: string): boolean {
  return 'aeiou'.includes(char);
}

function isConsonant(char: string): boolean {
  return /^[a-z]$/.test(char) && !isVowel(char);
}

function likelyDroppedSilentE(stem: string): boolean {
  if (stem.length < 3) return false;
  const last = stem[stem.length - 1];
  const prev = stem[stem.length - 2];
  const beforePrev = stem[stem.length - 3];

  // making -> make, coding -> code, driving -> drive, using -> use.
  // Avoid broad "always add e" behavior that produced learne/worke/intereste.
  return isConsonant(last) &&
    !['w', 'x', 'y'].includes(last) &&
    isVowel(prev) &&
    isConsonant(beforePrev);
}

function addCandidate(candidates: string[], value: string) {
  if (value && !candidates.includes(value)) candidates.push(value);
}

export function getLookupCandidates(word: string): string[] {
  const lower = cleanSelection(word).toLowerCase().trim();

  if (lower.length <= 2) return lower ? [lower] : [];

  const candidates: string[] = [];

  // Check irregular forms
  if (irregularVerbs[lower]) addCandidate(candidates, irregularVerbs[lower]);
  if (irregularPlurals[lower]) addCandidate(candidates, irregularPlurals[lower]);

  // -ing forms
  if (lower.endsWith('ing')) {
    if (lower.length > 5 && lower[lower.length - 4] === lower[lower.length - 5]) {
      // running -> run (double consonant)
      addCandidate(candidates, lower.slice(0, -4));
    }
    const withoutIng = lower.slice(0, -3);
    if (withoutIng.length >= 2) {
      if (likelyDroppedSilentE(withoutIng)) addCandidate(candidates, withoutIng + 'e');
      addCandidate(candidates, withoutIng);
    } else {
      addCandidate(candidates, withoutIng);
    }
  }

  // -ed forms
  if (lower.endsWith('ed') && lower.length > 4) {
    if (lower.endsWith('ied')) {
      addCandidate(candidates, lower.slice(0, -3) + 'y'); // carried -> carry
    } else if (lower[lower.length - 3] === lower[lower.length - 4]) {
      addCandidate(candidates, lower.slice(0, -3)); // stopped -> stop
    } else {
      const withoutEd = lower.slice(0, -2);
      if (likelyDroppedSilentE(withoutEd)) addCandidate(candidates, withoutEd + 'e');
      addCandidate(candidates, withoutEd);
    }
  }

  // -er, -est comparative/superlative
  if (lower.endsWith('er') && lower.length > 4) {
    if (lower.endsWith('ier')) addCandidate(candidates, lower.slice(0, -3) + 'y');
    if (lower[lower.length - 3] === lower[lower.length - 4]) addCandidate(candidates, lower.slice(0, -3));
    addCandidate(candidates, lower.slice(0, -2));
  }
  if (lower.endsWith('est') && lower.length > 5) {
    if (lower.endsWith('iest')) addCandidate(candidates, lower.slice(0, -4) + 'y');
    if (lower[lower.length - 4] === lower[lower.length - 5]) addCandidate(candidates, lower.slice(0, -4));
    addCandidate(candidates, lower.slice(0, -3));
  }

  // -s / -es plural/verb forms
  if (lower.endsWith('ies') && lower.length > 4) {
    addCandidate(candidates, lower.slice(0, -3) + 'y'); // cities -> city
  }
  if (lower.endsWith('ses') || lower.endsWith('xes') || lower.endsWith('zes') ||
      lower.endsWith('ches') || lower.endsWith('shes')) {
    addCandidate(candidates, lower.slice(0, -2)); // boxes -> box
  }
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 3) {
    addCandidate(candidates, lower.slice(0, -1));
  }

  // -ly adverbs
  if (lower.endsWith('ly') && lower.length > 4) {
    if (lower.endsWith('ily')) addCandidate(candidates, lower.slice(0, -3) + 'y'); // happily -> happy
    addCandidate(candidates, lower.slice(0, -2)); // quickly -> quick
  }

  addCandidate(candidates, lower);
  return unique(candidates);
}

export function cleanSelection(text: string): string {
  // Strip surrounding punctuation and whitespace
  return text.replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, '').trim();
}
