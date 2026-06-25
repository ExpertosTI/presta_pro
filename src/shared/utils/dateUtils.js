/** Normaliza fechas YYYY-MM-DD o ISO sin desfase por zona horaria */
export function parseDateOnly(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, d] = value.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function startOfToday() {
  return parseDateOnly(new Date());
}

export function daysBetween(start, end) {
  const from = parseDateOnly(start);
  const to = parseDateOnly(end);
  if (!from || !to) return 0;
  return Math.max(0, Math.floor((to - from) / (1000 * 60 * 60 * 24)));
}

export function isPastDate(value, reference = new Date()) {
  const date = parseDateOnly(value);
  const ref = parseDateOnly(reference);
  if (!date || !ref) return false;
  return date < ref;
}

export function isFutureDate(value, reference = new Date()) {
  const date = parseDateOnly(value);
  const ref = parseDateOnly(reference);
  if (!date || !ref) return false;
  return date > ref;
}

export function toDateInputValue(value) {
  const date = parseDateOnly(value);
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Fecha para persistir en BD (mediodía local, evita saltos UTC) */
export function toStoredDate(value) {
  const date = parseDateOnly(value);
  if (!date) return new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}
