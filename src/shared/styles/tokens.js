/**
 * Design tokens for PrestaPro
 * These map theme colors to CSS custom properties and Tailwind classes.
 */

export const THEME_COLORS = {
  blue: {
    primary: '#2563eb',
    primaryHover: '#3b82f6',
    primaryBg: 'rgba(37, 99, 235, 0.1)',
    primaryDarkBg: 'rgba(37, 99, 235, 0.25)',
    gradient: 'from-blue-600 to-indigo-700',
    shadow: 'shadow-blue-900/20',
  },
  indigo: {
    primary: '#4f46e5',
    primaryHover: '#6366f1',
    primaryBg: 'rgba(79, 70, 229, 0.1)',
    primaryDarkBg: 'rgba(79, 70, 229, 0.25)',
    gradient: 'from-indigo-600 to-purple-700',
    shadow: 'shadow-indigo-900/20',
  },
  emerald: {
    primary: '#059669',
    primaryHover: '#10b981',
    primaryBg: 'rgba(5, 150, 105, 0.1)',
    primaryDarkBg: 'rgba(5, 150, 105, 0.25)',
    gradient: 'from-emerald-600 to-teal-700',
    shadow: 'shadow-emerald-900/20',
  },
  rose: {
    primary: '#e11d48',
    primaryHover: '#f43f5e',
    primaryBg: 'rgba(225, 29, 72, 0.1)',
    primaryDarkBg: 'rgba(225, 29, 72, 0.25)',
    gradient: 'from-rose-600 to-pink-700',
    shadow: 'shadow-rose-900/20',
  },
  amber: {
    primary: '#d97706',
    primaryHover: '#f59e0b',
    primaryBg: 'rgba(217, 119, 6, 0.1)',
    primaryDarkBg: 'rgba(217, 119, 6, 0.25)',
    gradient: 'from-amber-600 to-orange-700',
    shadow: 'shadow-amber-900/20',
  },
};

/**
 * Apply theme color as CSS custom properties on the root element.
 * Call this when systemSettings.themeColor changes.
 */
export function applyThemeColor(colorName = 'blue') {
  const theme = THEME_COLORS[colorName] || THEME_COLORS.blue;
  const root = document.documentElement;

  root.style.setProperty('--color-primary', theme.primary);
  root.style.setProperty('--color-primary-hover', theme.primaryHover);
  root.style.setProperty('--color-primary-bg', theme.primaryBg);
  root.style.setProperty('--color-primary-dark-bg', theme.primaryDarkBg);
}

export const BOTTOM_NAV_HEIGHT = {
  mobile: '5rem',    // 80px
  tablet: '4.5rem',  // 72px
};
