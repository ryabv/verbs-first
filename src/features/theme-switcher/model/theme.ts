import { useCallback, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'verbs-first:theme';

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  paintSystemBars();
}

/**
 * Полосы системы (строка состояния, на Android — и панель навигации в установленном приложении) красятся
 * в theme-color. В index.html он задан по теме системы — а тема сайта может быть другой (тёмный сайт
 * при светлой системе давал белые полосы). Ставим один theme-color — фон текущей темы (--bg).
 */
function paintSystemBars() {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (!bg) return;
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  metas.forEach((m, i) => {
    if (i > 0) m.remove();
  });
  const meta = metas[0] ?? document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'theme-color' }));
  meta.removeAttribute('media');
  meta.content = bg;
}

/**
 * Смена темы с плавным перетеканием: браузер снимает страницу в старой теме и растворяет её в новой
 * (View Transitions, длительность — global.css). Нет поддержки или просили меньше движения — сразу.
 */
function switchTheme(theme: Theme) {
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (still || typeof document.startViewTransition !== 'function') applyTheme(theme);
  else document.startViewTransition(() => applyTheme(theme));
}

/** Вызвать до первого рендера, чтобы не мигала светлая тема. */
export function initTheme(): void {
  applyTheme(storedTheme() ?? systemTheme());
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(
    () => (document.documentElement.dataset.theme as Theme | undefined) ?? 'light',
  );

  const setTheme = useCallback((next: Theme) => {
    switchTheme(next);
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* не критично */
    }
  }, []);

  return { theme, setTheme };
}
