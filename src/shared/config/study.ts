import { routes } from './routes';

/**
 * Зоны «Учёбы» (docs/product/home.md): переключатель сверху и пункт «Учёба» в меню.
 * `paths` — начала адресов, которые относятся к зоне (глава, день, тема справочника…).
 */
export const STUDY_SECTIONS = [
  { id: 'story', label: 'История', to: routes.story(), paths: ['/island', '/story', '/alphabet', '/lesson', '/texts'] },
  { id: 'today', label: 'Ежедневные', to: routes.today(), paths: ['/today'] },
  { id: 'cards', label: 'Карточки', to: routes.cards(), paths: ['/cards'] },
  { id: 'grammar', label: 'Справочник', to: routes.grammar(), paths: ['/grammar'] },
] as const;

export type StudySection = (typeof STUDY_SECTIONS)[number];

/** Зона «Учёбы» по адресу; не учёба (главная, профиль) — undefined. */
export function studySectionOf(pathname: string): StudySection | undefined {
  return STUDY_SECTIONS.find((s) => s.paths.some((p) => pathname === p || pathname.startsWith(`${p}/`)));
}

const LAST_KEY = 'verbs-first:study-section';

/** Запомнить зону, где ученик был последним: «Учёба» в меню откроет её. Настройка устройства — localStorage. */
export function rememberStudySection(id: StudySection['id']): void {
  try {
    localStorage.setItem(LAST_KEY, id);
  } catch {
    /* не критично: «Учёба» откроет Историю */
  }
}

/** Куда ведёт «Учёба»: последняя зона, по умолчанию — История. */
export function lastStudySection(): StudySection {
  let id: string | null = null;
  try {
    id = localStorage.getItem(LAST_KEY);
  } catch {
    /* по умолчанию */
  }
  return STUDY_SECTIONS.find((s) => s.id === id) ?? STUDY_SECTIONS[0];
}
