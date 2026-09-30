/**
 * Light/dark theme handling for the page root.
 *
 * The theme is a viewer preference, not shared app state: it is remembered per
 * browser and defaults to the system preference. Share links do not carry it.
 */
export type ThemeId = 'light' | 'dark';

const STORAGE_KEY = 'px-theme';

/** Picks the saved theme, falling back to the system preference. */
export function preferredTheme(): ThemeId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage can be blocked; the system preference still applies.
  }
  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }
  return 'light';
}

/**
 * Applies a theme to the page root so the token set switches. Bento's dark
 * tokens live under a .b-dark-theme class, toggled on the same root element
 * so the token aliases in styles.css resolve against the dark set.
 */
export function applyTheme(theme: ThemeId): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('b-dark-theme', theme === 'dark');
}

/** Remembers the choice for the next visit. */
export function saveTheme(theme: ThemeId): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Saving is best effort; the current session still keeps the choice.
  }
}
