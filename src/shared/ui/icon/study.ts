import type { ComponentType } from 'react';
import type { StudySection } from '@/shared/config/study';
import { CalendarIcon, CardsIcon, ColumnIcon, LighthouseIcon } from './icons';

/** Значки зон «Учёбы» — одни и те же в переключателе зон и в веере меню. */
export const STUDY_ICONS: Record<StudySection['id'], ComponentType<{ className?: string }>> = {
  story: LighthouseIcon,
  today: CalendarIcon,
  cards: CardsIcon,
  grammar: ColumnIcon,
};
