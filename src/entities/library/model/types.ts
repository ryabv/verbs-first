import type { ReadingText } from '@/entities/lesson/@x/library';

/**
 * Текст раздела «Тексты»: читать для удовольствия. level — после какого урока он по силам
 * (0 — только читаю, после алфавита). Это рекомендация, а не замок.
 */
export interface LibraryText extends ReadingText {
  level: number;
  /** Жанр: «История», «Миф», «Письмо»… */
  genre: string;
  /** Одна строка по-русски: о чём текст. */
  summary: string;
}
