import { useState } from 'react';
import { speak } from '@/shared/lib/speech';
import { SpeakerIcon, SpeakerOffIcon } from '@/shared/ui/icon';
import styles from './SpeakButton.module.css';

export function SpeakButton({ text }: { text: string }) {
  const [unavailable, setUnavailable] = useState(false);

  return (
    <button
      type="button"
      className={unavailable ? `${styles.speak} ${styles.off}` : styles.speak}
      onClick={async () => setUnavailable(!(await speak(text)))}
      aria-label={`Произнести: ${text}`}
      title={unavailable ? 'Для этого текста нет озвучки, а в системе нет греческого голоса' : 'Послушать'}
    >
      {unavailable ? <SpeakerOffIcon /> : <SpeakerIcon />}
    </button>
  );
}
