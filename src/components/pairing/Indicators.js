import clsx from 'clsx';
import Icon from '../ui/Icon';

export const LEVELS = {
  Strong: { ring: 'var(--color-forest-700)', text: 'text-forest-700', label: 'Strong fit' },
  Good: { ring: 'var(--color-moss-500)', text: 'text-moss-700', label: 'Good fit' },
  Fair: { ring: 'var(--color-amber-500)', text: 'text-caution', label: 'Fair fit' },
  Low: { ring: 'var(--color-risk)', text: 'text-risk', label: 'Weak fit' },
};

export function levelFor(score) {
  return score >= 80 ? 'Strong' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Low';
}

function Ring({ d, thick, score, color, scoreClass, testId }) {
  const r = (d - thick) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: d, height: d }}>
      <svg width={d} height={d} viewBox={`0 0 ${d} ${d}`} className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx={d / 2} cy={d / 2} r={r} fill="none" stroke="var(--color-line)" strokeWidth={thick} />
        <circle cx={d / 2} cy={d / 2} r={r} fill="none" stroke={color} strokeWidth={thick} strokeDasharray={`${(c * score) / 100} ${c}`} />
      </svg>
      <span className={clsx('relative text-charcoal-900', scoreClass)} data-testid={testId}>{score}</span>
    </span>
  );
}

/** Figma: MatchIndicator — Level × Size (lg 112 | sm 48 | xs 44). Score is goal fit, not a success probability. */
export function MatchIndicator({ score, size = 'sm', caption, testId }) {
  const lvl = LEVELS[levelFor(score)];
  const sr = `Match score ${score} out of 100, ${lvl.label}`;
  if (size === 'xs') {
    return <span role="img" aria-label={sr}><Ring d={44} thick={4} score={score} color={lvl.ring} scoreClass="text-score-sm" testId={testId} /></span>;
  }
  if (size === 'sm') {
    return (
      <span className="inline-flex shrink-0 items-center gap-2.5" role="img" aria-label={sr}>
        <Ring d={48} thick={5} score={score} color={lvl.ring} scoreClass="text-score-sm" testId={testId} />
        <span className="flex flex-col" aria-hidden="true">
          <span className={clsx('text-body-sm-md', lvl.text)}>{lvl.label}</span>
          <span className="text-label text-stone-500">{caption || 'Match score'}</span>
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex flex-col items-center gap-2" role="img" aria-label={sr}>
      <Ring d={112} thick={10} score={score} color={lvl.ring} scoreClass="text-score-lg" testId={testId} />
      <span className={clsx('text-body-md', lvl.text)} aria-hidden="true">{lvl.label}</span>
      <span className="text-label text-stone-500" aria-hidden="true">{caption ? `${caption} out of 100` : 'Match score out of 100'}</span>
    </span>
  );
}

const ODDS = {
  Target: { bar: 'bg-forest-700', label: 'text-charcoal-900', pct: 'text-charcoal-900', icon: 'text-forest-700' },
  Standard: { bar: 'bg-moss-500', label: 'text-charcoal-900', pct: 'text-charcoal-900', icon: '' },
  Muted: { bar: 'bg-stone-400', label: 'text-charcoal-600', pct: 'text-stone-500', icon: '' },
};

/** Figma: OddsRow — Tone (Target|Standard|Muted). Chance per egg with an 8px bar. */
export function OddsRow({ label, pct, tone = 'Standard', note }) {
  const t = ODDS[tone];
  return (
    <li className="flex flex-col gap-1.5" data-testid="odds-row">
      <div className="flex items-center gap-2">
        {tone === 'Target' && <Icon name="target" size={14} className={t.icon} />}
        <span className={clsx('flex-1 text-body-sm-md', t.label)} data-testid="odds-label">
          {label}
          {tone === 'Target' && <span className="sr-only"> (matches your goal)</span>}
        </span>
        <span className={clsx('text-body-sm-md tabular-nums', t.pct)} data-testid="odds-pct">{pct}%</span>
      </div>
      <span className="block h-2 overflow-hidden rounded-[4px] bg-ivory-100" aria-hidden="true">
        <span className={clsx('block h-full rounded-[4px] transition-[width] duration-300', t.bar)} style={{ width: `${Math.max(pct, pct > 0 ? 1 : 0)}%` }} />
      </span>
      {note && <span className="text-label text-stone-500">{note}</span>}
    </li>
  );
}

export function OddsList({ rows, className }) {
  return (
    <ul className={clsx('flex flex-col gap-3', className)}>
      {rows.map((r) => <OddsRow key={r.label} {...r} />)}
    </ul>
  );
}
