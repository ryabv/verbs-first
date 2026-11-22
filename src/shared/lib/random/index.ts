/**
 * Случайность по ключу: один ключ — всегда один и тот же результат.
 * Варианты ответа в готовом уроке перемешиваются один раз и навсегда, а не при каждом открытии.
 */

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Генератор с зерном (mulberry32): одно зерно — одна и та же последовательность. */
export function seeded(seed: string): () => number {
  let a = hash(seed);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Перемешать (Фишер — Йейтс) по ключу: тот же ключ — тот же порядок. */
export function seededShuffle<T>(xs: readonly T[], seed: string): T[] {
  const rnd = seeded(seed);
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
