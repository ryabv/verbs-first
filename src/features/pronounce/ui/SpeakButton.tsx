import { useState } from 'react';
import { speak, speechText, stopSpeech, useSpeech, useSpeechPending } from '@/shared/lib/speech';
import { SpeakerIcon, SpeakerOffIcon, StopIcon } from '@/shared/ui/icon';
import styles from './SpeakButton.module.css';

export function SpeakButton({ text }: { text: string }) {
  const [unavailable, setUnavailable] = useState(false);
  const pending = useSpeechPending(text);
  // Пока звучит этот текст — кнопка «горит» и останавливает звук.
  const playing = useSpeech()?.key === speechText(text);

  return (
    <button
      type="button"
      className={unavailable ? `${styles.speak} ${styles.off}` : styles.speak}
      onClick={async () => {
        if (playing) return stopSpeech();
        setUnavailable(!(await speak(text)));
      }}
      aria-label={playing ? 'Остановить озвучку' : `Произнести: ${text}`}
      aria-busy={pending}
      aria-pressed={playing}
      title={unavailable ? 'Для этого текста нет озвучки, а в системе нет греческого голоса' : pending ? 'Загружается…' : playing ? 'Остановить' : 'Послушать'}
    >
      {unavailable ? <SpeakerOffIcon /> : playing ? <StopIcon /> : <SpeakerIcon pending={pending} />}
    </button>
  );
}
