import type { Combination } from '../model/types';

/** Сочетания букв, которые читаются не так, как буквы по отдельности. */
export const COMBINATIONS: Combination[] = [
  {
    letters: 'αι', sound: 'э', rule: 'Две гласные — один звук «э».',
    examples: [{ greek: 'και', russian: 'и', reading: 'кэ' }, { greek: 'είναι', russian: 'есть, является', reading: 'и́нэ' }],
  },
  {
    letters: 'ει, οι, υι', sound: 'и', rule: 'Все три — просто «и». В греческом шесть способов написать «и»: η, ι, υ, ει, οι, υι.',
    examples: [{ greek: 'είμαι', russian: 'я есть', reading: 'и́мэ' }, { greek: 'οι φίλοι', russian: 'друзья', reading: 'и фи́ли' }],
  },
  {
    letters: 'ου', sound: 'у', rule: 'Две буквы — один звук «у».',
    examples: [{ greek: 'η μουσική', russian: 'музыка', reading: 'и мусики́' }, { greek: 'δουλεύω', russian: 'работаю', reading: 'ðулэ́во' }],
  },
  {
    letters: 'αυ, ευ', sound: 'ав, эв / аф, эф',
    rule: 'Перед гласной и звонкой согласной — «ав», «эв»; перед глухой (κ, π, τ, φ, θ, χ, σ, ξ, ψ) — «аф», «эф».',
    examples: [
      { greek: 'αύριο', russian: 'завтра', reading: 'а́врио' },
      { greek: 'αυτός', russian: 'он', reading: 'афто́с' },
      { greek: 'ευχαριστώ', russian: 'спасибо', reading: 'эфхаристо́' },
    ],
  },
  {
    letters: 'μπ', sound: 'б / мб', rule: 'В начале слова — «б», внутри слова — «мб» или просто «б».',
    examples: [{ greek: 'η μπίρα', russian: 'пиво', reading: 'и би́ра' }, { greek: 'η λάμπα', russian: 'лампа', reading: 'и ла́мба' }],
  },
  {
    letters: 'ντ', sound: 'д / нд', rule: 'В начале слова — «д», внутри слова — «нд».',
    examples: [{ greek: 'η ντομάτα', russian: 'помидор', reading: 'и дома́та' }, { greek: 'πέντε', russian: 'пять', reading: 'пэ́ндэ' }],
  },
  {
    letters: 'γκ, γγ', sound: 'г / нг', rule: 'γκ в начале слова — «г», внутри — «нг». γγ — всегда «нг».',
    examples: [{ greek: 'το γκαράζ', russian: 'гараж', reading: 'то гара́з' }, { greek: 'η Αγγλία', russian: 'Англия', reading: 'и англи́а' }],
  },
  {
    letters: 'τσ, τζ', sound: 'ц, дз', rule: 'τσ — «ц», τζ — «дз».',
    examples: [{ greek: 'το τσάι', russian: 'чай', reading: 'то ца́и' }, { greek: 'το τζατζίκι', russian: 'дзадзики', reading: 'то дзадзи́ки' }],
  },
  {
    letters: 'γε, γι, γει…', sound: 'йэ, йи', rule: 'γ перед ε, ι, η, υ, ει, οι читается как «й». για, γιο — «йа», «йо».',
    examples: [{ greek: 'γεια', russian: 'привет', reading: 'йа' }, { greek: 'η γιαγιά', russian: 'бабушка', reading: 'и йайа́' }],
  },
  {
    letters: 'σ + звонкая', sound: 'з', rule: 'σ перед β, γ, δ, λ, μ, ν, ρ звучит как «з».',
    examples: [{ greek: 'ο κόσμος', russian: 'мир; люди', reading: 'о ко́змос' }],
  },
  {
    letters: 'ια, ιο, ιου', sound: 'я, ё, ю', rule: 'После согласной ι + гласная часто сливаются в один слог: «ья», «ьо».',
    examples: [{ greek: 'ποιος', russian: 'кто, который', reading: 'пьос' }, { greek: 'ο ήλιος', russian: 'солнце', reading: 'о и́льос' }],
  },
  {
    letters: 'λλ, σσ, ππ…', sound: 'одна буква', rule: 'Двойные согласные читаются как одна.',
    examples: [{ greek: 'η θάλασσα', russian: 'море', reading: 'и θа́ласа' }, { greek: 'άλλος', russian: 'другой', reading: 'а́лос' }],
  },
];
