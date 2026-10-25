// Number and date formatting for the screens.
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || 'RWF';

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

export const num = (n) => numberFormat.format(Number(n) || 0);
export const money = (n) => `${num(n)} ${CURRENCY}`;

export const dateTime = (iso) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '';
