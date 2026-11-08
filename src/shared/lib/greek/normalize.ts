const COMBINING_MARKS = /[̀-ͯ]/g;
const PUNCTUATION = /[;;?!.,·:«»"'()\-–—]/g;

/** Нижний регистр, финальная сигма → σ, схлопнутые пробелы, без пунктуации. */
export function normalizeGreek(input: string): string {
  return input
    .normalize('NFC')
    .toLowerCase()
    .replace(/ς/g, 'σ')
    .replace(PUNCTUATION, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** То же самое, но ещё и без ударений и диерезиса. */
export function stripAccents(input: string): string {
  return normalizeGreek(input).normalize('NFD').replace(COMBINING_MARKS, '').normalize('NFC');
}
