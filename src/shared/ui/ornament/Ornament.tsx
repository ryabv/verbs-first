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
