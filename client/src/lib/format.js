const ngnFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatNgn = (value) => ngnFormatter.format(Number(value ?? 0));

export function formatXlm(value, { decimals = 7, suffix = true } = {}) {
  const number = Number(value ?? 0).toLocaleString('en-US', { maximumFractionDigits: decimals });
  return suffix ? `${number} XLM` : number;
}

export const shortAddress = (address, chars = 4) =>
  address ? `${address.slice(0, chars)}…${address.slice(-chars)}` : '';

export const formatDateTime = (date) =>
  new Date(date).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });

export const formatTime = (date) =>
  new Date(date).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });

export function timeAgo(date, now = Date.now()) {
  const seconds = Math.round((now - new Date(date).getTime()) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString('en-NG', { dateStyle: 'medium' });
}

export function formatCountdown(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Display-only NGN estimate; the server computes the authoritative total. */
export function estimateNgn(xlmAmount, ngnRate) {
  const xlm = Number(xlmAmount);
  const rate = Number(ngnRate);
  if (!Number.isFinite(xlm) || !Number.isFinite(rate)) return 0;
  return Math.round(xlm * rate * 100) / 100;
}

export const formatPercent = (value) => (value === null || value === undefined ? '—' : `${value}%`);
