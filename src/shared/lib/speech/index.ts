import { speechText } from './text';

/**
 * Озвучка греческого текста.
 * 1) Заранее сгенерированный mp3 (scripts/generate-audio.ts, голос el-GR-NestorasNeural).
 * 2) Если файла нет (например, свой текст ученика) — браузерный греческий голос.
 * Чужим (не греческим) голосом не говорим никогда: он учит неправильному произношению.
 */

export { speechText } from './text';

type Manifest = Record<string, string>;

const AUDIO_BASE = `${process.env.BASE_URL}audio/`;
let manifestPromise: Promise<Manifest> | null = null;
let player: HTMLAudioElement | null = null;

function loadManifest(): Promise<Manifest> {
  manifestPromise ??= fetch(`${AUDIO_BASE}manifest.json`)
    .then((res) => (res.ok ? (res.json() as Promise<Manifest>) : {}))
    .catch(() => ({}));
  return manifestPromise;
}


/** Произнести текст. Возвращает false, если озвучить нечем. */
export async function speak(text: string): Promise<boolean> {
  const key = speechText(text);
  const file = (await loadManifest())[key];

  if (file) {
    window.speechSynthesis?.cancel();
    player?.pause();
    player = new Audio(AUDIO_BASE + file);
    await player.play().catch(() => undefined);
    return true;
  }

  return speakWithBrowserVoice(key);
}

// ---------- запасной вариант: голос браузера ----------

const VOICES_TIMEOUT_MS = 2000;
let voicePromise: Promise<SpeechSynthesisVoice | null> | null = null;

function isGreek(voice: SpeechSynthesisVoice): boolean {
  return voice.lang.toLowerCase().replace('_', '-').startsWith('el');
}

function loadGreekVoice(): Promise<SpeechSynthesisVoice | null> {
  if (!('speechSynthesis' in window)) return Promise.resolve(null);
  voicePromise ??= new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const done = () => {
      synth.removeEventListener('voiceschanged', onChange);
      clearTimeout(timer);
      const greek = synth.getVoices().filter(isGreek);
      resolve(greek.find((v) => v.localService) ?? greek[0] ?? null);
    };
    const onChange = () => synth.getVoices().length > 0 && done();
    const timer = setTimeout(done, VOICES_TIMEOUT_MS);
    synth.addEventListener('voiceschanged', onChange);
    if (synth.getVoices().length > 0) done();
  });
  return voicePromise;
}

async function speakWithBrowserVoice(text: string): Promise<boolean> {
  const voice = await loadGreekVoice();
  if (!voice) return false;
  player?.pause();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.85;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}
