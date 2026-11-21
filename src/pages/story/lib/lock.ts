import { chapterRead, STORY_CHAPTERS, unpracticed, type StoryChapter, type useStoryProgress } from '@/entities/story';

type Progress = ReturnType<typeof useStoryProgress>;

/** Почему глава закрыта и что сделать: дочитать прошлую главу или закрепить главы прошлой эпохи (порог эпохи). */
export function lockReason(chapter: StoryChapter, progress: Progress): { text: string; to: number } {
  const i = STORY_CHAPTERS.findIndex((c) => c.id === chapter.id);
  const prev = STORY_CHAPTERS[i - 1];
  if (!prev) return { text: '', to: chapter.id };
  if (!chapterRead(progress[prev.id] ?? {})) {
    return { text: `Глава ${chapter.id} откроется, когда вы дочитаете главу ${prev.id}.`, to: prev.id };
  }
  const left = unpracticed(prev.epoch, STORY_CHAPTERS, progress);
  const list = left.map((c) => c.id).join(', ');
  return {
    text: `Эпоха ${chapter.epoch} откроется, когда все главы эпохи ${prev.epoch} закреплены хотя бы на лёгком уровне. Осталось закрепить: ${left.length > 1 ? 'главы' : 'главу'} ${list}.`,
    to: left[0]?.id ?? prev.id,
  };
}
