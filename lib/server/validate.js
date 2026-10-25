// Input checking and money helpers (server only).

/** Accepts 12, 12.5 or "12.5". Anything else gives null. */
export function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

/** Text from the browser: trimmed string, or '' when it is missing or not text. */
export const cleanString = (value) =>
  typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';

export const round2 = (n) => Math.round(n * 100) / 100;

/** Whole cents, so amounts can be compared without floating-point surprises. */
export const cents = (n) => Math.round(n * 100);

/** 12345.5 -> "12,345.50" (used in error messages). */
export const formatAmount = (n) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
