import { TranslateIcon } from '@/shared/ui/icon';
import styles from './Story.module.css';

/** Кнопка «перевод» рядом с озвучкой: показать или скрыть русский перевод предложения. */
export function TranslateButton({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={styles.translateBtn}
      aria-pressed={shown}
      onClick={onToggle}
      aria-label={shown ? 'Скрыть перевод' : 'Показать перевод'}
      title={shown ? 'Скрыть перевод' : 'Перевод'}
    >
      <TranslateIcon />
    </button>
  );
}
