export const generateId = () => Math.random().toString(36).substr(2, 9);

export const generateSecurityToken = () => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(2);
    window.crypto.getRandomValues(array);
    return Array.from(array)
      .map(v => v.toString(16).padStart(8, '0'))
      .join('')
      .slice(0, 12)
      .toUpperCase();
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
};
