import type { MouseEvent } from 'react';
import styles from './GreekKeyboard.module.css';

const ROWS = [
  ['ς', 'ε', 'ρ', 'τ', 'υ', 'θ', 'ι', 'ο', 'π'],
  ['α', 'σ', 'δ', 'φ', 'γ', 'η', 'ξ', 'κ', 'λ'],
  ['ζ', 'χ', 'ψ', 'ω', 'β', 'ν', 'μ'],
  ['ά', 'έ', 'ή', 'ί', 'ό', 'ύ', 'ώ', ';'],
];

interface GreekKeyboardProps {
  open: boolean;
  onToggle: () => void;
  onKey: (char: string) => void;
  onBackspace: () => void;
}

// Не забираем фокус у поля ввода: курсор остаётся в поле, Enter по-прежнему отправляет ответ.
const keepFocus = (e: MouseEvent) => e.preventDefault();

/** Экранная клавиатура для тех, у кого не установлена греческая раскладка. Сворачивается. */
export function GreekKeyboard({ open, onToggle, onKey, onBackspace }: GreekKeyboardProps) {
  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.toggle} onClick={onToggle} onMouseDown={keepFocus} aria-expanded={open}>
        {open ? 'Скрыть греческие буквы' : 'Нет греческой раскладки? Буквы на экране'}
      </button>

      {open && (
        <div className={styles.keyboard}>
          {ROWS.map((row, i) => (
            <div key={i} className={styles.row}>
              {row.map((char) => (
                <button
                  key={char}
                  type="button"
                  className={styles.key}
                  onMouseDown={keepFocus}
                  onClick={() => onKey(char)}
                >
                  {char}
                </button>
              ))}
            </div>
          ))}
          <div className={styles.row}>
            <button type="button" className={`${styles.key} ${styles.wide}`} onMouseDown={keepFocus} onClick={() => onKey(' ')}>
              пробел
            </button>
            <button
              type="button"
              className={`${styles.key} ${styles.back}`}
              onMouseDown={keepFocus}
              onClick={onBackspace}
              aria-label="Стереть"
            >
              ⌫
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
