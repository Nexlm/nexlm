/** Maps server validation details ({ path, message }[]) to { field: message }. */
export function fieldErrors(error) {
  if (!Array.isArray(error?.details)) return {};
  return Object.fromEntries(error.details.filter((d) => d.path).map((d) => [d.path, d.message]));
}

/** Only allow same-origin relative redirects such as "/trades/abc". */
export function safeRedirect(next, fallback = '/') {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) return fallback;
  return next;
}
