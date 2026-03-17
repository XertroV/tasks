const LOGO_PALETTE: Array<[number, number, number]> = [
  [255, 235, 90],
  [240, 210, 65],
  [210, 175, 45],
  [170, 130, 30],
  [120, 80, 12],
  [70, 42, 3],
  [35, 18, 0],
] as const;

type Rng = {
  nextFloat: () => number;
  nextInt: (maxExclusive: number) => number;
  nextChoice<T>(values: T[]): T;
};

function makeRng(seed: number): Rng {
  let state = seed >>> 0;
  if (state === 0) state = 1;

  return {
    nextFloat() {
      state = (state * 1103515245 + 12345) >>> 0;
      return state / 0x1_0000_0000;
    },
    nextInt(maxExclusive) {
      if (maxExclusive <= 0) return 0;
      return Math.floor(this.nextFloat() * maxExclusive);
    },
    nextChoice(values) {
      return values[this.nextInt(values.length)];
    },
  };
}

function parseEnvBool(value: string): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (["1", "true", "t", "yes", "on", "always", "y"].includes(normalized)) return true;
  if (["0", "false", "f", "no", "off", "never", "n"].includes(normalized)) return false;
  return null;
}

function colorize(text: string, [r, g, b]: [number, number, number]): string {
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
}

function blendColor(
  start: [number, number, number],
  end: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    Math.round(start[0] + (end[0] - start[0]) * t),
    Math.round(start[1] + (end[1] - start[1]) * t),
    Math.round(start[2] + (end[2] - start[2]) * t),
  ];
}

function packPixelRows(rows: string[]): [string, string] {
  const width = rows[0]?.length ?? 0;
  let upper = "";
  let lower = "";

  for (let i = 0; i < width; i++) {
    const topA = rows[0]![i] === "#";
    const topB = rows[1]![i] === "#";
    if (topA && topB) {
      upper += "█";
    } else if (topA) {
      upper += "▀";
    } else if (topB) {
      upper += "▄";
    } else {
      upper += " ";
    }

    const lowerA = rows[2]![i] === "#";
    const lowerB = rows[3]![i] === "#";
    if (lowerA && lowerB) {
      lower += "█";
    } else if (lowerA) {
      lower += "▀";
    } else if (lowerB) {
      lower += "▄";
    } else {
      lower += " ";
    }
  }

  return [upper, lower];
}

const LOGO_FONT_4x4: Record<string, string[]> = {
  T: ["#####", " ##  ", " ##  ", " ##  "],
  H: ["##  #", "#####", "##  #", "##  #"],
  E: ["#####", "#### ", "##   ", "#####"],
  B: ["#### ", "#####", "##  #", "#### "],
  A: [" ### ", "##  #", "#####", "##  #"],
  C: [" ####", "##   ", "##   ", " ####"],
  K: ["#  ##", "#### ", "#### ", "#  ##"],
  L: ["##   ", "##   ", "##   ", "#####"],
  O: [" ### ", "##  #", "##  #", " ### "],
  G: [" ####", "##   ", "## ##", " ####"],
  S: [" ####", "###  ", "  ###", "#### "],
  P: ["#### ", "#####", "#### ", "#    "],
  W: ["#   #", "#   #", "# # #", " # # "],
  R: ["#### ", "#####", "#### ", "#  ##"],
  N: ["#   #", "##  #", "# ###", "#   #"],
  I: [" ### ", " ### ", " ### ", " ### "],
  D: ["#### ", "#   #", "#   #", "#### "],
  Y: ["#   #", " ### ", " ### ", " ### "],
  F: ["#####", "#### ", "#    ", "#    "],
  " ": ["     ", "     ", "     ", "     "],
  "?": ["#####", "#   #", " ##  ", "  #  "],
};

const LOGO_FONT = new Map<string, [string, string]>(Object.entries(LOGO_FONT_4x4).map(([key, rows]) => [key, packPixelRows(rows)]));

function renderLogoText(text: string): [string, string] {
  let upperRow = "";
  let lowerRow = "";
  for (const ch of text.toUpperCase()) {
    const glyph = LOGO_FONT.get(ch) ?? LOGO_FONT.get("?")!;
    upperRow += `${glyph[0]} `;
    lowerRow += `${glyph[1]} `;
  }
  return [upperRow, lowerRow];
}

function dissolvePixel(
  ch: string,
  depth: number,
  col: number,
  total: number,
  rng: Rng,
): string {
  if (ch === " ") return ch;
  if (depth <= 0.04) return ch;
  const edge = total > 1 ? Math.abs(col / (total - 1) - 0.5) * 2 : 0;
  const jitter = depth + (0.75 - edge) * 0.35 + (rng.nextFloat() - 0.5) * 0.25;
  if (jitter < 0.25) return ch;
  if (jitter < 0.40) return rng.nextChoice(["█", "▓"]);
  if (jitter < 0.55) return rng.nextChoice(["▓", "▒"]);
  if (jitter < 0.78) return rng.nextChoice(["░", "·"]);
  return " ";
}

