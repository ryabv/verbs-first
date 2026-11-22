import { useCallback, useEffect, useRef, useState } from 'react';
import { ThemeChoice } from '@/features/theme-switcher';
import styles from './ProfileSheet.module.css';

const CLOSE_MS = 220;
/** Свайп вниз дальше этого — шторка закрывается. */
const SWIPE_CLOSE = 60;

/**
 * Шторка «Профиль» (телефон): выезжает снизу поверх страницы — страница не меняется.
 * Закрывается тапом мимо, Escape или свайпом вниз. Пока в ней только тема; дальше — серия, находки, настройки.
 */
export function ProfileSheet({ onClose }: { onClose: () => void }) {
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  // Сначала шторка уезжает вниз, потом убирается совсем.
  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => onCloseRef.current(), CLOSE_MS);
  }, []);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    // Свайп вниз: шторка едет за пальцем; отпустили далеко — закрыть, иначе — вернуть на место.
    let start: number | undefined;
    let drag = 0;
    const down = (e: PointerEvent) => {
      start = e.clientY;
      drag = 0;
    };
    const move = (e: PointerEvent) => {
      if (start === undefined) return;
      drag = Math.max(0, e.clientY - start);
      sheet.style.transition = 'none';
      sheet.style.translate = `0 ${drag}px`;
    };
    const up = () => {
      if (start === undefined) return;
      start = undefined;
      sheet.style.transition = '';
      sheet.style.translate = '';
      if (drag > SWIPE_CLOSE) close();
    };
    window.addEventListener('keydown', onKey);
    sheet.addEventListener('pointerdown', down);
    sheet.addEventListener('pointermove', move);
    sheet.addEventListener('pointerup', up);
    sheet.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('keydown', onKey);
      sheet.removeEventListener('pointerdown', down);
      sheet.removeEventListener('pointermove', move);
      sheet.removeEventListener('pointerup', up);
      sheet.removeEventListener('pointercancel', up);
    };
  }, [close]);

  return (
    <div className={closing ? `${styles.layer} ${styles.closing}` : styles.layer}>
      <button type="button" className={styles.backdrop} aria-label="Закрыть" onClick={close} />
      <dialog ref={sheetRef} open className={styles.sheet} aria-label="Профиль">
        <span className={styles.handle} aria-hidden="true" />
        <h2 className={styles.title}>Профиль</h2>
        <p className={styles.label}>Тема</p>
        <ThemeChoice />
      </dialog>
    </div>
  );
}
