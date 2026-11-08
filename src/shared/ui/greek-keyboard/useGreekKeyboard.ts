import { useCallback, useState } from 'react';

const STORAGE_KEY = 'verbs-first:greek-keyboard';

/** Сенсорный экран: там есть своя клавиатура, экранную по умолчанию прячем. */
export const isTouchDevice = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true;

function readPreference(): boolean | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw === null ? null : raw === '1';
  } catch {
    return null;
  }
}

/**
 * Показывать ли экранную греческую клавиатуру.
 * По умолчанию: на компьютере — да, на телефоне — нет. Выбор ученика запоминается.
 * inputMode: если экранная клавиатура открыта на телефоне, системную не поднимаем —
 * иначе две клавиатуры закроют пол-экрана.
 */
export function useGreekKeyboard() {
  const [open, setOpen] = useState(() => readPreference() ?? !isTouchDevice());
  // На телефоне не поднимаем клавиатуру сама по себе при открытии шага (она закроет задание),
  // но сохраняем фокус, если ученик уже печатает и перешёл к следующей фразе.
  const [autoFocus] = useState(
    () => !isTouchDevice() || (typeof document !== 'undefined' && document.activeElement instanceof HTMLInputElement),
  );

  const toggle = useCallback(() => {
    setOpen((prev) => {
      try {
        localStorage.setItem(STORAGE_KEY, prev ? '0' : '1');
      } catch {
        /* не критично */
      }
      return !prev;
    });
  }, []);

  return {
    autoFocus,
    open,
    toggle,
    inputMode: open && isTouchDevice() ? ('none' as const) : ('text' as const),
  };
}
