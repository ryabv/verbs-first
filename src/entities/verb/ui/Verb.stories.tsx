import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { getVerb } from '../lib/getVerbs';
import type { Person } from '../model/types';
import { PersonSwitcher } from './PersonSwitcher';
import { VerbParadigm } from './VerbParadigm';
import { VerbTable } from './VerbTable';

const verb = getVerb('grafo')!;

/** Глагол: таблица «время × форма» для лица, полная парадигма, переключатель лица. */
const meta = { title: 'Сущности/Глагол' } satisfies Meta;
export default meta;
type Story = StoryObj;

function TableWithPerson({ onlyPresent }: { onlyPresent?: boolean }) {
  const [person, setPerson] = useState<Person>(0);
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <PersonSwitcher value={person} onChange={setPerson} />
      <VerbTable verb={verb} person={person} tenses={onlyPresent ? ['present'] : undefined} />
    </div>
  );
}

export const Таблица: Story = { render: () => <TableWithPerson /> };
/** `scope` урока: только пройденные времена. */
export const ТолькоНастоящее: Story = { name: 'Только настоящее (scope)', render: () => <TableWithPerson onlyPresent /> };
export const Парадигма: Story = { render: () => <VerbParadigm verb={verb} /> };
