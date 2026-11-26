import { useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ChapterMedal, FindThumb, FindViewer, MEDAL_METALS, type StoryChapter } from '@/entities/story';
import { VesselPicture, VesselStage } from '@/entities/vessel';
import { GreekInline, Word } from '@/features/card-add';
import { monthTitle } from '@/features/daily';
import { routes } from '@/shared/config/routes';
import { ProgressBar } from '@/shared/ui/progress-bar';
import { groupBy, useCollection, type FindItem, type MedalItem, type VesselItem } from '../model/collection';
import styles from './CollectionPage.module.css';

/** Слова находок — в тот же набор, что и на карте «Истории»; названия сосудов — как на табличке музея. */
const STORY_DECK = { id: 'story', title: 'Из истории' };
const storyDeck = () => STORY_DECK;
const MUSEUM_DECK = { id: 'museum', title: 'Музей сосудов' };

const TABS = [
  { id: 'vessels', label: 'Сосуды' },
  { id: 'finds', label: 'Находки' },
  { id: 'medals', label: 'Медальоны' },
] as const;
type Tab = (typeof TABS)[number]['id'];

/**
 * /profile/collection — «Коллекция» (docs/product/collection.md): вкладки «Сосуды · Находки · Медальоны»,
 * группы (годы, эпохи) и сетка картинок. 3D — только в витрине по нажатию.
 */
export function CollectionPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.find((t) => t.id === params.get('tab'))?.id ?? 'vessels';
  const c = useCollection();
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <Link to={routes.profile()} className={styles.back} aria-label="Назад в профиль">
          ‹
        </Link>
        <h1 className={styles.title}>Коллекция</h1>
      </header>
      <div className={styles.tabs} role="tablist" aria-label="Что собрано">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? `${styles.tab} ${styles.tabOn}` : styles.tab}
            onClick={() => setParams(t.id === 'vessels' ? {} : { tab: t.id }, { replace: true })}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'vessels' && <Vessels items={c.vessels} />}
        {tab === 'finds' && <Finds items={c.finds} />}
        {tab === 'medals' && <Medals items={c.medals} />}
      </div>
    </div>
  );
}

/** Ячейка сетки: картинка на светлом «полу» и подпись; бледная — ещё впереди. */
function Cell({ pic, title, status, faded = false }: { pic: ReactNode; title: string; status: ReactNode; faded?: boolean }) {
  return (
    <>
      <span className={faded ? `${styles.stage} ${styles.faded}` : styles.stage}>{pic}</span>
      <span className={styles.caption}>
        <b>{title}</b>
        {status}
      </span>
    </>
  );
}

function Done({ children }: { children: ReactNode }) {
  return (
    <span className={styles.done}>
      {children}
      <span className={styles.check} aria-hidden="true">
        ✓
      </span>
    </span>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.group}>
      <h2 className={styles.groupTitle}>{title}</h2>
      <div className={styles.grid}>{children}</div>
    </section>
  );
}

/** Витрина поверх страницы: экспонат крупно; закрыть — ✕ или Esc. */
function useShowcase<T>() {
  const ref = useRef<HTMLDialogElement>(null);
  const [item, setItem] = useState<T>();
  const show = (x: T) => {
    setItem(x);
    ref.current?.showModal();
  };
  const dialog = (body: (x: T) => ReactNode) => (
    <dialog ref={ref} className={styles.dialog} onClose={() => setItem(undefined)}>
      {item !== undefined && (
        <div className={styles.dialogBody}>
          <button type="button" className={styles.close} onClick={() => ref.current?.close()} aria-label="Закрыть">
            ✕
          </button>
          {body(item)}
        </div>
      )}
    </dialog>
  );
  return { show, dialog };
}

