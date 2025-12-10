export const safeLoad = (key, defaultValue) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    const parsed = JSON.parse(raw);
    if (Array.isArray(defaultValue) && !Array.isArray(parsed)) return defaultValue;
    return parsed ?? defaultValue;
  } catch (e) {
    console.error('Error loading data from localStorage key', key, e);
    try { localStorage.removeItem(key); } catch {}
    return defaultValue;
  }
};
