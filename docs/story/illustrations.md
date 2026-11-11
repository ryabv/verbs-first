# Иллюстрации мест «Истории»

Картинка места показывается в карточке главы на карте острова (`/story`), когда глава написана.
Остров Ανεμούσα вымышленный: на картинках — не реальные места, без надписей и узнаваемых достопримечательностей.

## Как добавить

1. Сгенерировать картинку по промпту ниже: **общий стиль + описание места**. Формат 16:9.
   Генератор — с лицензией, разрешающей использование на сайте (контент проекта — только собственный).
2. Ужать до **1200×675, webp, ~200–300 КБ** (карточка ~380 px шириной, этого хватает и для ретины):
   `cwebp -q 74 -resize 1200 675 in.png -o chapter-01.webp` или squoosh.app.
3. Положить в `public/story/chapter-NN.webp`.
4. В `src/entities/story/data/chapter-NN.ts` — поле `image: { file: 'chapter-NN.webp', alt: '…' }`
   (`alt` — по-русски, что на картинке). Пока файла нет, карточка просто показывается без картинки.

Картинки будущих глав не показываются, пока глава не написана, — сюжет не выдаётся.

Готово: глава 1 — `chapter-01.webp`; для главы 2 картинка уже лежит (`chapter-02.webp`), `image` добавить, когда глава будет написана.

## Общий стиль (добавлять к каждому промпту)

```
Hand-drawn storybook illustration, fine ink linework with soft watercolor washes on aged cream paper,
high three-quarter bird's-eye view, richly detailed, muted natural palette: Aegean blue-grey sea,
olive and pine greens, ochre earth, whitewashed Cycladic houses with blue doors and shutters,
soft warm morning light, calm and slightly mysterious mood. A small fictional Greek island.
No text, no lettering, no signs, no watermark, no logos. People tiny and far away or absent. 16:9.
```

## Места

| Глава | Место | Описание для промпта |
|---|---|---|
| 1 | Порт и дом тёти | A small harbour in a sheltered bay: stone quay, a few wooden fishing boats, a ferry approaching, whitewashed houses climbing the slope, one small white house with blue shutters slightly apart, close to the sea. |
| 2 | Деревня | A hillside village of white houses among patchwork fields and olive trees, narrow stepped lanes, a fisherman's boat pulled up on a pebble beach below. |
| 3 | Город и библиотека | The island's small town: a square with an old neoclassical library building, a bus stop, cafés with awnings, red-tiled and white roofs around. |
| 4 | Кафенио | A village square with an old kafeneio under a huge plane tree, wooden chairs and small tables, men playing backgammon, a church bell tower nearby. |
| 5 | Звонок домой | Evening: a terrace of a small white house above the bay, a table with a lamp and a telephone, lights of the harbour below, first stars. |
| 6 | Маяк | A lonely white lighthouse on a long rocky cape, a winding dirt road to it, waves breaking on the rocks, wide open sea. |
| 7 | Пляж | A lagoon behind a long sandy spit, turquoise shallow water, the open sea on the other side, a few umbrellas far away, dunes with low shrubs. |
| 8 | Холм с вышкой | A bare hill above the island with an old radio mast and a small abandoned broadcasting hut, the whole island and the sea visible below. |
| 9 | Часовня | A tiny white chapel with a blue dome on a rocky hilltop, cypress trees, a stone path, goats grazing among herbs. |
| 10 | За маяком | A wild rocky coast beyond the lighthouse, a narrow path along the cliffs leading to an old wooden door set into the rock. |
| 11 | Северный берег | The windy northern coast: dark pine forest down to the water, rough sea with white crests, storm clouds gathering. |
| 12 | Пирей | A big busy mainland port: large ferries, cranes, rows of city buildings, the island ferry departing (not a recognizable real landmark). |
| 13 | Рынок | A morning market in the town: stalls with fish, vegetables, fruit and old things, awnings, crates, a small bric-a-brac stall with records and cassettes. |
| 14 | Оливковая роща | An ancient olive grove in neat rows on terraced slopes, gnarled trunks, dry stone walls, a small stone hut. |
| 15 | Старая пристань | An old abandoned wooden pier in a quiet eastern bay, a weathered boathouse, a half-sunk rowing boat, clear water. |
| 16 | Мэрия | The town hall on the main square: a modest neoclassical building with a flag pole, steps, palm trees, people coming and going. |
