import type { DictEntry } from '../model/types';
import { PL_N } from './notes';

/**
 * Слова пословиц (src/entities/proverb): словарная форма, перевод и формы из пословиц.
 * Формы — явно, не генерируем правилами. Требует вычитки носителем.
 */
export const PROVERB_WORDS: DictEntry[] = [
  { greek: 'γεμίζω', russian: 'наполнять', forms: ['γεμίζει'] },
  { greek: 'βιάζομαι', russian: 'спешить', forms: ['βιάζεται'] },
  { greek: 'σκοντάφτω', russian: 'спотыкаться', forms: ['σκοντάφτει'] },
  { greek: 'φαίνομαι', russian: 'быть видным; казаться', forms: ['φαίνεται'] },
  { greek: 'ρωτάω', russian: 'спрашивать', forms: ['ρωτώντας'] },
  { greek: 'τσακίζω', russian: 'ломать', forms: ['τσακίζει'] },
  { greek: 'ζυμώνω', russian: 'месить (тесто)', forms: ['ζυμώσει'] },
  { greek: 'κοσκινίζω', russian: 'просеивать', forms: ['κοσκινίζει'] },
  { greek: 'το φασούλι', russian: 'фасолина', forms: ['φασούλι'] },
  { greek: 'το σακούλι', russian: 'мешок, мешочек', forms: ['σακούλι'] },
  { greek: 'η αγουρίδα', russian: 'незрелый виноград', forms: ['αγουρίδα'] },
  { greek: 'η αρχή', russian: 'начало', forms: ['αρχή'] },
  { greek: 'ο καπετάνιος', russian: 'капитан', forms: ['καπετάνιος'] },
  { greek: 'η φουρτούνα', russian: 'шторм, буря на море', forms: ['φουρτούνα'] },
  { greek: 'η γλώσσα', russian: 'язык', forms: ['γλώσσα'] },
  { greek: 'το κόκαλο', russian: 'кость', forms: ['κόκαλα'], why: { κόκαλα: PL_N } },
  { greek: 'όποιος', russian: 'кто (бы ни), тот, кто', forms: ['όποιος'] },
  { greek: 'σιγά', russian: 'тихо, медленно (σιγά σιγά — потихоньку)' },
  { greek: 'κάλλιο', russian: 'лучше (разг.)' },
  { greek: 'παρά', russian: 'чем (при сравнении)' },
];
