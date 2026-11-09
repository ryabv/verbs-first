import { useState, type FormEvent } from 'react';
import { addCards, createDeck, DEFAULT_DECK_ID, findCard, useCards } from '@/entities/card';
import { Button } from '@/shared/ui/button';
import { GreekKeyboard, useGreekKeyboard } from '@/shared/ui/greek-keyboard';
import styles from './AddWordForm.module.css';

const NEW_DECK = '__new__';

/** Добавить любое слово в любой набор (или в новый). */
export function AddWordForm() {
  const { decks, cards } = useCards();
  const keyboard = useGreekKeyboard();
  const [greek, setGreek] = useState('');
  const [russian, setRussian] = useState('');
  const [deckId, setDeckId] = useState(DEFAULT_DECK_ID);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // Слово уже есть — карточка не дублируется, а попадает и в выбранный набор.
  const existing = greek.trim() === '' ? undefined : findCard(cards, greek);
  const inTarget = existing?.deckIds.includes(deckId) ?? false;
  const existingIn = existing ? decks.filter((d) => existing.deckIds.includes(d.id)).map((d) => `«${d.title}»`) : [];
  const canSubmit =
    greek.trim() !== '' &&
    (russian.trim() !== '' || existing !== undefined) &&
    !inTarget &&
    (deckId !== NEW_DECK || newDeckTitle.trim() !== '');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const target = deckId === NEW_DECK ? createDeck(newDeckTitle).id : deckId;
    addCards(target, [{ greek, russian: russian.trim() || existing!.russian }]);
    setMessage({ ok: true, text: `«${greek.trim()}» добавлено` });
    setGreek('');
    setRussian('');
    if (deckId === NEW_DECK) {
      setDeckId(target);
      setNewDeckTitle('');
    }
  };

  return (
    <form className={styles.form} onSubmit={onSubmit}>
      <div className={styles.fields}>
        <label className={styles.field}>
          <span>По-гречески</span>
          <input
            className={styles.input}
            value={greek}
            onChange={(e) => {
              setGreek(e.target.value);
              setMessage(null);
            }}
            placeholder="η θάλασσα"
            lang="el"
            inputMode={keyboard.inputMode}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </label>
        <label className={styles.field}>
          <span>Перевод</span>
          <input
            className={styles.input}
            value={russian}
            onChange={(e) => setRussian(e.target.value)}
            placeholder="море"
            autoComplete="off"
          />
        </label>
        <label className={styles.field}>
          <span>Набор</span>
          <select className={styles.input} value={deckId} onChange={(e) => setDeckId(e.target.value)}>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
            <option value={NEW_DECK}>+ Новый набор…</option>
          </select>
        </label>
        {deckId === NEW_DECK && (
          <label className={styles.field}>
            <span>Название набора</span>
            <input
              className={styles.input}
              value={newDeckTitle}
              onChange={(e) => setNewDeckTitle(e.target.value)}
              placeholder="Например: Еда"
              autoComplete="off"
            />
          </label>
        )}
      </div>

      <GreekKeyboard
        open={keyboard.open}
        onToggle={keyboard.toggle}
        onKey={(ch) => setGreek(greek + ch)}
        onBackspace={() => setGreek(greek.slice(0, -1))}
      />

      <div className={styles.actions}>
        <Button type="submit" disabled={!canSubmit}>
          {existing && !inTarget ? 'Добавить и в этот набор' : 'Добавить карточку'}
        </Button>
        {existing && (
          <span className={styles.warn}>
            {inTarget
              ? 'Это слово уже есть в этом наборе'
              : `Уже есть в ${existingIn.join(', ')} — прогресс общий, перевод останется «${existing.russian}»`}
          </span>
        )}
        {message && !existing && <span className={styles.ok}>{message.text}</span>}
      </div>
    </form>
  );
}
