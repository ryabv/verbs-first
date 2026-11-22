import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';
/** Выбор ученика: своя тема или «как в системе» (по умолчанию). */
export type ThemeMode = Theme | 'system';

const STORAGE_KEY = 'verbs-first:theme';
const darkQuery = () => window.matchMedia?.('(prefers-color-scheme: dark)');

function systemTheme(): Theme {
  return darkQuery()?.matches ? 'dark' : 'light';
}

function storedMode(): ThemeMode {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

let mode: ThemeMode = 'system';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

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

const themeOf = (m: ThemeMode): Theme => (m === 'system' ? systemTheme() : m);

/**
 * Смена темы с плавным перетеканием: браузер снимает страницу в старой теме и растворяет её в новой
 * (View Transitions, длительность — global.css). Нет поддержки или просили меньше движения — сразу.
 */
function switchTheme(theme: Theme) {
  if (document.documentElement.dataset.theme === theme) return;
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (still || typeof document.startViewTransition !== 'function') applyTheme(theme);
  else document.startViewTransition(() => applyTheme(theme));
}

/** Вызвать до первого рендера, чтобы не мигала светлая тема. «Как в системе» — следим за сменой темы системы. */
export function initTheme(): void {
  mode = storedMode();
  applyTheme(themeOf(mode));
  darkQuery()?.addEventListener('change', () => {
    if (mode !== 'system') return;
    switchTheme(systemTheme());
    emit();
  });
}

export function setThemeMode(next: ThemeMode): void {
  mode = next;
  switchTheme(themeOf(next));
  try {
    if (next === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* не критично */
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Выбор темы: «как в системе», светлая или тёмная. */
export function useThemeMode(): [ThemeMode, (m: ThemeMode) => void] {
  const current = useSyncExternalStore(subscribe, () => mode);
  return [current, setThemeMode];
}

/** Тема, которая сейчас на экране, и переключатель «в другую» (кнопка в шапке на компьютере). */
export function useTheme() {
  const [current] = useThemeMode();
  const theme = themeOf(current);
  const setTheme = useCallback((next: Theme) => setThemeMode(next), []);
  return { theme, setTheme };
}
