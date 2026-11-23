import { useEffect, useRef, useState } from 'react';
import type { StoryFind } from '../model/types';
import { FindIcon } from './FindIcon';
import styles from './FindModel.module.css';

/**
 * Находка в 3D (docs/product/finds.md): вертеть рукой; `reveal` — появление с волной света.
 * three.js грузится лениво; пока грузится или без WebGL — значок предмета.
 */
export function FindViewer({ icon, reveal = false, className }: { icon: StoryFind['icon']; reveal?: boolean; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let viewer: { dispose(): void } | undefined;
    void import('../lib/find-stage')
      .then(({ createFindViewer }) => createFindViewer(host, icon, { reveal }))
      .then((v) => {
        if (cancelled) return v.dispose();
        viewer = v;
        setReady(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      viewer?.dispose();
    };
  }, [icon, reveal]);
  return (
    <div className={[styles.viewer, className].filter(Boolean).join(' ')}>
      <div ref={hostRef} className={styles.host} aria-hidden="true" />
      {!ready && <FindIcon icon={icon} className={styles.fallback} />}
    </div>
  );
}

/** Миниатюра предмета для полки: 3D-снимок, пока его нет — значок. */
export function FindThumb({ icon, className }: { icon: StoryFind['icon']; className?: string }) {
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    let cancelled = false;
    void import('../lib/find-stage')
      .then(({ findThumb }) => findThumb(icon))
      .then((url) => !cancelled && setSrc(url))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [icon]);
  return src ? <img src={src} alt="" className={[styles.thumb, className].filter(Boolean).join(' ')} /> : <FindIcon icon={icon} className={[styles.thumbIcon, className].filter(Boolean).join(' ')} />;
}
