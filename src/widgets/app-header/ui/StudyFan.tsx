import { useEffect, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { STUDY_SECTIONS, type StudySection } from '@/shared/config/study';
import { STUDY_ICONS } from '@/shared/ui/icon';
import styles from './StudyFan.module.css';

/** Радиус веера и его размах: 180° — от левого края дуги до правого. */
const RADIUS = 108;

/**
 * Веер разделов «Учёбы» на телефоне: по нажатию на «Учёба» разделы раскрываются полукругом над значком,
 * по очереди вылетая из него. Нажатие мимо, Esc или переход — закрывают: разделы так же плавно втягиваются обратно.
 * Размыт только полукруг вокруг веера — остальной экран виден.
 */
export function StudyFan({ current, closing, onClose }: { current: StudySection['id'] | undefined; closing: boolean; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);
  const n = STUDY_SECTIONS.length;
  return (
    <div className={closing ? `${styles.fan} ${styles.closing}` : styles.fan}>
      <button type="button" className={styles.backdrop} onClick={onClose} aria-label="Закрыть" />
      <div className={styles.arc} aria-hidden="true" />
      <nav className={styles.origin} aria-label="Разделы учёбы">
        {STUDY_SECTIONS.map((s, i) => {
          const Icon = STUDY_ICONS[s.id];
          // Слева направо по полукругу: 180° → 0°.
          const angle = Math.PI - (Math.PI * i) / (n - 1);
          const style = {
            '--x': `${(Math.cos(angle) * RADIUS).toFixed(1)}px`,
            '--y': `${(-Math.sin(angle) * RADIUS).toFixed(1)}px`,
            '--i': i,
            '--j': n - 1 - i,
          } as CSSProperties;
          return (
            <Link key={s.id} to={s.to} className={s.id === current ? `${styles.item} ${styles.on}` : styles.item} style={style} onClick={onClose}>
              <span className={styles.disc}>
                <Icon className={styles.icon} />
              </span>
              <span className={styles.label}>{s.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
