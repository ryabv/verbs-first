/** Блокнот — метка заметок Анны в прологе (как голова кота — у рассказов Ερμής в главах). Цвет — currentColor. */
export function NoteIcon({ className, size = '1em' }: { className?: string; size?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6z" />
      <path d="M6 3v18M4 7h4M4 12h4M4 17h4M10.5 8h5M10.5 12h5" />
    </svg>
  );
}
