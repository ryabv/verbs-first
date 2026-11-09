/** Примеры к разделу «Ударение и знаки»: озвучиваются и добавляются в карточки. */
export interface StressExample {
  greek: string;
  russian: string;
  /** Чтение русскими буквами. */
  reading: string;
}

export const STRESS_EXAMPLES = {
  kalimera: { greek: 'καλημέρα', russian: 'доброе утро, здравствуйте', reading: 'калимэ́ра' },
  efcharisto: { greek: 'ευχαριστώ', russian: 'спасибо', reading: 'эфхаристо́' },
  pote: { greek: 'πότε', russian: 'когда?', reading: 'по́тэ' },
  potee: { greek: 'ποτέ', russian: 'никогда', reading: 'потэ́' },
  pou: { greek: 'πού', russian: 'где?', reading: 'пу' },
  pouRel: { greek: 'που', russian: 'который (без ударения)', reading: 'пу' },
  anna: { greek: 'Άννα', russian: 'Анна', reading: 'а́нна' },
  ela: { greek: 'Έλα!', russian: 'Иди сюда! Давай!', reading: 'э́ла' },
  troley: { greek: 'το τρόλεϊ', russian: 'троллейбус', reading: 'то тро́лэи' },
  kaiki: { greek: 'το καΐκι', russian: 'лодка, каик', reading: 'то каи́ки' },
  tsai: { greek: 'το τσάι', russian: 'чай', reading: 'то ца́и' },
  kai: { greek: 'και', russian: 'и', reading: 'кэ' },
  filos: { greek: 'ο φίλος', russian: 'друг', reading: 'о фи́лос' },
  simera: { greek: 'σήμερα', russian: 'сегодня', reading: 'си́мэра' },
  tiKaneis: { greek: 'Τι κάνεις;', russian: 'Как дела?', reading: 'ти ка́нис' },
  aderfia: {
    greek: 'Έχω δύο αδέρφια· έναν αδερφό και μια αδερφή.',
    russian: 'У меня двое: брат и сестра.',
    reading: 'э́хо ðи́о аðэ́рфья· э́нан аðэрфо́ кэ мья аðэрфи́',
  },
} satisfies Record<string, StressExample>;
