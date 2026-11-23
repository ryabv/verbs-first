import { useState } from 'react';
import { speak, speechText, stopSpeech, useSpeech, useSpeechPending } from '@/shared/lib/speech';
import { SpeakerIcon, SpeakerOffIcon, StopIcon } from '@/shared/ui/icon';
import styles from './SpeakButton.module.css';

/** `label` — кнопка с подписью («Прослушать»), а не одним значком: там, где звук и есть задание. */
export function SpeakButton({ text, label }: { text: string; label?: string }) {
  const [unavailable, setUnavailable] = useState(false);
  const pending = useSpeechPending(text);
  // Пока звучит этот текст — кнопка «горит» и останавливает звук.
  const playing = useSpeech()?.key === speechText(text);

  return (
    <button
      type="button"
      className={[styles.speak, label && styles.labeled, unavailable && styles.off].filter(Boolean).join(' ')}
      onClick={async () => {
        if (playing) return stopSpeech();
        setUnavailable(!(await speak(text)));
      }}
      aria-label={playing ? 'Остановить озвучку' : label ? undefined : `Произнести: ${text}`}
      aria-busy={pending}
      aria-pressed={playing}
      title={unavailable ? 'Для этого текста нет озвучки, а в системе нет греческого голоса' : pending ? 'Загружается…' : playing ? 'Остановить' : 'Послушать'}
    >
      {unavailable ? <SpeakerOffIcon /> : playing ? <StopIcon /> : <SpeakerIcon pending={pending} />}
      {label && <span>{playing ? 'Остановить' : label}</span>}
    </button>
  );
}
