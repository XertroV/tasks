export interface ZalgoOptions {
  intensity: number;
  maxStack?: number;
  seed?: number;
}

export interface ReplaceWordsOptions {
  intensity: number;
  minLength?: number;
}

const ZALGO_UP = [
  '\u030D',
  '\u030E',
  '\u0304',
  '\u0305',
  '\u033F',
  '\u0311',
  '\u0306',
  '\u0310',
  '\u0352',
  '\u0357',
  '\u0351',
  '\u0307',
  '\u0308',
  '\u030A',
  '\u0342',
  '\u0343',
  '\u0344',
  '\u034A',
  '\u034B',
  '\u034C',
  '\u0303',
];
const ZALGO_DOWN = [
  '\u0316',
  '\u0317',
  '\u0318',
  '\u0319',
  '\u031C',
  '\u031D',
  '\u031E',
  '\u031F',
  '\u0320',
  '\u0324',
  '\u0325',
  '\u0326',
  '\u0329',
  '\u032A',
  '\u032B',
  '\u032C',
  '\u032D',
  '\u032E',
  '\u032F',
  '\u0330',
  '\u0331',
  '\u0332',
  '\u0333',
  '\u0339',
  '\u033A',
  '\u033B',
  '\u033C',
  '\u033D',
  '\u033E',
  '\u0340',
  '\u0341',
  '\u0343',
  '\u0345',
  '\u0347',
  '\u0348',
  '\u0349',
  '\u034A',
  '\u034B',
  '\u034C',
  '\u0353',
  '\u0354',
  '\u0355',
  '\u0356',
  '\u0359',
  '\u035A',
  '\u035B',
  '\u035C',
  '\u035D',
  '\u035E',
  '\u035F',
  '\u0360',
  '\u0361',
  '\u0362',
];
const ZALGO_MID = [
  '\u0315',
  '\u031B',
  '\u0340',
  '\u0341',
  '\u0343',
  '\u0344',
  '\u0345',
  '\u0346',
  '\u034A',
  '\u034B',
  '\u034C',
  '\u0353',
  '\u0354',
  '\u0355',
  '\u0356',
  '\u0357',
  '\u0358',
  '\u035C',
  '\u035D',
  '\u035E',
  '\u035F',
  '\u0360',
  '\u0361',
  '\u0362',
];

function seededRandom(initialSeed: number): () => number {
  let seed = initialSeed;
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

export function addZalgo(text: string, options: ZalgoOptions): string {
  const { intensity, maxStack = 10, seed = Date.now() } = options;

  if (intensity <= 0) return text;

  const random = seededRandom(seed);
  const result: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    result.push(char);

    if (char === ' ' || char === '\n' || char === '\t') continue;

    const zalgoCount = Math.floor(intensity * maxStack * random());

    for (let j = 0; j < zalgoCount; j++) {
      const category = Math.floor(random() * 3);
      let zalgoArray: string[];

      if (category === 0) zalgoArray = ZALGO_UP;
      else if (category === 1) zalgoArray = ZALGO_DOWN;
      else zalgoArray = ZALGO_MID;

      const idx = Math.floor(random() * zalgoArray.length);
      result.push(zalgoArray[idx]);
    }
  }

  return result.join('');
}

