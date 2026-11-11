import type { FormNote } from '../model/types';

/** Частые пояснения «Почему так?»: каждое ставится к форме явно, не правилом. */
export const ACC_M: FormNote = { note: 'Винительный падеж (кого, что; после предлога): у мужского рода отпадает -ς.', rule: 'noun#accusative' };
export const PL_A: FormNote = { note: 'Множественное число: -α, -η → -ες.', rule: 'noun#plural' };
export const GEN_F: FormNote = { note: 'Родительный падеж — «чей»: у женского рода добавляется -ς.', rule: 'noun#genitive' };

export const ADJ_F: FormNote = { note: 'Прилагательное согласуется с существительным: женский род, -ος → -η.', rule: 'adjective#agreement' };
export const ADJ_N: FormNote = {
  note: 'Прилагательное согласуется с существительным: средний род, -ος → -ο (так же мужской род в винительном падеже).',
  rule: 'adjective#agreement',
};
export const ADJ_N_PL: FormNote = { note: 'Средний род во множественном числе: -α.', rule: 'adjective#agreement' };
export const ADJ_M_PL: FormNote = { note: 'Мужской род во множественном числе: -οι.', rule: 'adjective#agreement' };
export const ADJ_F_PL: FormNote = { note: 'Женский род во множественном числе: -ες.', rule: 'adjective#agreement' };

export const IND_M: FormNote = { note: 'Неопределённый артикль мужского рода: «один, какой-то».', rule: 'article#indefinite' };
export const IND_F: FormNote = { note: 'Неопределённый артикль женского рода: «одна, какая-то».', rule: 'article#indefinite' };
export const IND_N: FormNote = { note: 'Неопределённый артикль среднего рода: «одно, какое-то».', rule: 'article#indefinite' };
