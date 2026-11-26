/** Чей скан и на каких условиях: CC BY требует подписи (автор, лицензия, ссылка) — она на табличке. */
export interface VesselCredit {
  /** Музей или собрание — как подписать. */
  museum: string;
  license: 'CC0' | 'CC BY';
  /** Страница скана. */
  url: string;
}

/**
 * Экспонат музея ежедневных: сосуд месяца — 3D-скан подлинника (`public/museum/<id>.glb`, `pnpm museum:bake`).
 * Факты на табличке — только проверенные (источник — в комментарии у записи).
 */
export interface Vessel {
  id: string;
  /** Название — заголовок таблички. */
  title: string;
  /** Где и когда сделан. */
  where: string;
  /** Анонс, пока черепки в лотке: что за сосуд и откуда — без названия. */
  teaser: string;
  /** Один факт о сосуде. */
  fact: string;
  /** Скан: uid модели на Sketchfab (исходник для `pnpm museum:fetch`). */
  scan: string;
  credit: VesselCredit;
  /** Месяц сосуда (`YYYY-MM`): черепков столько, сколько в нём дней, — так их и нарезают заранее. */
  month: string;
  /** Греческое название сосуда — словарная форма с артиклем (есть в словаре) и перевод. */
  greek: string;
  russian: string;
}

/**
 * Экспонат месяца. Пока черепки найдены не все — стол реставратора: найденные черепки в лотке с песком
 * (по одному за закрытый день). Все найдены и собраны — целый сосуд на постаменте.
 */
/** `found` — номера найденных черепков (номер дня в месяце с нуля): у каждого дня свой черепок. */
export type VesselView = { kind: 'dig'; vessel: Vessel; found: readonly number[]; total: number } | { kind: 'vessel'; vessel: Vessel };

/** Ключ экспоната: сменился — экспонат перестраивается. */
export function viewKey(view: VesselView): string {
  return view.kind === 'vessel' ? `vessel:${view.vessel.id}` : `dig:${view.vessel.id}:${view.found.join(',')}/${view.total}`;
}
