import type { QuizItem } from '../model/types';
import { COMBINATIONS } from './combinations';
import { LETTERS } from './letters';

/** «Буква → звук»: все буквы и основные сочетания. Неверные варианты — звуки других вопросов. */
export const SOUND_QUIZ: QuizItem[] = [
  ...LETTERS.map((l) => ({
    prompt: `${l.upper} ${l.lower}`,
    speak: l.speakAs ?? l.name,
    answer: l.sound,
    note: l.note ?? `${l.nameRu}: ${l.example.greek} — ${l.example.reading}`,
  })),
  ...COMBINATIONS.filter((c) => !c.letters.includes('…') && !c.letters.includes('+')).map((c) => ({
    prompt: c.letters,
    answer: c.sound,
    note: c.rule,
  })),
];

/**
 * «Как читается слово»: варианты составлены вручную — это типичные ошибки
 * (читать по буквам, путать ударение, β как «б», δ как «д»).
 */
export const WORD_QUIZ: QuizItem[] = [
  { prompt: 'και', answer: 'кэ', distractors: ['ка́и', 'ки', 'ка'], note: 'αι = «э».' },
  { prompt: 'είναι', answer: 'и́нэ', distractors: ['эи́наи', 'и́наи', 'эйна́'], note: 'ει = «и», αι = «э».' },
  { prompt: 'η μουσική', answer: 'и мусики́', distractors: ['и моусики́', 'э мисики́', 'и мусика́'], note: 'ου = «у», η = «и».' },
  { prompt: 'αύριο', answer: 'а́врио', distractors: ['а́урио', 'а́фрио', 'ау́рио'], note: 'αυ перед звонкой ρ — «ав».' },
  { prompt: 'ευχαριστώ', answer: 'эфхаристо́', distractors: ['эвхаристо́', 'эухаристо́', 'эфхари́сто'], note: 'ευ перед глухой χ — «эф».' },
  { prompt: 'η μπίρα', answer: 'и би́ра', distractors: ['и мпи́ра', 'и пи́ра', 'и ми́ра'], note: 'μπ в начале слова — «б».' },
  { prompt: 'πέντε', answer: 'пэ́ндэ', distractors: ['пэ́нтэ', 'пэ́дэ', 'пэнтэ́'], note: 'ντ внутри слова — «нд».' },
  { prompt: 'το τσάι', answer: 'то ца́и', distractors: ['то тса́и', 'то ча́й', 'то са́и'], note: 'τσ = «ц».' },
  { prompt: 'γεια', answer: 'йа', distractors: ['гэ́йа', 'гья', 'гиа́'], note: 'γ перед ε — «й», ει = «и», вместе с α — «йа».' },
  { prompt: 'ο κόσμος', answer: 'о ко́змос', distractors: ['о ко́смос', 'о ко́шмос', 'о космо́с'], note: 'σ перед μ звучит как «з».' },
  { prompt: 'η θάλασσα', answer: 'и θа́ласа', distractors: ['и та́ласса', 'и фа́ласа', 'и ðа́ласа'], note: 'θ — глухой «th», σσ — одна «с».' },
  { prompt: 'οι φίλοι', answer: 'и фи́ли', distractors: ['ой фи́лой', 'о фи́ли', 'и фило́й'], note: 'οι = «и».' },
  { prompt: 'το βιβλίο', answer: 'то вивли́о', distractors: ['то библи́о', 'то вибли́о', 'то ви́влио'], note: 'β = «в».' },
  { prompt: 'δύο', answer: 'ðи́о', distractors: ['ду́о', 'ди́о', 'ðуо́'], note: 'δ — звонкий «th», υ = «и».' },
  { prompt: 'το τζατζίκι', answer: 'то дзадзи́ки', distractors: ['то тзатзи́ки', 'то цаци́ки', 'то джаджи́ки'], note: 'τζ = «дз».' },
  { prompt: 'ποτέ', answer: 'потэ́', distractors: ['по́тэ', 'пото́', 'пэ́тэ'], note: 'Ударение меняет смысл: ποτέ — «никогда», πότε — «когда?».' },
];
