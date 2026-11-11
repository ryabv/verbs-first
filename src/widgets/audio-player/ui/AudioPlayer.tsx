import type { CSSProperties } from 'react';
import { toggleSpeechPause, useSpeech } from '@/shared/lib/speech';
import { PauseIcon, PlayIcon } from '@/shared/ui/icon';
import styles from './AudioPlayer.module.css';

/**
 * Плеер в углу страницы: одна круглая кнопка пауза/продолжить, прогресс — кольцо вокруг неё.
 * Виден всегда; когда ничего не звучит — бледный и неактивный. Общий для всего сайта:
 * звук не теряется и при переходе на другую страницу.
 */
export function AudioPlayer() {
  const speech = useSpeech();
  const paused = speech?.paused ?? true;
  // У голоса браузера длительность неизвестна — кольцо не заполняется.
  const part = speech && speech.duration > 0 ? Math.min(1, speech.time / speech.duration) : 0;
  const label = !speech ? 'Озвучка: сейчас ничего не звучит' : paused ? 'Продолжить озвучку' : 'Пауза';
  return (
    <button
      type="button"
      className={styles.player}
      style={{ '--part': part } as CSSProperties}
      onClick={toggleSpeechPause}
      disabled={!speech}
      aria-label={label}
      title={label}
    >
      <span className={styles.inner}>{speech && !paused ? <PauseIcon /> : <PlayIcon />}</span>
    </button>
  );
}
