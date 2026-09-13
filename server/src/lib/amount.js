/**
 * Exact decimal helpers for XLM (7 decimals) and NGN (2 decimals).
 * All arithmetic is done in BigInt minor units to avoid floating point drift.
 */

const STROOPS_PER_XLM = 10_000_000n;
const KOBO_PER_NAIRA = 100n;

function normalize(value, decimals) {
  if (value !== null && typeof value === 'object' && typeof value.toFixed === 'function') {
    // Prisma Decimal / decimal.js instances
    return value.toFixed(decimals);
  }
  return String(value).trim();
}

function toMinor(value, decimals, label) {
  const s = normalize(value, decimals);
  const pattern = new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`);
  if (!pattern.test(s)) throw new Error(`Invalid ${label} amount: ${value}`);
  const [whole, frac = ''] = s.split('.');
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(frac.padEnd(decimals, '0'));
}

function fromMinor(minor, decimals, { trim }) {
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const scale = 10n ** BigInt(decimals);
  let frac = (abs % scale).toString().padStart(decimals, '0');
  if (trim) frac = frac.replace(/0+$/, '');
  return `${negative ? '-' : ''}${abs / scale}${frac ? `.${frac}` : ''}`;
}

export const toStroops = (xlm) => toMinor(xlm, 7, 'XLM');
export const fromStroops = (stroops) => fromMinor(BigInt(stroops), 7, { trim: true });

export const toKobo = (ngn) => toMinor(ngn, 2, 'NGN');
export const fromKobo = (kobo) => fromMinor(BigInt(kobo), 2, { trim: false });

export const addXlm = (...values) => fromStroops(values.reduce((sum, v) => sum + toStroops(v), 0n));
export const subXlm = (a, b) => fromStroops(toStroops(a) - toStroops(b));
export const compareXlm = (a, b) => {
  const diff = toStroops(a) - toStroops(b);
  return diff === 0n ? 0 : diff > 0n ? 1 : -1;
};

/** NGN total for an XLM amount at a NGN/XLM rate, rounded half-up to the kobo. */
export function ngnTotal(xlmAmount, ngnRate) {
  const product = toStroops(xlmAmount) * toKobo(ngnRate);
  const kobo = (product + STROOPS_PER_XLM / 2n) / STROOPS_PER_XLM;
  return fromKobo(kobo);
}

export { STROOPS_PER_XLM, KOBO_PER_NAIRA };
