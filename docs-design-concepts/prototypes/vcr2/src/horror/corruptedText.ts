const GLITCH_CHARS = '█▓▒░▀▄▌▐■□▪▫◊○●◦';
const CORRUPT_CHARS = '░▒▓█▀▄▌▐';

export interface CorruptedTextOptions {
  intensity: number;
  seed?: number;
  preserveLength?: boolean;
  maxZalgo?: number;
}

function seededRandom(initialSeed: number): () => number {
  let seed = initialSeed;
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

export function corruptText(text: string, options: CorruptedTextOptions): string {
  const { intensity, seed = Date.now(), preserveLength = true, maxZalgo = 3 } = options;

  if (intensity <= 0) return text;

  const random = seededRandom(seed);
  const chars = text.split('');
  const result: string[] = [];

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];

    if (char === ' ' || char === '\n') {
      result.push(char);
      continue;
    }

    const roll = random();

    if (roll < intensity * 0.3) {
      const glitchIndex = Math.floor(random() * GLITCH_CHARS.length);
      result.push(GLITCH_CHARS[glitchIndex]);
    } else if (roll < intensity * 0.5) {
      const corruptIndex = Math.floor(random() * CORRUPT_CHARS.length);
      result.push(CORRUPT_CHARS[corruptIndex]);
    } else if (roll < intensity * 0.7) {
      result.push(char.toUpperCase() === char ? char.toLowerCase() : char.toUpperCase());
    } else if (roll < intensity * 0.85 && !preserveLength) {
      const zalgoCount = Math.floor(random() * maxZalgo) + 1;
      let zalgoed = char;
      for (let j = 0; j < zalgoCount; j++) {
        const zalgoCode = 0x300 + Math.floor(random() * 0x36);
        zalgoed += String.fromCharCode(zalgoCode);
      }
      result.push(zalgoed);
    } else {
      result.push(char);
    }
  }

  return result.join('');
}

export function corruptTimecode(timecode: string, intensity: number): string {
  if (intensity <= 0) return timecode;

  const random = seededRandom(Date.now());
  const chars = timecode.split('');

  for (let i = 0; i < chars.length; i++) {
    if (chars[i] >= '0' && chars[i] <= '9' && random() < intensity * 0.4) {
      if (random() < 0.5) {
        chars[i] = String.fromCharCode(0x3040 + Math.floor(random() * 10));
      } else {
        chars[i] = String.fromCharCode(
          Math.floor(random() * 10)
            .toString()
            .charCodeAt(0)
        );
      }
    }
  }

  return chars.join('');
}

export function generateEntityMessage(intensity: number): string {
  const messages = [
    'W̷̢H̵̢Y̸̧ ̶̡Ḑ̵O̶̢ ̵̧Y̶̢O̵̧U̶̢ ̵̧W̶̢A̵̧T̶̢Ç̵H̶̢',
    'I̷̢T̵̢ ̶̡Ş̵E̶̢Ȩ̵S̶̢ ̵̧Y̶̢O̵̧U̶̢',
    'D̷̢O̵̢Ņ̵T̶̢ ̵̧L̶̢O̵̧O̶̢Ķ̵',
    'B̷̢E̵̢Ḩ̵I̶̢Ņ̵D̶̢ ̵̧Y̶̢O̵̧U̶̢',
    'N̷̢O̵̢Ţ̵ ̶̡Ŗ̵E̶̢A̵̧L̶̢',
    'T̷̢U̵̢Ŗ̵N̶̢ ̵̧B̶̢A̵̧C̶̢Ķ̵',
    'H̷̢E̵̢Ļ̵P̶̢ ̵̧M̶̢Ȩ̵',
    'C̷̢A̵̢Ņ̵T̶̢ ̵̧E̶̢Ş̵C̶̢A̵̧P̶̢Ȩ̵',
    'S̷̢T̵̢O̵̧P̶̢ ̵̧W̶̢A̵̧T̶̢Ç̵H̶̢I̵̧N̶̢Ģ̵',
    'T̷̢H̵̢Ȩ̵Y̶̢ ̵̧A̶̢Ŗ̵E̶̢ ̵̧H̶̢Ȩ̵R̶̢Ȩ̵',
  ];

  const index = Math.floor(intensity * (messages.length - 1));
  return corruptText(messages[Math.min(index, messages.length - 1)], {
    intensity: intensity * 0.5,
    seed: Date.now(),
  });
}

export function getChannelBleed(intensity: number): string[] {
  if (intensity < 0.3) return [];

  const bleedChannels = ['CH  3', 'CH  7', 'CH 13', 'CH 66'];
  const count = Math.floor(intensity * 3);

  return bleedChannels
    .slice(0, count)
    .map((ch) => corruptText(ch, { intensity: intensity * 0.6, seed: ch.charCodeAt(0) }));
}

export function generateStaticFace(intensity: number): string[] {
  const rows: string[] = [];
  const width = 16;
  const height = 12;

  for (let y = 0; y < height; y++) {
    let row = '';
    for (let x = 0; x < width; x++) {
      const faceX = (x - width / 2) / (width / 2);
      const faceY = (y - height / 2) / (height / 2);

      const isEye1 = Math.abs(x - 5) < 2 && Math.abs(y - 4) < 2;
      const isEye2 = Math.abs(x - 10) < 2 && Math.abs(y - 4) < 2;
      const isMouth = y > 7 && y < 10 && x > 5 && x < 11;

      const noise = Math.random();

      if (isEye1 || isEye2) {
        if (intensity > 0.5 && noise < intensity * 0.3) {
          row += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        } else {
          row += '█';
        }
      } else if (isMouth) {
        row += intensity > 0.3 ? '▓' : '░';
      } else if (Math.abs(faceX) < 0.8 && Math.abs(faceY) < 0.9) {
        if (noise < intensity * 0.2) {
          row += CORRUPT_CHARS[Math.floor(Math.random() * CORRUPT_CHARS.length)];
        } else {
          row += '░';
        }
      } else {
        row += ' ';
      }
    }
    rows.push(row);
  }

  return rows;
}

export const ENTITY_FACE_ASCII = [
  '    ▄▄▄▄▄▄▄▄    ',
  '  ▄▀        ▀▄  ',
  ' ▄  ▀▄    ▄▀  ▄ ',
  '▄   ██    ██   ▄',
  '▀  ▄▀  ▄▄▀  ▄  ▀',
  ' ▀▄   ▀██▀   ▄▀ ',
  '  ▀▄▄▀    ▀▄▄▀  ',
  '    ▀▀▀▀▀▀▀▀    ',
];
