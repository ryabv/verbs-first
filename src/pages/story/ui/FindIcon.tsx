import type { StoryFind } from '@/entities/story';

/** Иконки находок: линейные, в цвет текста. */
export function FindIcon({ icon, className }: { icon: StoryFind['icon']; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icon === 'letter' && (
        <>
          <rect x="4" y="8" width="24" height="17" rx="2" fill="currentColor" fillOpacity={0.1} />
          <path d="m4.5 9 11.5 9 11.5-9" />
          <circle cx="16" cy="21" r="2.4" fill="currentColor" fillOpacity={0.35} />
        </>
      )}
      {icon === 'photo' && (
        <>
          <rect x="5" y="6" width="22" height="20" rx="1.5" fill="currentColor" fillOpacity={0.1} />
          <rect x="8" y="9" width="16" height="11" />
          <circle cx="13" cy="13" r="1.8" />
          <path d="m8 19 5-4 4 3 3-2 4 3" />
        </>
      )}
      {icon === 'map' && (
        <>
          <path d="M4 8l7-3 10 3 7-3v19l-7 3-10-3-7 3z" fill="currentColor" fillOpacity={0.1} />
          <path d="M11 5v19M21 8v19" />
          <path d="m14 15 2 2m0-2-2 2" />
        </>
      )}
      {icon === 'tape' && (
        <>
          <rect x="4" y="8" width="24" height="16" rx="2" fill="currentColor" fillOpacity={0.1} />
          <circle cx="11" cy="15" r="3" />
          <circle cx="21" cy="15" r="3" />
          <path d="M11 18h10M9 24l2-3h10l2 3" />
        </>
      )}
      {icon === 'key' && (
        <>
          <circle cx="10" cy="16" r="5" fill="currentColor" fillOpacity={0.1} />
          <path d="M15 16h13M24 16v4M20 16v3" />
        </>
      )}
    </svg>
  );
}
