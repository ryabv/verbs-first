import type { SVGProps } from 'react';

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

export function SpeakerIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" fillOpacity={0.15} />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
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
