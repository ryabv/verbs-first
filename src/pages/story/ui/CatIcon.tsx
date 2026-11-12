/** Голова кота Ερμής — метка его рассказов (на карте, в тексте, в списках). Цвет — currentColor. */
export function CatIcon({ className, size = '1em' }: { className?: string; size?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M4 2.5l4.6 4.3h6.8L20 2.5V13c0 4.7-3.6 8.5-8 8.5S4 17.7 4 13zM9 12.2a1.3 1.6 0 1 0 0.01 0zM15 12.2a1.3 1.6 0 1 0 0.01 0zM10.6 16h2.8L12 17.6z"
      />
    </svg>
  );
}
