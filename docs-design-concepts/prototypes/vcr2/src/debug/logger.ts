import { IS_DEBUG } from './isDebug';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  module: string;
  color?: string;
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: '#888888',
  info: '#33FF33',
  warn: '#FFAA00',
  error: '#FF0000',
};

const MODULE_COLORS = [
  '#33FF33', // green
  '#00FFFF', // cyan
  '#FFAA00', // amber
  '#FF00FF', // magenta
  '#FFFF00', // yellow
];

let moduleColorIndex = 0;
const moduleColorMap = new Map<string, string>();

function getModuleColor(module: string): string {
  const existing = moduleColorMap.get(module);
  if (existing) {
    return existing;
  }
  const color = MODULE_COLORS[moduleColorIndex % MODULE_COLORS.length];
  moduleColorMap.set(module, color);
  moduleColorIndex++;
  return color;
}

class Logger {
  private module: string;
  private moduleColor: string;

  constructor(config: LoggerConfig) {
    this.module = config.module;
    this.moduleColor = config.color || getModuleColor(config.module);
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    const levelColor = LEVEL_COLORS[level];
    const prefix = `%c[${this.module}]%c ${message}`;
    const styles = [`color: ${this.moduleColor}; font-weight: bold;`, `color: ${levelColor};`];

    if (level === 'debug' && !IS_DEBUG) {
      return; // Skip debug logs in production
    }

    // eslint-disable-next-line no-console
    console[level](prefix, ...styles, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log('error', message, ...args);
  }
}

export function createLogger(module: string, color?: string): Logger {
  return new Logger({ module, color });
}

export { Logger };
