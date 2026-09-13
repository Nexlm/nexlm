const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = LEVELS[process.env.LOG_LEVEL] ?? (process.env.NODE_ENV === 'test' ? LEVELS.error : LEVELS.info);
const json = process.env.NODE_ENV === 'production';

function serializeError(err) {
  if (!(err instanceof Error)) return err;
  return { name: err.name, message: err.message, code: err.code, stack: err.stack };
}

function write(level, message, meta) {
  if (LEVELS[level] < threshold) return;
  const out = level === 'error' || level === 'warn' ? console.error : console.log;
  const cleanMeta = meta && Object.fromEntries(
    Object.entries(meta).map(([k, v]) => [k, serializeError(v)]),
  );

  if (json) {
    out(JSON.stringify({ level, time: new Date().toISOString(), message, ...cleanMeta }));
  } else {
    out(`[${new Date().toISOString()}] ${level.toUpperCase().padEnd(5)} ${message}`, cleanMeta ?? '');
  }
}

export const logger = {
  debug: (msg, meta) => write('debug', msg, meta),
  info: (msg, meta) => write('info', msg, meta),
  warn: (msg, meta) => write('warn', msg, meta),
  error: (msg, meta) => write('error', msg, meta),
};
