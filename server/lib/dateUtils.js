function parseDateOnly(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, d] = value.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function daysBetween(start, end) {
  const from = parseDateOnly(start);
  const to = parseDateOnly(end);
  if (!from || !to) return 0;
  return Math.max(0, Math.floor((to - from) / (1000 * 60 * 60 * 24)));
}

function isFutureDate(value, reference = new Date()) {
  const date = parseDateOnly(value);
  const ref = parseDateOnly(reference);
  if (!date || !ref) return false;
  return date > ref;
}

function toStoredDate(value) {
  const date = parseDateOnly(value);
  if (!date) return new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

module.exports = {
  parseDateOnly,
  daysBetween,
  isFutureDate,
  toStoredDate
};
