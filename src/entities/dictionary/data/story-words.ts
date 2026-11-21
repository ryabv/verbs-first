import type { DictEntry, FormNote } from '../model/types';
import { ACC_M, ADJ_F, ADJ_N, ADJ_N_PL, GEN_F, PL_A } from './notes';

const PL_O: FormNote = { note: 'Множественное число: -ο, -ι → -α.', rule: 'noun#plural' };

/**
 * Слова раздела «История» (src/entities/story): словарная форма, перевод и формы из глав.
 * Формы — явно, не генерируем правилами. Требует вычитки носителем.
 */
export const STORY_WORDS: DictEntry[] = [
  // Глава 1
  { greek: 'η μεταφράστρια', russian: 'переводчица' },
  { greek: 'ο συμβολαιογράφος', russian: 'нотариус', forms: ['συμβολαιογράφο'], why: { συμβολαιογράφο: ACC_M } },
  { greek: 'η κυρία', russian: 'госпожа; женщина, дама', forms: ['κυρίες'], why: { κυρίες: PL_A } },
  { greek: 'η θεία', russian: 'тётя', forms: ['θείας'], why: { θείας: GEN_F } },
  { greek: 'η μαμά', russian: 'мама', forms: ['μαμάς'], why: { μαμάς: GEN_F } },
  { greek: 'το γράμμα', russian: 'письмо; буква', forms: ['γράμματα'], why: { γράμματα: { note: 'Множественное число: -μα → -ματα.', rule: 'noun#plural' } } },
  { greek: 'το λιμάνι', russian: 'порт, гавань' },
  { greek: 'το φόρεμα', russian: 'платье' },
  { greek: 'η γειτόνισσα', russian: 'соседка' },
  { greek: 'το δωμάτιο', russian: 'комната', forms: ['δωμάτια'], why: { δωμάτια: { note: 'Множественное число: -ο → -α.', rule: 'noun#plural' } } },
  { greek: 'η κουζίνα', russian: 'кухня', forms: ['κουζίνας'], why: { κουζίνας: GEN_F } },
  { greek: 'το μυστικό', russian: 'тайна, секрет' },
  { greek: 'το κρεβάτι', russian: 'кровать, постель' },
  { greek: 'ο γάτος', russian: 'кот' },
  { greek: 'η πόρτα', russian: 'дверь' },
  { greek: 'το κολάρο', russian: 'ошейник' },
  {
    greek: 'ο Ερμής',
    russian: 'Эрмис (Гермес) — кот тёти Элени',
    forms: ['Ερμή'],
    why: { Ερμή: { note: 'Обращение: у мужских имён на -ής, -ας отпадает -ς, артикля нет.', rule: 'noun#vocative' } },
  },
  { greek: 'η ερμηνεία', russian: 'толкование; исполнение' },
  { greek: 'ο διερμηνέας', russian: 'устный переводчик' },
  { greek: 'μαύρος', russian: 'чёрный', forms: ['μαύρη', 'μαύρο'], why: { μαύρη: ADJ_F, μαύρο: ADJ_N } },
  { greek: 'άσπρος', russian: 'белый', forms: ['άσπρη', 'άσπρο'], why: { άσπρη: ADJ_F, άσπρο: ADJ_N } },
  { greek: 'κρυμμένος', russian: 'спрятанный', forms: ['κρυμμένη', 'κρυμμένο'], why: { κρυμμένη: ADJ_F, κρυμμένο: ADJ_N } },
  { greek: 'μόνος', russian: 'один, одинокий', forms: ['μόνη'], why: { μόνη: ADJ_F } },
  { greek: 'αυτό', russian: 'это; оно' },
  { greek: 'αργά', russian: 'поздно; медленно' },
  { greek: 'η ανιψιά', russian: 'племянница' },
  { greek: 'το χωριό', russian: 'деревня' },
  { greek: 'νιάου', russian: 'мяу' },
  { greek: 'μπράβο', russian: 'молодец, браво' },
  // Глава 2
  { greek: 'το βουνό', russian: 'гора', forms: ['βουνά'], why: { βουνά: PL_O } },
  { greek: 'το μουσείο', russian: 'музей' },
  { greek: 'ο θόρυβος', russian: 'шум', forms: ['θόρυβο'], why: { θόρυβο: ACC_M } },
  { greek: 'το ντουλάπι', russian: 'шкафчик' },
  { greek: 'το ειδώλιο', russian: 'фигурка, статуэтка' },
  { greek: 'το χέρι', russian: 'рука', forms: ['χέρια'], why: { χέρια: PL_O } },
  { greek: 'η σελίδα', russian: 'страница' },
  { greek: 'πέτρινος', russian: 'каменный', forms: ['πέτρινη', 'πέτρινο'], why: { πέτρινη: ADJ_F, πέτρινο: ADJ_N } },
  { greek: 'ανοιχτός', russian: 'открытый, раскрытый', forms: ['ανοιχτή', 'ανοιχτό', 'ανοιχτά'], why: { ανοιχτή: ADJ_F, ανοιχτό: ADJ_N, ανοιχτά: ADJ_N_PL } },
  { greek: 'εδώ', russian: 'здесь' },
  // Места Кипра
  {
    greek: 'η Κύπρος',
    russian: 'Кипр',
    forms: ['Κύπρο'],
    why: { Κύπρο: { note: 'Винительный падеж (после предлога): -ς отпадает. Κύπρος — женского рода, хотя на -ος.', rule: 'noun#accusative' } },
  },
  {
    greek: 'η Πάφος',
    russian: 'Пафос (город на Кипре)',
    forms: ['Πάφο', 'Πάφου'],
    why: {
      Πάφο: { note: 'Винительный падеж (после предлога): -ς отпадает. Πάφος — женского рода, хотя на -ος.', rule: 'noun#accusative' },
      Πάφου: { note: 'Родительный падеж — «чей»: -ος → -ου.', rule: 'noun#genitive' },
    },
  },
  { greek: 'τα Κούκλια', russian: 'Куклия (деревня рядом с Пафосом)' },
  { greek: 'η Λευκωσία', russian: 'Никосия (столица Кипра)' },
  // Имена и места (вымышленные)
  { greek: 'η Μόσχα', russian: 'Москва' },
  { greek: 'η Μαυρίδη', russian: 'Мавриди (фамилия)' },
  { greek: 'η Μαρίνα', russian: 'Марина' },
  { greek: 'η Ρούλα', russian: 'Рула' },
];