function Vessels({ items }: { items: readonly VesselItem[] }) {
  const { show, dialog } = useShowcase<VesselItem>();
  return (
    <>
      {groupBy(items, (v) => v.month.slice(0, 4)).map(([year, list]) => (
        <Group key={year} title={year}>
          {list.map((v) => {
            const month = monthTitle(v.month).split(' ')[0]!;
            const pic = <VesselPicture vessel={v.vessel} kind={v.built ? 'photo' : 'silhouette'} fill={v.built ? 1 : v.found / Math.max(1, v.total)} className={styles.vesselPic} />;
            return v.built ? (
              <button key={v.month} type="button" className={styles.cell} onClick={() => show(v)} aria-label={`${month}: ${v.vessel.title}`}>
                <Cell pic={pic} title={month} status={<Done>Собран</Done>} />
              </button>
            ) : (
              <Link key={v.month} to={routes.today(v.month)} className={styles.cell}>
                <Cell
                  pic={pic}
                  title={month}
                  faded={!v.complete}
                  status={
                    v.complete ? (
                      <span className={styles.ready}>Можно собрать</span>
                    ) : (
                      <span className={styles.progress}>
                        <span className={styles.bar}>
                          <ProgressBar value={v.found / Math.max(1, v.total)} thin />
                        </span>
                        {v.found} из {v.total}
                      </span>
                    )
                  }
                />
              </Link>
            );
          })}
        </Group>
      ))}
      {dialog((v) => (
        <>
          {/* Модель скана грузится только здесь — в сетке картинки. */}
          <VesselStage exhibits={[{ kind: 'vessel', vessel: v.vessel }]} focus={0} label={v.vessel.title} zoomable className={styles.viewer} />
          <div className={styles.plaque}>
            <p className={styles.kicker}>{monthTitle(v.month)}</p>
            <h2 className={styles.plaqueTitle}>{v.vessel.title}</h2>
            <p className={styles.where}>
              <Word greek={v.vessel.greek} russian={v.vessel.russian} deck={MUSEUM_DECK} /> · {v.vessel.where}
            </p>
            <p className={styles.text}>{v.vessel.fact}</p>
            <p className={styles.credit}>
              3D-скан:{' '}
              <a href={v.vessel.credit.url} target="_blank" rel="noreferrer">
                {v.vessel.credit.museum}
              </a>{' '}
              · {v.vessel.credit.license}
            </p>
            <Link to={routes.today(v.month)} className={styles.more}>
              Месяц в ежедневных
            </Link>
          </div>
        </>
      ))}
    </>
  );
}

function Finds({ items }: { items: readonly FindItem[] }) {
  const { show, dialog } = useShowcase<StoryChapter>();
  return (
    <>
      {groupBy(items, (f) => f.chapter.epoch).map(([epoch, list]) => (
        <Group key={epoch} title={`Эпоха ${epoch}`}>
          {list.map(({ chapter: c, found }) =>
            found ? (
              <button key={c.id} type="button" className={styles.cell} onClick={() => show(c)}>
                <Cell pic={<FindThumb icon={c.find!.icon} className={styles.findPic} />} title={c.find!.title} status={<span className={styles.sub}>Глава {c.id}</span>} />
              </button>
            ) : (
              <Link key={c.id} to={routes.story()} className={styles.cell}>
                <Cell pic={<span className={styles.ghost}>?</span>} title={`Глава ${c.id}`} status={<span className={styles.sub}>Дочитайте главу</span>} faded />
              </Link>
            ),
          )}
        </Group>
      ))}
      {dialog((c) => (
        <>
          <FindViewer icon={c.find!.icon} reveal className={styles.viewer} />
          <div className={styles.plaque}>
            <p className={styles.kicker}>
              Глава {c.id} · {c.titleRu}
            </p>
            <h2 className={styles.plaqueTitle}>{c.find!.title}</h2>
            <p className={styles.text}>
              <GreekInline text={c.find!.text} wordDeck={storyDeck} />
            </p>
          </div>
        </>
      ))}
    </>
  );
}

function Medals({ items }: { items: readonly MedalItem[] }) {
  return groupBy(items, (m) => m.epoch).map(([epoch, list]) => (
    <Group key={epoch} title={`Эпоха ${epoch}`}>
      {list.map((m) => (
        <div key={m.chapter} className={styles.cell}>
          <Cell
            pic={<ChapterMedal chapter={m.chapter} rank={m.rank} written={m.written} className={styles.medal} />}
            title={`Глава ${m.chapter}`}
            faded={m.rank === 0}
            status={m.rank ? <Done>{MEDAL_METALS[m.rank]}</Done> : <span className={styles.sub}>{m.written ? 'Не закреплена' : 'Скоро'}</span>}
          />
        </div>
      ))}
    </Group>
  ));
}

