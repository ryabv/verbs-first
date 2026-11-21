import { PROLOGUE, type StoryPlace } from '../model/types';

/**
 * Места глав на карте Кипра (карта 2000×1280, координаты — из долготы и широты, см. pages/story/lib/cyprus.ts).
 * Порядок — по сюжету (docs/story/README.md). Места эпох 2–8 добавляются вместе с главами.
 */
export const STORY_PLACES: readonly StoryPlace[] = [
  // Пролог — курс чтения (алфавит): самолёт над морем заходит на посадку в Пафосе. Необязателен: глава 1 открыта и без него.
  { chapter: PROLOGUE, name: 'В самолёте: алфавит', x: 150, y: 1115, altitude: 55 },
  // Эпоха 1 «Первые люди».
  { chapter: 1, name: 'Куклия: дом тёти', x: 318, y: 1066 },
  { chapter: 2, name: 'Кухня тёти: находка', x: 336, y: 1080 },
  { chapter: 3, name: 'Шиллурокамбос: первые люди', x: 794, y: 1039 },
  { chapter: 4, name: 'Хирокития', x: 930, y: 971 },
];
