import type { Letter } from '../model/types';

/**
 * 24 буквы современного греческого. Чтение — русскими буквами, приблизительно:
 * θ и ð — звуков нет в русском, обозначаем их греческими буквами и поясняем.
 * TODO: перед релизом — вычитка носителем.
 */
export const LETTERS: Letter[] = [
  { upper: 'Α', lower: 'α', name: 'άλφα', nameRu: 'а́льфа', sound: 'а', example: { greek: 'η αγάπη', russian: 'любовь', reading: 'и ага́пи' } },
  { upper: 'Β', lower: 'β', name: 'βήτα', nameRu: 'ви́та', sound: 'в', note: 'Не «б»! Звук «б» пишется как μπ.', example: { greek: 'το βιβλίο', russian: 'книга', reading: 'то вивли́о' } },
  {
    upper: 'Γ', lower: 'γ', name: 'γάμα', nameRu: 'га́ма', sound: 'γ / й',
    note: 'Мягкое «г» с придыханием, как южнорусское «г» в «ага». Перед ε, ι, η, υ, ει, οι — как «й».',
    example: { greek: 'η γάτα', russian: 'кошка', reading: 'и γа́та' },
  },
  {
    upper: 'Δ', lower: 'δ', name: 'δέλτα', nameRu: 'ðэ́льта', sound: 'ð',
    note: 'Как английское th в this: кончик языка между зубами, звонко. Не «д»! Звук «д» пишется как ντ.',
    example: { greek: 'δύο', russian: 'два', reading: 'ðи́о' },
  },
  { upper: 'Ε', lower: 'ε', name: 'έψιλον', nameRu: 'э́псилон', sound: 'э', note: 'Согласную перед собой не смягчает: νερό — «нэро́», не «неро́».', example: { greek: 'ένα', russian: 'один', reading: 'э́на' } },
  { upper: 'Ζ', lower: 'ζ', name: 'ζήτα', nameRu: 'зи́та', sound: 'з', example: { greek: 'η ζωή', russian: 'жизнь', reading: 'и зои́' } },
  { upper: 'Η', lower: 'η', name: 'ήτα', nameRu: 'и́та', sound: 'и', example: { greek: 'ο ήλιος', russian: 'солнце', reading: 'о и́льос' } },
  {
    upper: 'Θ', lower: 'θ', name: 'θήτα', nameRu: 'θи́та', sound: 'θ',
    note: 'Как английское th в think: кончик языка между зубами, глухо. Не «ф» и не «т».',
    example: { greek: 'η θάλασσα', russian: 'море', reading: 'и θа́ласа' },
  },
  { upper: 'Ι', lower: 'ι', name: 'γιώτα', nameRu: 'йо́та', sound: 'и', example: { greek: 'η ιδέα', russian: 'идея', reading: 'и иðэ́а' } },
  { upper: 'Κ', lower: 'κ', name: 'κάπα', nameRu: 'ка́па', sound: 'к', example: { greek: 'ο καφές', russian: 'кофе', reading: 'о кафэ́с' } },
  { upper: 'Λ', lower: 'λ', name: 'λάμδα', nameRu: 'ла́мðа', sound: 'л', example: { greek: 'το λεμόνι', russian: 'лимон', reading: 'то лэмо́ни' } },
  { upper: 'Μ', lower: 'μ', name: 'μι', speakAs: 'μ', nameRu: 'ми', sound: 'м', example: { greek: 'η μητέρα', russian: 'мать', reading: 'и митэ́ра' } },
  { upper: 'Ν', lower: 'ν', name: 'νι', speakAs: 'ν', nameRu: 'ни', sound: 'н', example: { greek: 'το νερό', russian: 'вода', reading: 'то нэро́' } },
  { upper: 'Ξ', lower: 'ξ', name: 'ξι', speakAs: 'ξ', nameRu: 'кси', sound: 'кс', example: { greek: 'το ξενοδοχείο', russian: 'гостиница', reading: 'то ксэноðохи́о' } },
  { upper: 'Ο', lower: 'ο', name: 'όμικρον', nameRu: 'о́микрон', sound: 'о', note: 'Всегда «о», даже без ударения — не «а», как в русском.', example: { greek: 'το όνομα', russian: 'имя', reading: 'то о́нома' } },
  { upper: 'Π', lower: 'π', name: 'πι', nameRu: 'пи', sound: 'п', example: { greek: 'ο πατέρας', russian: 'отец', reading: 'о патэ́рас' } },
  { upper: 'Ρ', lower: 'ρ', name: 'ρο', nameRu: 'ро', sound: 'р', example: { greek: 'το ρολόι', russian: 'часы', reading: 'то роло́и' } },
  {
    upper: 'Σ', lower: 'σ / ς', name: 'σίγμα', nameRu: 'си́гма', sound: 'с',
    note: 'В конце слова пишется ς. Перед β, γ, δ, λ, μ, ν, ρ звучит как «з».',
    example: { greek: 'η σαλάτα', russian: 'салат', reading: 'и сала́та' },
  },
  { upper: 'Τ', lower: 'τ', name: 'ταυ', nameRu: 'таф', sound: 'т', example: { greek: 'το τραπέζι', russian: 'стол', reading: 'то трапэ́зи' } },
  { upper: 'Υ', lower: 'υ', name: 'ύψιλον', nameRu: 'и́псилон', sound: 'и', example: { greek: 'ο ύπνος', russian: 'сон', reading: 'о и́пнос' } },
  { upper: 'Φ', lower: 'φ', name: 'φι', speakAs: 'φ', nameRu: 'фи', sound: 'ф', example: { greek: 'ο φίλος', russian: 'друг', reading: 'о фи́лос' } },
  { upper: 'Χ', lower: 'χ', name: 'χι', nameRu: 'хи', sound: 'х', note: 'Перед ε, ι — мягче, ближе к «хь».', example: { greek: 'το χέρι', russian: 'рука', reading: 'то хэ́ри' } },
  { upper: 'Ψ', lower: 'ψ', name: 'ψι', speakAs: 'ψ', nameRu: 'пси', sound: 'пс', example: { greek: 'το ψωμί', russian: 'хлеб', reading: 'то псоми́' } },
  { upper: 'Ω', lower: 'ω', name: 'ωμέγα', nameRu: 'омэ́га', sound: 'о', example: { greek: 'η ώρα', russian: 'час, время', reading: 'и о́ра' } },
];
