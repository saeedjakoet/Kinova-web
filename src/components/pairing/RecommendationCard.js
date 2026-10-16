'use client';

import clsx from 'clsx';
import Icon from '../ui/Icon';
import Button from '../ui/Button';
import { MorphTags, StatusPill, ConfidencePill } from '../ui/Badges';
import { Checkbox } from '../ui/Fields';
import { Callout, Skeleton } from '../ui/Misc';
import SnakeAvatar from '../snake/SnakeAvatar';
import { MatchIndicator } from './Indicators';

function ChangePill({ change }) {
  if (!change || change.from === change.to) return null;
  const up = change.to < change.from;
  const n = Math.abs(change.from - change.to);
  return <StatusPill tone={up ? 'Success' : 'Neutral'}>{up ? '↑' : '↓'} {n} place{n === 1 ? '' : 's'}</StatusPill>;
}

/**
 * Figma: RecommendationCard — State (default|selected|compared|loading) × Layout (desktop 576 | mobile 342).
 * selected = the pairing currently explained in the advisor panel.
 */
export default function RecommendationCard({ rec, layout = 'desktop', selected, compared, onSelect, onView, onAsk, onToggleCompare, compareDisabled, change }) {
  const mobile = layout === 'mobile';
  const m = rec.male;
  const shell = clsx(
    'relative flex w-full flex-col rounded-card border transition-[box-shadow,border-color,background-color]',
    mobile ? 'gap-3 p-4' : 'gap-4 p-5',
    selected ? 'stroke-selected bg-card' : compared ? 'border-line bg-sage-100 shadow-sm' : 'border-line bg-card shadow-sm hover:border-line-strong',
  );
  const headingId = `rec-${m.id}`;

  return (
    <article className={shell} aria-labelledby={headingId} aria-current={selected ? 'true' : undefined}>
      {/* Whole-card click selects the pairing for the advisor panel (buttons inside stop propagation). */}
      <button type="button" onClick={onSelect} className="focus-ring absolute inset-0 rounded-card" aria-label={`Explain ${m.name} (rank ${rec.rank})`} />
      <div className={clsx('pointer-events-none relative flex items-start', mobile ? 'gap-3' : 'gap-4')}>
        {!mobile && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage-100 text-body-sm-md text-forest-900" aria-label={`Rank ${rec.rank}`}>{rec.rank}</span>
        )}
        <SnakeAvatar morph={m.morph} size={mobile ? 44 : 56} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            {mobile && <span className="text-body-sm-md text-moss-700">#{rec.rank}</span>}
            <h3 id={headingId} className="text-h3">{m.name}</h3>
            <Icon name="male" size={16} className="text-stone-500" />
            {!mobile && <span className="text-label text-stone-500">{m.cltchId}</span>}
            <ChangePill change={change} />
          </div>
          <p className="text-body-sm text-charcoal-600">Ball python · {m.age} · {m.weight}</p>
          <MorphTags tags={m.tags} />
        </div>
        <MatchIndicator score={rec.score} size={mobile ? 'xs' : 'sm'} />
      </div>

      <p className={clsx('pointer-events-none relative text-charcoal-700', mobile ? 'text-body-sm' : 'text-body')}>{rec.reason}</p>

      {mobile ? (
        <p className="pointer-events-none relative text-body-sm-md">{rec.stats[0][1]} · Kinship {rec.stats[1][1]}</p>
      ) : (
        <dl className="pointer-events-none relative flex border-y border-line py-3">
          {rec.stats.map(([label, value, note], i) => (
            <div key={label} className={clsx('flex min-w-0 flex-1 flex-col gap-0.5', i === 0 ? 'pr-3.5' : 'border-l border-line px-3.5')}>
              <dt className="text-eyebrow text-stone-500">{label}</dt>
              <dd className="text-body-md">{value}</dd>
              <dd className="text-label text-stone-500">{note}</dd>
            </div>
          ))}
        </dl>
      )}

      {rec.flag && <Callout tone="Missing" size="compact" className="pointer-events-none relative">{rec.flag}</Callout>}

      <div className="relative flex items-center gap-3">
        {!mobile && onToggleCompare && (
          <Checkbox checked={!!compared} disabled={compareDisabled && !compared} onChange={() => onToggleCompare(m.id)} label="Compare" />
        )}
        <ConfidencePill level={rec.confidence} />
        <span className="flex-1" />
        {!mobile && onAsk && <Button variant="ghost" size="sm" onClick={() => onAsk(rec)}>Ask why</Button>}
        <Button variant="secondary" size="sm" iconRight="arrow-right" onClick={() => onView(m.id)} aria-label={`View ${m.name} pairing`}>
          {mobile ? 'Details' : 'View pairing'}
        </Button>
      </div>
    </article>
  );
}

export function RecommendationCardSkeleton({ layout = 'desktop' }) {
  const mobile = layout === 'mobile';
  return (
    <div className={clsx('flex w-full flex-col rounded-card border border-line bg-card shadow-sm', mobile ? 'gap-3 p-4' : 'gap-4 p-5')} aria-hidden="true">
      <div className="flex items-center gap-4">
        <Skeleton className="rounded-full" style={{ width: mobile ? 44 : 56, height: mobile ? 44 : 56 }} />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-[140px]" />
          <Skeleton className={clsx('h-3', mobile ? 'w-[160px]' : 'w-[240px]')} />
          <div className="flex gap-1.5"><Skeleton className="h-[22px] w-14" /><Skeleton className="h-[22px] w-[90px]" /></div>
        </div>
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-3/5" />
      {!mobile && <div className="flex gap-3"><Skeleton className="h-11 flex-1" /><Skeleton className="h-11 flex-1" /><Skeleton className="h-11 flex-1" /></div>}
    </div>
  );
}

/** Figma: ExcludedMaleRow + collapsible "Excluded males" section. */
export function ExcludedMales({ excluded, open, onToggle, compact }) {
  return (
    <section className="overflow-hidden rounded-card border border-line bg-card" aria-label="Excluded males">
      <button type="button" onClick={onToggle} aria-expanded={open}
        className={clsx('focus-ring flex w-full items-center gap-2.5 text-left', compact ? 'px-4 py-3.5' : 'px-5 py-3.5')}>
        <Icon name="ban" size={18} className="text-stone-500" />
        <span className="text-body-md">{excluded.length} male{excluded.length === 1 ? '' : 's'} excluded</span>
        <span className="flex-1 text-body-sm text-stone-500">{compact ? '' : 'Every exclusion has a reason'}</span>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} className="text-stone-500" />
      </button>
      {open && (
        <ul>
          {excluded.map((x) => (
            <li key={x.male.id} className={clsx('flex border-t border-line', compact ? 'flex-col gap-2 px-4 py-3' : 'items-center gap-3.5 px-5 py-3')}>
              <div className={clsx('flex items-center gap-3.5', !compact && 'w-[190px] shrink-0')}>
                <SnakeAvatar morph={x.male.morph} size={36} className="opacity-70" />
                <div className="flex flex-col">
                  <span className="text-body-md">{x.male.name}</span>
                  <span className="text-label text-stone-500">{x.male.line}</span>
                </div>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="inline-flex h-[22px] items-center self-start rounded-tag bg-risk-bg px-2 text-mono-sm text-risk">{x.code}</span>
                <p className="text-body-sm text-charcoal-600">{x.reason}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
