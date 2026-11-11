import type { StoryChapter } from '@/entities/story';
import { analyzePhrase, lookupToken } from '@/features/card-add';

interface ChapterWord {
  greek: string;
  russian: string;
  kind: 'verb' | 'word';
}

/** Слова главы словарной формой (без имён и названий) — для «в карточки». */
export function chapterWords(chapter: StoryChapter): ChapterWord[] {
  const seen = new Map<string, ChapterWord>();
  for (const s of chapter.sentences) {
    for (const token of analyzePhrase(s.greek)) {
      const entry = token.isWord ? lookupToken(token) : undefined;
      if (!entry) continue;
      const head = entry.greek.split(/\s+/).at(-1) ?? '';
      if (entry.kind === 'word' && head[0] !== head[0]?.toLowerCase()) continue;
      if (!seen.has(entry.greek)) seen.set(entry.greek, entry);
    }
  }
  return [...seen.values()];
}
