import clsx from 'clsx';

const TAG = {
  Visual: 'bg-sage-200 text-forest-900 border-transparent',
  Het: 'bg-card text-charcoal-700 border-line-strong',
  PossibleHet: 'bg-clay-100 text-clay-700 border-clay-500 border-dashed',
  Super: 'bg-forest-900 text-ivory-50 border-transparent',
};

/** Figma: MorphTag — Kind (Visual|Het|PossibleHet|Super), 24px high. */
export function MorphTag({ kind = 'Visual', children }) {
  return <span className={clsx('inline-flex h-6 items-center rounded-tag border px-2 text-label', TAG[kind])}>{children}</span>;
}

export function MorphTags({ tags, className }) {
  return (
    <ul className={clsx('flex flex-wrap gap-1.5', className)} aria-label="Genetics">
      {tags.map(([kind, label]) => (
        <li key={label}><MorphTag kind={kind}>{label}</MorphTag></li>
      ))}
    </ul>
  );
}

export const TONES = {
  Success: { bg: 'bg-success-bg', fg: 'text-success', dot: 'bg-success' },
  Info: { bg: 'bg-info-bg', fg: 'text-info', dot: 'bg-info' },
  Caution: { bg: 'bg-caution-bg', fg: 'text-caution', dot: 'bg-caution' },
  Risk: { bg: 'bg-risk-bg', fg: 'text-risk', dot: 'bg-risk' },
  Neutral: { bg: 'bg-ivory-100', fg: 'text-charcoal-700', dot: 'bg-charcoal-700' },
};

/** Figma: StatusPill — Tone (Success|Info|Caution|Risk|Neutral). Always text + dot, never colour alone. */
export function StatusPill({ tone = 'Success', children, className }) {
  const t = TONES[tone];
  return (
    <span className={clsx('inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-label', t.bg, t.fg, className)}>
      <span className={clsx('h-1.5 w-1.5 rounded-full', t.dot)} aria-hidden="true" />
      {children}
    </span>
  );
}

/** Figma: PoC badge in the header. */
export function PocBadge() {
  return (
    <span className="inline-flex h-[22px] shrink-0 items-center rounded-tag border border-dashed border-clay-500 bg-clay-100 px-2 text-label text-clay-700">
      PoC · Prototype
    </span>
  );
}

/** Figma: ConfidencePill — Level (High|Medium|Low). Separate from the match score. */
export function ConfidencePill({ level = 'High' }) {
  const n = { High: 3, Medium: 2, Low: 1 }[level];
  const col = { High: 'bg-forest-700', Medium: 'bg-amber-500', Low: 'bg-risk' }[level];
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-ivory-100 px-2.5 text-label text-charcoal-700">
      <span className="flex items-end gap-0.5" aria-hidden="true">
        {[6, 9, 12].map((h, i) => (
          <span key={h} className={clsx('w-[3px] rounded-[1px]', i < n ? col : 'bg-stone-200')} style={{ height: h }} />
        ))}
      </span>
      {level} confidence
    </span>
  );
}
