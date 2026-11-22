import { useEffect } from 'react';

/**
 * Режим чтения: пока страница открыта, на телефоне нет нижней панели разделов — её место занимают
 * кнопки самой страницы («Назад» / «Дальше»), прибитые к низу экрана. Выход — стрелка «назад» сверху.
 * Ставит `data-focus` на <html>; стили — global.css и widgets/app-header.
 */
export function useFocusMode(): void {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.focus = '';
    return () => {
      delete root.dataset.focus;
    };
  }, []);
}
