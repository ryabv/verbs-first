import type { DictEntry } from '../model/types';
import { ACC_M, ADJ_F, ADJ_N, GEN_F, PL_A } from './notes';

/**
 * Слова раздела «История» (src/entities/story): словарная форма, перевод и формы из глав.
 * Формы — явно, не генерируем правилами. Требует вычитки носителем.
 */
export const STORY_WORDS: DictEntry[] = [
  // Глава 1
  { greek: 'η μεταφράστρια', russian: 'переводчица' },
  { greek: 'ο συμβολαιογράφος', russian: 'нотариус', forms: ['συμβολαιογράφο'], why: { συμβολαιογράφο: ACC_M } },
  { greek: 'η κυρία', russian: 'госпожа; женщина, дама', forms: ['κυρίες'], why: { κυρίες: PL_A } },
  { greek: 'η θεία', russian: 'тётя' },
  { greek: 'η μαμά', russian: 'мама', forms: ['μαμάς'], why: { μαμάς: GEN_F } },
  { greek: 'το γράμμα', russian: 'письмо; буква', forms: ['γράμματα'], why: { γράμματα: { note: 'Множественное число: -μα → -ματα.', rule: 'noun#plural' } } },
  { greek: 'το λιμάνι', russian: 'порт, гавань' },
  { greek: 'το φόρεμα', russian: 'платье' },
  { greek: 'η γειτόνισσα', russian: 'соседка' },
  { greek: 'το δωμάτιο', russian: 'комната', forms: ['δωμάτια'], why: { δωμάτια: { note: 'Множественное число: -ο → -α.', rule: 'noun#plural' } } },
  { greek: 'η κουζίνα', russian: 'кухня', forms: ['κουζίνας'], why: { κουζίνας: GEN_F } },
  { greek: 'το μυστικό', russian: 'тайна, секрет' },
  { greek: 'το κρεβάτι', russian: 'кровать, постель' },
  { greek: 'μαύρος', russian: 'чёрный', forms: ['μαύρη', 'μαύρο'], why: { μαύρη: ADJ_F, μαύρο: ADJ_N } },
  { greek: 'άσπρος', russian: 'белый', forms: ['άσπρη', 'άσπρο'], why: { άσπρη: ADJ_F, άσπρο: ADJ_N } },
  { greek: 'κρυμμένος', russian: 'спрятанный', forms: ['κρυμμένη', 'κρυμμένο'], why: { κρυμμένη: ADJ_F, κρυμμένο: ADJ_N } },
  { greek: 'μόνος', russian: 'один, одинокий', forms: ['μόνη'], why: { μόνη: ADJ_F } },
  { greek: 'αυτό', russian: 'это; оно' },
  { greek: 'αργά', russian: 'поздно; медленно' },
  // Имена и места (вымышленные)
  { greek: 'η Μόσχα', russian: 'Москва' },
  { greek: 'η Μαυρίδη', russian: 'Мавриди (фамилия)' },
  { greek: 'η Ανεμούσα', russian: 'Анемуса (вымышленный остров)' },
  { greek: 'η Μαρίνα', russian: 'Марина' },
  { greek: 'η Ρούλα', russian: 'Рула' },
];
