import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { viewKey, type VesselView } from '../model/types';
import type { VesselStage as Stage } from '../lib/scene';
import styles from './VesselStage.module.css';

interface Props {
  /** Экспонаты всех месяцев по порядку — одна галерея вдоль стены. */
  exhibits: readonly VesselView[];
  /** На какой экспонат смотрим; сменился — камера переходит к нему. */
  focus: number;
  /** Экспонат `focus` только что достали из печи — показать с анимацией. */
  reveal?: boolean;
  onRevealed?: () => void;
  className?: string;
  /** Что на постаменте — для чтения с экрана и вместо картинки без WebGL. */
  label: string;
}

/** 3D-галерея музея: сосуды, черепки или печь по месяцам. three.js подгружается лениво. */
export function VesselStage({ exhibits, focus, reveal, onRevealed, className, label }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Stage | undefined>(undefined);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  const apply = useEffectEvent(() => {
    stageRef.current?.update(exhibits, focus, reveal ? { index: focus, done: onRevealed } : undefined);
  });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    void import('../lib/scene')
      .then(({ createVesselStage }) => {
        if (cancelled) return;
        stageRef.current = createVesselStage(host);
        apply();
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('failed'));
    return () => {
      cancelled = true;
      stageRef.current?.dispose();
      stageRef.current = undefined;
    };
  }, []);

  // Сцена обновляется, только когда сменился вид экспонатов или фокус.
  const signature = `${focus}|${exhibits.map(viewKey).join(',')}`;
  const shown = useRef('');
  useEffect(() => {
    if (shown.current === signature) return;
    shown.current = signature;
    apply();
  }, [signature]);

  return (
    <div className={[styles.stage, className].filter(Boolean).join(' ')}>
      <div ref={hostRef} className={styles.host} aria-hidden="true" />
      <p className={status === 'ready' ? styles.hidden : styles.status}>{status === 'loading' ? 'Открываем музей…' : label}</p>
    </div>
  );
}
