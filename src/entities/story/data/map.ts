import type { StoryPlace } from '../model/types';

/**
 * Места глав на карте острова Ανεμούσα (вымышленный). Порядок — по сюжету (docs/story/README.md);
 * места будущих глав — план, могут сдвигаться, пока главы пишутся.
 */
export const STORY_PLACES: readonly StoryPlace[] = [
  { chapter: 1, name: 'Порт и дом тёти', x: 455, y: 538 },
  { chapter: 2, name: 'Деревня', x: 345, y: 420 },
  { chapter: 3, name: 'Город и библиотека', x: 618, y: 452 },
  { chapter: 4, name: 'Кафенио', x: 520, y: 372 },
  { chapter: 5, name: 'Звонок домой', x: 500, y: 470 },
  { chapter: 6, name: 'Маяк', x: 864, y: 292 },
  { chapter: 7, name: 'Пляж', x: 290, y: 524 },
  { chapter: 8, name: 'Холм с вышкой', x: 420, y: 262 },
  { chapter: 9, name: 'Часовня', x: 280, y: 318 },
  { chapter: 10, name: 'За маяком', x: 800, y: 210 },
  { chapter: 11, name: 'Северный берег', x: 650, y: 162 },
  { chapter: 12, name: 'Пирей', x: 960, y: 585, offMap: true },
  { chapter: 13, name: 'Рынок', x: 690, y: 495 },
  { chapter: 14, name: 'Оливковая роща', x: 205, y: 385 },
  { chapter: 15, name: 'Старая пристань', x: 692, y: 395 },
  { chapter: 16, name: 'Мэрия', x: 585, y: 520 },
];
