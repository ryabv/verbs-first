# Иллюстрации мест «Истории»

Картинка места показывается в карточке главы на карте острова (`/story`), когда глава написана.
Места — настоящий Кипр (Куклия, Хирокития…): картинка передаёт характер места и эпохи, но без надписей, флагов и
политических символов; узнаваемые памятники — только проверенные и только в своей эпохе.

## Как добавить

1. Сгенерировать картинку по промпту ниже: **общий стиль + описание места**. Формат 16:9.
   Генератор — с лицензией, разрешающей использование на сайте (контент проекта — только собственный).
2. Ужать до **1200×675, webp, ~200–300 КБ** (карточка ~380 px шириной, этого хватает и для ретины):
   `cwebp -q 74 -resize 1200 675 in.png -o chapter-01.webp` или squoosh.app.
3. Положить в `public/story/chapter-NN.webp`.
4. В `src/entities/story/data/chapter-NN.ts` — поле `image: { file: 'chapter-NN.webp', alt: '…' }`
   (`alt` — по-русски, что на картинке). Пока файла нет, карточка просто показывается без картинки.

Картинки будущих глав не показываются, пока глава не написана, — сюжет не выдаётся.

Готово: главы 1–4 — `chapter-01…04.webp`, нарисованы по описаниям ниже (перерисованы под Кипр, решение владельца, 2026-11-27;
прежние картинки глав 1–2 были в стиле кикладского острова).

## Общий стиль (добавлять к каждому промпту)

```
Hand-drawn storybook illustration, fine ink linework with soft watercolor washes on aged cream paper,
high three-quarter bird's-eye view, richly detailed, muted natural palette: blue-grey Mediterranean sea,
olive and carob greens, dry golden grass, ochre and red earth, honey-coloured local limestone,
soft warm morning light, calm and slightly mysterious mood. Southern Cyprus, a real place, not a Greek island:
no Cycladic white cubes, no blue doors or blue church domes, no islands on the horizon.
No text, no lettering, no signs, no flags, no watermark, no logos. People tiny and far away or absent. 16:9.
```

## Места

Факты мест — из источников (в скобках); чего источник не говорит, в описание не ставим. Описания пишутся вместе с главой.

| Глава | Место | Описание для промпта |
|---|---|---|
| 1 | Куклия: дом тёти (сегодня) | Kouklia today, a village in south-west Cyprus near the Mediterranean shore, close to the mouth of a dry seasonal riverbed. Low old village houses of honey-coloured stone blocks, narrow lanes, courtyards with a lemon tree and clay pots, fields of the coastal plain, the open sea beyond. In the foreground a small, old, whitewashed stone house with a wooden door and a little courtyard; a cat sits at the door. |
| 2 | Кухня тёти | Interior of an old Cypriot village kitchen in the late evening: thick stone walls, a small deep window, a wooden table with an envelope on it, an oil lamp or a simple lamp, shelves with clay jars and plates, a cat on a chair. Warm lamplight, quiet and mysterious. Seen from slightly above, no people. |
| 3 | Шиллурокамбос: первые люди (≈ 8000 до н. э.) | Neolithic Cyprus about ten thousand years ago: a small early farming settlement on a low plateau near the southern coast, a few simple huts, smoke from a fire, wild scrubland and the sea in the distance; a few tiny figures and a cat. No pottery, no metal, no buildings of later ages. |
| 4 | Хирокития (сегодня) | The Neolithic site of Choirokoitia today, on the slope of a hill in the valley of the Maroni river, inland from the southern coast: remains of round stone houses huddled close together, a massive stone village wall, a few reconstructed round huts with flat roofs, dry hills around; two tiny visitors walking on a path. |

Источники: Куклия — у побережья юго-запада Кипра, у устья пересыхающей реки Диаризос, ≈ 16 км к востоку от Пафоса;
в 1887–88 — «низкие дома на глиняном растворе из тёсаных камней» ([Wikipedia: Kouklia](https://en.wikipedia.org/wiki/Kouklia)).
Шиллурокамбос — неолит, низкое плато у Парекклисии, ≈ 6 км от Лимасола, 8200–7500 до н. э.
([Wikipedia: Shillourokambos](https://en.wikipedia.org/wiki/Shillourokambos)). Хирокития — склон холма в долине реки
Марони, ≈ 6 км от моря; круглые дома (толосы) тесно друг к другу, низ стен — камень, найдена плоская крыша; стена
2,5 м толщиной; реконструированные дома ([Wikipedia: Khirokitia](https://en.wikipedia.org/wiki/Khirokitia)).
Высота Куклии над морем и точное расстояние до берега источник не даёт — в описании их нет.
