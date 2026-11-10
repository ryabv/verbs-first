import { useState } from 'react';
import { speak, useSpeechPending } from '@/shared/lib/speech';
import { SpeakerIcon, SpeakerOffIcon } from '@/shared/ui/icon';
import styles from './SpeakButton.module.css';

export function SpeakButton({ text }: { text: string }) {
  const [unavailable, setUnavailable] = useState(false);
  const pending = useSpeechPending(text);

  return (
    <button
      type="button"
      className={unavailable ? `${styles.speak} ${styles.off}` : styles.speak}
      onClick={async () => setUnavailable(!(await speak(text)))}
      aria-label={`Произнести: ${text}`}
      aria-busy={pending}
      title={unavailable ? 'Для этого текста нет озвучки, а в системе нет греческого голоса' : pending ? 'Загружается…' : 'Послушать'}
    >
      {unavailable ? <SpeakerOffIcon /> : <SpeakerIcon pending={pending} />}
    </button>
  );
}
