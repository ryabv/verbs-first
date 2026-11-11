import type { SVGProps } from 'react';
import styles from './icons.module.css';

type IconProps = SVGProps<SVGSVGElement> & { size?: number | string };

/** Линейные иконки в цвет текста (currentColor), размер по умолчанию — 1em. */
function Svg({ size = '1em', children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Динамик. pending — звук ещё грузится: вместо волн крутится дуга. */
export function SpeakerIcon({ pending = false, ...props }: IconProps & { pending?: boolean }) {
  return (
    <Svg {...props}>
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" fillOpacity={0.15} />
      {pending ? (
        <path className={styles.spin} d="M17.5 7.5a4.5 4.5 0 1 1-3.9 2.3" />
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </>
      )}
    </Svg>
  );
}

export function SpeakerOffIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" fillOpacity={0.15} />
      <path d="m16 9 5 6" />
      <path d="m21 9-5 6" />
    </Svg>
  );
}

/** Карточки: две карточки со сдвигом, на передней — α. */
export function CardsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="6" width="10" height="13" rx="1.8" />
      <path d="M13 8.5h6a1.8 1.8 0 0 1 1.8 1.8v8.9A1.8 1.8 0 0 1 19 21h-7.2A1.8 1.8 0 0 1 10 19.2V19" />
      <path d="M10.2 10.3c-.3 2.2-.6 3.9 0 4.1M10 12c-.4-1.3-1-1.8-1.9-1.8-1.2 0-1.8 1-1.8 2.1 0 1.1.7 2.1 1.6 2.1 1 0 1.6-1.1 2-2.3" />
    </Svg>
  );
}

/** Маяк — раздел «История» (сериал про остров). */
export function LighthouseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9.5 9h5l1.5 12H8L9.5 9z" fill="currentColor" fillOpacity={0.12} />
      <path d="M10 6h4v3h-4z" />
      <path d="M12 3v3" />
      <path d="M9 14.5h6.3M8.6 18h6.8" />
      <path d="M17 5.5l3-1.5M17 8.5l3 1.5M7 5.5 4 4M7 8.5 4 10" />
      <path d="M5 21h14" />
    </Svg>
  );
}

/** Раскрытая книга — раздел «Тексты». */
export function BookIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 6.5C10.3 5.2 7.8 4.6 3 4.8v13.4c4.8-.2 7.3.4 9 1.8 1.7-1.4 4.2-2 9-1.8V4.8c-4.8-.2-7.3.4-9 1.7z" fill="currentColor" fillOpacity={0.12} />
      <path d="M12 6.5V20" />
      <path d="M6 8.5c1.5 0 2.7.2 3.6.6M6 11.5c1.5 0 2.7.2 3.6.6M14.4 9.1c.9-.4 2.1-.6 3.6-.6M14.4 12.1c.9-.4 2.1-.6 3.6-.6" />
    </Svg>
  );
}
