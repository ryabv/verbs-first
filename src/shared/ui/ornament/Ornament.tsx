import type { ReactNode, SVGProps } from 'react';
import styles from './Ornament.module.css';

type Props = SVGProps<SVGSVGElement> & { size?: number | string };

/*
 * Греческие мотивы — собственные простые SVG в цвет текста (currentColor).
 * Цвет задаётся снаружи через CSS-переменные (--olive, --brand…).
 */

function Svg({ size = '1em', viewBox = '0 0 24 24', children, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
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

/** Лист: эллипс с центром (x, y), повёрнутый на angle градусов. */
function Leaf({ x, y, angle, rx = 3, ry = 1.25 }: { x: number; y: number; angle: number; rx?: number; ry?: number }) {
  return <ellipse cx={x} cy={y} rx={rx} ry={ry} transform={`rotate(${angle} ${x} ${y})`} fill="currentColor" fillOpacity={0.3} />;
}

/** Лавровый венок: две ветви по дуге, сверху открыт. */
const WREATH_LEAVES = Array.from({ length: 9 }, (_, i) => {
  const deg = 100 + i * 16; // от низа (90°) вверх по левой стороне
  const t = (deg * Math.PI) / 180;
  const r = 38;
  const x = 50 + r * Math.cos(t);
  const y = 50 + r * Math.sin(t);
  const tangent = deg + 90;
  const at = (a: number, d: number) => [x + d * Math.cos((a * Math.PI) / 180), y + d * Math.sin((a * Math.PI) / 180)] as const;
  const [ox, oy] = at(tangent - 40, 5);
  const [ix, iy] = at(tangent + 40, 5);
  return { ox, oy, oa: tangent - 40, ix, iy, ia: tangent + 40 };
});

function WreathHalf() {
  return (
    <g>
      <path d="M50 88A38 38 0 0 1 24.6 21.8" />
      {WREATH_LEAVES.map((l, i) => (
        <g key={i}>
          <Leaf x={l.ox} y={l.oy} angle={l.oa} rx={5.2} ry={2.1} />
          <Leaf x={l.ix} y={l.iy} angle={l.ia} rx={4.6} ry={1.9} />
        </g>
      ))}
    </g>
  );
}

export function Laurel(props: Props) {
  return (
    <Svg viewBox="0 0 100 100" strokeWidth={2} {...props}>
      <WreathHalf />
      <g transform="matrix(-1 0 0 1 100 0)">
        <WreathHalf />
      </g>
    </Svg>
  );
}

/** Содержимое (например, процент) в лавровом венке. */
export function Wreath({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={className ? `${styles.wreath} ${className}` : styles.wreath}>
      <Laurel className={styles.wreathSvg} size="100%" />
      <span className={styles.wreathInner}>{children}</span>
    </span>
  );
}

/** Амфора. */
export function Amphora(props: Props) {
  return (
    <Svg {...props}>
      <path d="M8.5 2.5h7" />
      <path d="M10 2.5v3c0 1.2-4.5 3-4.5 8.3 0 3.8 2.8 6.2 6.5 6.2s6.5-2.4 6.5-6.2c0-5.3-4.5-7.1-4.5-8.3v-3" fill="currentColor" fillOpacity={0.12} />
      <path d="M10 6c-3 0-4 2-3.3 4.2M14 6c3 0 4 2 3.3 4.2" />
      <path d="M6 12.5h12M5.9 15h12.2" />
      <path d="M10 20v1.5h4V20" />
    </Svg>
  );
}

/** Сова Афины — мудрость и любопытство: значок необязательных ответвлений урока. */
export function Owl(props: Props) {
  return (
    <Svg {...props}>
      <path d="M7 4.5 8.6 7M17 4.5 15.4 7" />
      <path d="M7 4.5C5.8 7.5 5.3 10 5.3 13c0 4.6 3 8 6.7 8s6.7-3.4 6.7-8c0-3-.5-5.5-1.7-8.5-1.4 1.5-3 2.4-5 2.4s-3.6-.9-5-2.4z" />
      <circle cx="9.5" cy="11.2" r="1.8" />
      <circle cx="14.5" cy="11.2" r="1.8" />
      <path d="M11.4 13.6 12 14.7l.6-1.1" />
      <path d="M9 17.2l1 .9 1-.9 1 .9 1-.9 1 .9 1-.9" />
    </Svg>
  );
}

/** Свиток — античный учебник. */
export function Scroll(props: Props) {
  return (
    <Svg strokeWidth={2} {...props}>
      <path d="M6 4h11a2 2 0 0 1 2 2v12" />
      <path d="M6 4a2 2 0 0 0-2 2v1h4V6a2 2 0 0 0-2-2Z" />
      <path d="M8 7v11a2 2 0 0 0 2 2h9a2 2 0 0 0 0-4h-9" />
      <path d="M11 9h5M11 12h5" />
    </Svg>
  );
}

/** Ионическая колонна. */
export function Column(props: Props) {
  return (
    <Svg {...props}>
      <path d="M3.5 3.5h17" />
      <path d="M5 3.5c-1.6 0-1.6 2.6 0 2.6h14c1.6 0 1.6-2.6 0-2.6" />
      <path d="M7 6.1v12.4M17 6.1v12.4M10.3 6.1v12.4M13.7 6.1v12.4" />
      <path d="M5.5 18.5h13M4 21h16v-2.5" />
      <path d="M4 21v-2.5" />
    </Svg>
  );
}

/** Галочка — сплошной мазок кистью, длинный штрих заострён, как лист. Чуть крупнее строки. */
export function Check(props: Props) {
  return (
    <Svg size="1.15em" style={{ verticalAlign: '-0.2em' }} {...props} strokeWidth={0.8}>
      <path d="M3 12.6 6.2 9.8 9.7 13.4Q14 7.6 21 3.6Q16.6 10.4 10.2 19.6Z" fill="currentColor" />
    </Svg>
  );
}

/** Встаёт в строку текста по линии шрифта. */
const INLINE = { verticalAlign: '-0.15em' } as const;

/** Стрела-копьё с наконечником-листом. direction: куда указывает. */
export function Arrow({ direction = 'right', ...props }: Props & { direction?: 'left' | 'right' }) {
  return (
    <Svg style={INLINE} {...props}>
      <g transform={direction === 'left' ? 'matrix(-1 0 0 1 24 0)' : undefined}>
        <path d="M2.5 12H13" strokeWidth={2} />
        <path d="M12.5 12 14.5 8.5Q18.5 9.6 22 12Q18.5 14.4 14.5 15.5Z" fill="currentColor" strokeWidth={1} />
      </g>
    </Svg>
  );
}

/** Полоса меандра (греческий «ключ»), растягивается по ширине. Цвет — --meander. */
export function Meander({ className }: { className?: string }) {
  return <div className={className ? `${styles.meander} ${className}` : styles.meander} aria-hidden="true" />;
}

/** Буквы для номеров этапов: Α, Β, Γ… */
const STAGE_LETTERS = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ';
export const stageLetter = (n: number) => STAGE_LETTERS[(n - 1) % STAGE_LETTERS.length] ?? '';

/**
 * Медальон этапа: диск в венке с греческой буквой.
 * Получен — терракотовый, как краснофигурная ваза; не получен — бледный.
 */
export function Medallion({
  n,
  letter,
  earned,
  size = '3.5rem',
  className,
}: {
  n: number;
  /** Своя надпись вместо буквы этапа (пролог — «αβ»). */
  letter?: string;
  earned: boolean;
  size?: string;
  className?: string;
}) {
  const cls = [styles.medal, earned ? styles.medalEarned : '', className ?? ''].filter(Boolean).join(' ');
  return (
    <span className={cls} style={{ width: size, height: size, fontSize: `calc(${size} * 0.4)` }} aria-hidden="true">
      <Laurel className={styles.medalLaurel} size="100%" />
      <span className={styles.medalLetter} lang="el">
        {letter ?? stageLetter(n)}
      </span>
    </span>
  );
}

/**
 * Знак точки на карте урока — по виду этапа:
 * lesson — медальон с буквой; homework — табличка для письма со свитком и номером части;
 * exam — фасад храма (до сдачи бледный, сдан — терракотовый).
 */
export function StageMark({
  kind,
  num,
  earned,
  size = '3.5rem',
  compact = false,
  className,
}: {
  kind: 'lesson' | 'homework' | 'exam';
  num: number;
  earned: boolean;
  size?: string;
  /** Мелкий ряд (главная): все знаки одного размера, в табличке без номера. */
  compact?: boolean;
  className?: string;
}) {
  if (kind === 'lesson') return <Medallion n={num} earned={earned} size={size} className={className} />;
  const base = kind === 'homework' ? styles.tablet : styles.seal;
  const cls = [base, earned ? styles.markEarned : '', className ?? ''].filter(Boolean).join(' ');
  // Табличка чуть меньше медальона, храм экзамена — крупнее.
  const side = compact ? size : `calc(${size} * ${kind === 'homework' ? 0.86 : 1.14})`;
  const box = { width: side, height: side, fontSize: `calc(${side} * 0.4)` };
  if (kind === 'homework') {
    return (
      <span className={cls} style={box} aria-hidden="true">
        <Scroll size={compact ? '1.25em' : '0.95em'} />
        {!compact && <span className={styles.tabletNum}>{num}</span>}
      </span>
    );
  }
  // Экзамен — фасад храма: фронтон, колонны, ступени.
  return (
    <span className={cls} style={box} aria-hidden="true">
      <svg viewBox="0 0 40 40" width="100%" height="100%" className={styles.templeSvg}>
        <path className={styles.templeBody} d="M20 3 37 13.5H3Z M4 15.5h32v3H4Z M2.5 33h35v2.5h-35Z M1 36.5h38V39H1Z" />
        <path className={styles.templeBody} d="M7 19.5h4v12.5H7Z M14.3 19.5h4v12.5h-4Z M21.7 19.5h4v12.5h-4Z M29 19.5h4v12.5h-4Z" />
        {earned && <circle className={styles.templeMark} cx="20" cy="10.3" r="2" />}
      </svg>
    </span>
  );
}