function humLine(width: number, rng: Rng, color: [number, number, number], withColor: boolean): string {
  if (width <= 0) return "";
  let state = 0;
  let stateRemaining = rng.nextInt(5) + 4;
  let segmentWidth = Math.max(1, Math.floor(width / 6));

  let line = "";
  for (let i = 0; i < width; i++) {
    stateRemaining -= 1;
    if (stateRemaining <= 0) {
      state = rng.nextInt(4);
      segmentWidth = Math.max(1, segmentWidth + rng.nextInt(5) - 2);
      stateRemaining = Math.max(3, segmentWidth + rng.nextInt(7));
    }
    switch (state) {
      case 0:
        line += rng.nextFloat() < 0.85 ? "━" : "═";
        break;
      case 1:
        line += rng.nextFloat() < 0.75 ? "─" : "╌";
        break;
      case 2:
        line += rng.nextInt(2) === 0 ? "─" : "╌";
        break;
      default:
        line += " ";
    }
  }

  return withColor ? colorize(line, color) : line;
}

function dripLine(width: number, pad: number, rng: Rng, color: [number, number, number], withColor: boolean): string {
  let line = " ".repeat(pad);
  for (let i = 0; i < width; i++) {
    const chance = rng.nextFloat();
    if (chance < 0.03) line += "·";
    else if (chance < 0.08) line += "░";
    else if (chance < 0.12) line += "▓";
    else line += " ";
  }
  return withColor ? colorize(line, color) : line;
}

function maxInt(a: number, b: number): number {
  return a > b ? a : b;
}

function minInt(a: number, b: number): number {
  return a < b ? a : b;
}

export function stripAnsiCodes(text: string): string {
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}

export function startupLogoWidth(): number {
  const envColumns = process.env.COLUMNS;
  if (envColumns) {
    const parsed = Number.parseInt(envColumns, 10);
    if (parsed > 0) return parsed;
  }
  const stdoutColumns = process.stdout.columns;
  if (typeof stdoutColumns === "number" && stdoutColumns > 0) return stdoutColumns;
  return 80;
}

export function logoShouldUseColor(): boolean {
  if (process.env.NO_COLOR !== undefined) return false;
  if (process.env.FORCE_COLOR !== undefined && process.env.FORCE_COLOR.trim() !== "" && process.env.FORCE_COLOR.trim() !== "0") {
    return true;
  }
  if (
    process.env.CLICOLOR_FORCE !== undefined &&
    process.env.CLICOLOR_FORCE.trim() !== "" &&
    process.env.CLICOLOR_FORCE.trim() !== "0"
  ) {
    return true;
  }

  if (process.env.CLICOLOR !== undefined) {
    const value = parseEnvBool(process.env.CLICOLOR);
    return value === null || value;
  }
  return true;
}

export function renderStartupLogo(width = 80, seed = 3, withColor = logoShouldUseColor()): string[] {
  const logoWidth = Math.max(1, width);
  const rng = makeRng(seed >>> 0);
  const palette = LOGO_PALETTE;
  const [row0, row1] = renderLogoText("THE BACKLOGS");
  const baseTextWidth = row0.length;
  const layerCount = palette.length;
  const maxIndent = (layerCount - 1) * 2;
  const naturalWidth = baseTextWidth + maxIndent;

  const leftPad = logoWidth > naturalWidth ? Math.floor((logoWidth - naturalWidth) / 2) : 0;
  const humPad = logoWidth > naturalWidth + 4 ? Math.floor((logoWidth - (naturalWidth + 4)) / 2) : 0;

  const out: string[] = [];
  const lumLine = humLine(baseTextWidth + 4, rng, palette[1], withColor);
  out.push((humPad > 0 ? " ".repeat(humPad) : "") + lumLine);
  out.push("");

  for (let layer = 0; layer < layerCount; layer++) {
    const indent = layer * 2;
    const pad = leftPad + indent;
    const depth = layerCount > 1 ? layer / (layerCount - 1) : 0;
    const baseColor = palette[layer];
    const lines: string[] = [row0, row1];

    for (const line of lines) {
      let rendered = " ".repeat(pad);
      for (let i = 0; i < line.length; i++) {
        const next = dissolvePixel(line[i]!, depth, i, line.length, rng);
        rendered += next;
      }
      if (withColor) rendered = colorize(rendered, baseColor);
      out.push(rendered);
    }

    if (layer < layerCount - 1) {
      const dividerLen = baseTextWidth + indent;
      const dividerColor = blendColor(baseColor, palette[layer + 1], 0.45);
      const divider = `${" ".repeat(pad)}${"─".repeat(dividerLen)}`;
      out.push(withColor ? colorize(divider, dividerColor) : divider);
    }
  }

  let dripWidth = naturalWidth;
  for (let i = 0; i < 3; i++) {
    out.push(dripLine(dripWidth, leftPad + 2, rng, palette[minInt(layerCount - 1, i + 1)]!, withColor));
    dripWidth = maxInt(dripWidth - 1, baseTextWidth + 2);
  }

  return out;
}