const HORROR_WORD_REPLACEMENTS: Record<string, string[]> = {
  something: ['nothing', 'everything', 'someone'],
  someone: ['no one', 'something', 'everyone'],
  watching: ['staring', 'waiting', 'lurking'],
  looking: ['hunting', 'seeking', 'finding'],
  watch: ['stare', 'wait', 'observe'],
  there: ['nowhere', 'inside', 'behind'],
  here: ['nowhere', 'inside', 'beneath'],
  where: ['nowhere', 'inside', 'behind'],
  nothing: ['something', 'everything', 'anything'],
  everything: ['nothing', 'something', 'anything'],
  everyone: ['no one', 'someone', 'nothing'],
  please: ['help', 'run', 'stop'],
  help: ['run', 'hide', 'leave'],
  think: ['know', 'feel', 'see'],
  know: ['feel', 'fear', 'understand'],
  understand: ['fear', 'know', 'realize'],
  believe: ['know', 'fear', 'accept'],
  remember: ['forget', 'lose', 'misplace'],
  forget: ['remember', 'lose', 'never'],
  always: ['never', 'sometimes', 'forever'],
  never: ['always', 'forever', 'sometimes'],
  maybe: ['certainly', 'surely', 'always'],
  could: ['would', 'should', 'must'],
  should: ['must', 'would', 'could'],
  would: ['should', 'could', 'must'],
  might: ['will', 'must', 'shall'],
  going: ['coming', 'leaving', 'fleeing'],
  coming: ['going', 'leaving', 'arriving'],
  leaving: ['staying', 'coming', 'remaining'],
  people: ['shadows', 'figures', 'entities'],
  thing: ['entity', 'presence', 'shadow'],
  things: ['entities', 'presences', 'shadows'],
  place: ['void', 'darkness', 'abyss'],
  time: ['eternity', 'never', 'forever'],
  world: ['void', 'darkness', 'nightmare'],
  life: ['death', 'existence', 'suffering'],
  death: ['life', 'ending', 'beginning'],
  light: ['darkness', 'shadow', 'void'],
  darkness: ['light', 'void', 'emptiness'],
  sound: ['silence', 'whisper', 'scream'],
  voice: ['whisper', 'echo', 'silence'],
  face: ['mask', 'void', 'nothing'],
  eyes: ['voids', 'darkness', 'nothing'],
  hand: ['claw', 'shadow', 'tendril'],
  hands: ['claws', 'shadows', 'tendrils'],
  room: ['cell', 'prison', 'void'],
  door: ['portal', 'passage', 'threshold'],
  window: ['portal', 'opening', 'void'],
  wall: ['barrier', 'void', 'darkness'],
  floor: ['abyss', 'void', 'depth'],
  ceiling: ['void', 'darkness', 'abyss'],
  house: ['prison', 'tomb', 'labyrinth'],
  home: ['prison', 'tomb', 'trap'],
  friend: ['stranger', 'enemy', 'shadow'],
  family: ['strangers', 'shadows', 'nothing'],
  child: ['shadow', 'figure', 'entity'],
  children: ['shadows', 'figures', 'entities'],
  woman: ['figure', 'shadow', 'presence'],
  man: ['figure', 'shadow', 'presence'],
  person: ['figure', 'shadow', 'entity'],
  body: ['husk', 'vessel', 'shell'],
  mind: ['void', 'emptiness', 'darkness'],
  heart: ['void', 'darkness', 'nothing'],
  soul: ['void', 'emptiness', 'shadow'],
  sleep: ['nightmare', 'darkness', 'void'],
  dream: ['nightmare', 'vision', 'horror'],
  night: ['eternity', 'darkness', 'void'],
  day: ['night', 'darkness', 'shadow'],
  morning: ['darkness', 'shadow', 'night'],
  evening: ['darkness', 'shadow', 'night'],
  start: ['end', 'beginning', 'origin'],
  end: ['beginning', 'origin', 'start'],
  begin: ['end', 'finish', 'cease'],
  stop: ['continue', 'proceed', 'persist'],
  open: ['close', 'seal', 'lock'],
  close: ['open', 'seal', 'reveal'],
  turn: ['remain', 'stay', 'freeze'],
  move: ['freeze', 'stop', 'still'],
  walk: ['stumble', 'crawl', 'drift'],
  run: ['crawl', 'stumble', 'flee'],
  stand: ['fall', 'crumble', 'collapse'],
  sit: ['lie', 'fall', 'sink'],
  speak: ['whisper', 'murmur', 'scream'],
  say: ['whisper', 'murmur', 'hiss'],
  tell: ['whisper', 'murmur', 'hide'],
  ask: ['demand', 'beg', 'plead'],
  answer: ['silence', 'whisper', 'echo'],
  call: ['whisper', 'summon', 'invoke'],
  name: ['title', 'label', 'designation'],
  word: ['sound', 'whisper', 'echo'],
  story: ['lie', 'tale', 'nightmare'],
  truth: ['lie', 'illusion', 'deception'],
  real: ['fake', 'false', 'unreal'],
  good: ['evil', 'bad', 'wrong'],
  bad: ['good', 'evil', 'wrong'],
  right: ['wrong', 'left', 'lost'],
  wrong: ['right', 'correct', 'true'],
  safe: ['dangerous', 'unsafe', 'trapped'],
  happy: ['afraid', 'scared', 'terrified'],
  scared: ['calm', 'dead', 'empty'],
  afraid: ['brave', 'dead', 'empty'],
  alone: ['watched', 'surrounded', 'hunted'],
  away: ['closer', 'nearer', 'here'],
  back: ['forward', 'ahead', 'deeper'],
  again: ['never', 'once', 'forever'],
  still: ['moving', 'shifting', 'changing'],
  just: ['never', 'always', 'forever'],
  only: ['all', 'everything', 'nothing'],
  really: ['not', 'never', 'barely'],
  very: ['barely', 'hardly', 'scarcely'],
};

