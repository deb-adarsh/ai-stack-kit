/**
 * Structured logging for the apply pipeline (swap for pino/winston in production).
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export function createConsoleLogger(scope = 'spec-engine', level: LogLevel = 'info'): Logger {
  const order: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  const min = order.indexOf(level);

  const log = (lvl: LogLevel, message: string, meta?: Record<string, unknown>) => {
    if (order.indexOf(lvl) < min) return;
    const line = `[${scope}] ${lvl.toUpperCase()} ${message}`;
    const rest = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const fn = lvl === 'error' ? console.error : lvl === 'warn' ? console.warn : console.log;
    fn(line + rest);
  };

  return {
    debug: (m, meta) => log('debug', m, meta),
    info: (m, meta) => log('info', m, meta),
    warn: (m, meta) => log('warn', m, meta),
    error: (m, meta) => log('error', m, meta),
  };
}
