/** Перемешать (Фишер — Йетс), не трогая исходный массив. */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]!;
