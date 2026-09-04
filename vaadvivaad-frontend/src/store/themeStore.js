import { create } from 'zustand';

/**
 * Theme.
 *
 * Two things were wrong before: the choice was never written to the document,
 * so CSS had no way to respond and every component had to thread a `dark`
 * boolean and branch on it by hand; and it was never persisted, so the app
 * reset to dark on every reload regardless of what the user picked.
 *
 * The store now stamps `class="dark"` and `data-theme` on <html>, which is what
 * the token layer in index.css keys off, and remembers the choice.
 */

const STORAGE_KEY = 'vv-theme';

function preferredTheme() {
  if (typeof window === 'undefined') return 'dark';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    /* private mode -- fall through to the system preference */
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* not being able to remember the choice must not break the toggle */
  }
}

const initial = preferredTheme();
applyTheme(initial);

const themeStore = create((set) => ({
  theme: initial,
  isSidebarOpen: true,

  changeTheme: () =>
    set((state) => {
      const theme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(theme);
      return { theme };
    }),

  setTheme: (theme) =>
    set(() => {
      applyTheme(theme);
      return { theme };
    }),

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}));

export default themeStore;
