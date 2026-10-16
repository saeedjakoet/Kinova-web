import clsx from 'clsx';

// Placeholder imagery per morph — identical shapes/colours to the Figma "SnakeAvatar" component.
// Pass `src` to show a real photo instead (the Figma "Image/replace" layer).
const MORPH_COLORS = {
  Normal: { base: '#7A5A3A', dark: '#2E2219', light: '#C49A62' },
  Pastel: { base: '#C9A23E', dark: '#5E4320', light: '#EED67E' },
  Clown: { base: '#C68A3C', dark: '#3E2C1E', light: '#ECCB92' },
  Mojave: { base: '#857565', dark: '#33291F', light: '#E2D6C6' },
  Enchi: { base: '#CF8840', dark: '#6B3F1A', light: '#F2C57E' },
  Yellowbelly: { base: '#6F5F45', dark: '#2B241A', light: '#D8C590' },
  Lesser: { base: '#C9B486', dark: '#7E6A45', light: '#EFE4C8' },
  Spider: { base: '#D9B886', dark: '#5A4530', light: '#F1DFC0' },
};

// [x, y, w, h, rotation°] in a 64×64 box; Figma rotates counter-clockwise around the top-left corner.
const BLOBS = [[-8, 6, 34, 22, -20], [28, -6, 30, 20, 25], [20, 32, 36, 22, -10], [-12, 44, 26, 18, 15], [46, 38, 28, 20, 30]];
const SPIDER = [[-10, 14, 90, 3, -18], [-6, 34, 90, 3, -14], [-8, 52, 90, 3, -20], [10, -6, 3, 80, 22], [36, -6, 3, 80, 16]];

function Pattern({ morph }) {
  const c = MORPH_COLORS[morph] || MORPH_COLORS.Normal;
  return (
    <>
      <rect width="64" height="64" fill={c.base} />
      {morph === 'Spider'
        ? SPIDER.map(([x, y, w, h, r]) => <rect key={`${x}${y}`} x={x} y={y} width={w} height={h} rx="2" fill={c.dark} transform={`rotate(${-r} ${x} ${y})`} />)
        : BLOBS.map(([x, y, w, h, r]) => (
          <g key={`${x}${y}`}>
            <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} fill={c.dark} transform={`rotate(${-r} ${x} ${y})`} />
            <ellipse cx={x + w * 0.3 + (w * 0.42) / 2} cy={y + h * 0.3 + (h * 0.38) / 2} rx={(w * 0.42) / 2} ry={(h * 0.38) / 2} fill={c.light}
              transform={`rotate(${-r} ${x + w * 0.3} ${y + h * 0.3})`} />
          </g>
        ))}
      {morph === 'Clown' && <rect x="-12" y="52" width="90" height="7" fill={c.dark} transform="rotate(-35 -12 52)" />}
      <ellipse cx="26" cy="16" rx="20" ry="12" fill="#FFFFFF" fillOpacity="0.14" />
    </>
  );
}

export default function SnakeAvatar({ morph = 'Normal', size = 56, src, alt = '', className, dim = false }) {
  return (
    <span
      className={clsx('relative inline-block shrink-0 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]', dim && 'opacity-55', className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <svg viewBox="0 0 64 64" width={size} height={size} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>
          <Pattern morph={morph} />
        </svg>
      )}
      <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]" />
    </span>
  );
}
