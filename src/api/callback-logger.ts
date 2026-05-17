import type { Logger, LogLevel } from '../pipeline/logger.js';

/** Logger that forwards to callbacks (VS Code output channel, tests). */
export function createCallbackLogger(
  onLog: (level: LogLevel, message: string, meta?: Record<string, unknown>) => void,
  minLevel: LogLevel = 'info'
): Logger {
  const order: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  const min = order.indexOf(minLevel);

  const should = (lvl: LogLevel) => order.indexOf(lvl) >= min;

  return {
    debug: (m, meta) => {
      if (should('debug')) onLog('debug', m, meta);
    },
    info: (m, meta) => {
      if (should('info')) onLog('info', m, meta);
    },
    warn: (m, meta) => {
      if (should('warn')) onLog('warn', m, meta);
    },
    error: (m, meta) => {
      if (should('error')) onLog('error', m, meta);
    },
  };
}
