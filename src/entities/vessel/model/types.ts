/** Форма сосуда — профиль тела вращения и ручки (`lib/shapes.ts`). */
export type VesselShape =
  | 'jug'
  | 'ovoid'
  | 'krater'
  | 'neck'
  | 'oinochoe'
  | 'aryballos'
  | 'belly'
  | 'nolan'
  | 'lekythos'
  | 'hydria';

/**
 * Экспонат музея ежедневных: сосуд месяца. Роспись рисуется кодом по `id` (`lib/paint.ts`).
 * Факты на табличке — только проверенные (источник — в комментарии у записи).
 */
export interface Vessel {
  id: string;
  /** Название стиля — заголовок таблички. */
  title: string;
  /** Где и когда. */
  where: string;
  /** Анонс, пока сосуд в печи: форма и откуда — без названия стиля. */
  teaser: string;
  /** Один факт о стиле. */
  fact: string;
  shape: VesselShape;
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
