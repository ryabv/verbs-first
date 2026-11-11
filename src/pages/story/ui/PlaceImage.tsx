import { useState } from 'react';
import type { StoryImage } from '@/entities/story';

/** Иллюстрация места главы: пока файла нет (или не загрузился) — просто ничего не показываем. */
export function PlaceImage({ image, className, eager = false }: { image: StoryImage; className?: string; eager?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      className={className}
      src={`${process.env.BASE_URL}story/${image.file}`}
      alt={image.alt}
      width={1200}
      height={675}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