const CONTENT_WORDS = new Set([
  'something',
  'someone',
  'watching',
  'looking',
  'watch',
  'there',
  'here',
  'where',
  'nothing',
  'everything',
  'everyone',
  'please',
  'help',
  'think',
  'know',
  'understand',
  'believe',
  'remember',
  'forget',
  'always',
  'never',
  'maybe',
  'could',
  'should',
  'would',
  'might',
  'going',
  'coming',
  'leaving',
  'people',
  'thing',
  'things',
  'place',
  'time',
  'world',
  'life',
  'death',
  'light',
  'darkness',
  'sound',
  'voice',
  'face',
  'eyes',
  'hand',
  'hands',
  'room',
  'door',
  'window',
  'wall',
  'floor',
  'ceiling',
  'house',
  'home',
  'friend',
  'family',
  'child',
  'children',
  'woman',
  'man',
  'person',
  'body',
  'mind',
  'heart',
  'soul',
  'sleep',
  'dream',
  'night',
  'day',
  'morning',
  'evening',
  'start',
  'end',
  'begin',
  'stop',
  'open',
  'close',
  'turn',
  'move',
  'walk',
  'run',
  'stand',
  'sit',
  'speak',
  'say',
  'tell',
  'ask',
  'answer',
  'call',
  'name',
  'word',
  'story',
  'truth',
  'real',
  'good',
  'bad',
  'right',
  'wrong',
  'safe',
  'happy',
  'scared',
  'afraid',
  'alone',
  'away',
  'back',
  'again',
  'still',
  'just',
  'only',
  'really',
  'very',
]);

export function replaceWords(text: string, options: ReplaceWordsOptions): string {
  const { intensity, minLength = 5 } = options;

  if (intensity <= 0) return text;

  const words = text.split(/(\s+)/);
  const result: string[] = [];

  for (const word of words) {
    if (word.match(/^\s+$/)) {
      result.push(word);
      continue;
    }

    const lowerWord = word.toLowerCase();
    const cleanWord = lowerWord.replace(/[^a-z]/g, '');

    if (cleanWord.length < minLength || !CONTENT_WORDS.has(cleanWord)) {
      result.push(word);
      continue;
    }

    if (Math.random() > intensity) {
      result.push(word);
      continue;
    }

    const replacements = HORROR_WORD_REPLACEMENTS[cleanWord];
    if (!replacements || replacements.length === 0) {
      result.push(word);
      continue;
    }

    const replacement = replacements[Math.floor(Math.random() * replacements.length)];
    if (word[0] === word[0].toUpperCase()) {
      result.push(replacement.charAt(0).toUpperCase() + replacement.slice(1));
    } else {
      result.push(replacement);
    }
  }

  return result.join('');
}

export const WRONG_WORDS = [
  'them',
  'they',
  'watching',
  'always',
  'behind',
  'closer',
  'coming',
  'nothing',
  'never',
  'forever',
  'eternal',
  'waiting',
  'listening',
  'knowing',
  'seeing',
  'feeling',
  'remember',
  'forget',
  'wrong',
];

export const TEXT_REPLACEMENTS: Record<string, string> = {
  the: 'THEM',
  you: 'YOU',
  your: 'YOUR',
  we: 'THEY',
  us: 'THEM',
  our: 'THEIR',
  it: 'IT',
  is: 'WAS',
  are: 'WERE',
  was: 'IS',
  were: 'ARE',
  will: 'SHALL',
  can: 'MUST',
  could: 'WOULD',
};

export const SCREEN_TAKEOVER_MESSAGES = [
  'W̷̢H̵̢Y̸̧ ̶̡Ḑ̵O̶̢ ̵̧Y̶̢O̵̧U̶̢ ̵̧W̶̢A̵̧T̶̢Ç̵H̶̢',
  'I̷̢T̵̢ ̶̡Ş̵E̶̢Ȩ̵S̶̢ ̵̧Y̶̢O̵̧U̶̢',
  'D̷̢O̵̢Ņ̵T̶̢ ̵̧L̶̢O̵̧O̶̢Ķ̵',
  'B̷̢E̵̢Ḩ̵I̶̢Ņ̵D̶̢ ̵̧Y̶̢O̵̧U̶̢',
  'N̷̢O̵̢Ţ̵ ̶̡Ŗ̵E̶̢A̵̧L̶̢',
  'T̷̢U̵̢Ŗ̵N̶̢ ̵̧B̶̢A̵̧C̶̢Ķ̵',
  'H̷̢E̵̢Ļ̵P̶̢ ̵̧M̶̢Ȩ̵',
  'C̷̢A̵̢Ņ̵T̶̢ ̵̧E̶̢Ş̵C̶̢A̵̧P̶̢Ȩ̵',
];

export const FINAL_MESSAGES = ['G̷̢O̵̢O̸̧D̶̢B̵̧Y̶̢Ȩ̵', 'I̷̢T̵̢ ̶̡I̵̧S̶̢ ̵̧D̶̢O̵̧N̶̢Ȩ̵', 'Y̷̢O̵̢U̸̧ ̶̡A̵̧R̶̢Ȩ̵ ̵̧O̶̢Ņ̵E̶̢ ̵̧N̶̢O̵̧W̶̢', 'T̷̢H̵̢Ȩ̵R̶̢Ȩ̵ ̶̡I̵̧S̶̢ ̵̧N̶̢O̵̧ ̶̡Ȩ̵S̶̢Ç̵A̶̢P̵̧E̶̢'];

export const ENTITY_MESSAGES = {
  wrongWords: WRONG_WORDS,
  textReplacements: TEXT_REPLACEMENTS,
  screenTakeover: SCREEN_TAKEOVER_MESSAGES,
  finalMessages: FINAL_MESSAGES,
};
