import { Link } from 'react-router';
import { getLessonCatalog } from '@/entities/lesson';
import { progressKey, readProgress } from '@/features/lesson-progress';
import { routes } from '@/shared/config/routes';
import { Callout } from '@/shared/ui/callout';
import styles from './HomePage.module.css';

export function HomePage() {
  const lessons = getLessonCatalog();

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1>Греческий через глаголы</h1>
        <p className={styles.lead}>
          Курс из 16 уроков для тех, кто хочет заговорить, а не зубрить правила. В каждом уроке — 8 глаголов и одна
          «таблица умножения»: три времени, вопрос и отрицание.
        </p>
      </header>

      <Callout title="Как учиться">
        <ul className={styles.principles}>
          <li>Глагол — основа языка. Освоив схему на одном глаголе, вы подставляете в неё любой другой.</li>
          <li>Сначала свободно, потом правильно: ошибка в ударении — не провал, а подсказка.</li>
          <li>10–15 минут каждый день работают лучше, чем два часа раз в неделю.</li>
        </ul>
      </Callout>

      <section className={styles.part}>
        <h2 className={styles.partTitle}>
          <span className={styles.partLabel}>Перед курсом</span>
          Алфавит
        </h2>
        <Link to={routes.alphabet()} className={styles.alphabet}>
          <span className={styles.alphabetGlyphs} lang="el">
            Αα Ββ Γγ Δδ
          </span>
          <span>
            <span className={styles.title}>Алфавит и чтение</span>
            <span className={styles.meta}>
              24 буквы, сочетания букв, ударение · 2 тренажёра. Если уже читаете по-гречески — сразу к урокам.
            </span>
          </span>
        </Link>
      </section>

      <section className={styles.part}>
        <h2 className={styles.partTitle}>
          <span className={styles.partLabel}>Курс</span>
          Базовый уровень
        </h2>

        <ol className={styles.list}>
          {lessons.map((lesson) => {
            const done = lesson.available ? readProgress(progressKey.lesson(lesson.id)).completed.length : 0;
            const homeworkDone = lesson.available ? readProgress(progressKey.homework(lesson.id)).completed.length : 0;
            const percent = lesson.stepCount ? Math.min(100, Math.round((done / lesson.stepCount) * 100)) : 0;
            const status = !lesson.available
              ? 'скоро'
              : percent === 100
                ? '✓ пройден'
                : percent > 0
                  ? `пройдено ${percent}%`
                  : `${lesson.stepCount} шагов`;

            return (
              <li key={lesson.id} className={lesson.available ? styles.item : `${styles.item} ${styles.locked}`}>
                <span className={styles.number}>{lesson.id}.</span>
                <div>
                  {lesson.available ? (
                    <Link to={routes.lesson(lesson.id)} className={styles.title}>
                      {lesson.title}
                    </Link>
                  ) : (
                    <span className={styles.title}>{lesson.title}</span>
                  )}
                  <div className={styles.meta}>
                    {lesson.topic} · <span className={percent === 100 ? styles.done : undefined}>{status}</span>
                    {lesson.homeworkCount > 0 && (
                      <>
                        {' · '}
                        <Link to={`${routes.lesson(lesson.id)}?mode=homework`} className={styles.homework}>
                          ДЗ {homeworkDone}/{lesson.homeworkCount}
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
