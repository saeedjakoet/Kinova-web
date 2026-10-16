'use client';

import clsx from 'clsx';
import Icon from '../ui/Icon';
import Button from '../ui/Button';
import { MorphTags, StatusPill } from '../ui/Badges';
import { CheckRow, Divider } from '../ui/Misc';
import SnakeAvatar from './SnakeAvatar';

function NameRow({ snake, dim }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={clsx('text-h3', dim ? 'text-charcoal-600' : 'text-charcoal-900')}>{snake.name}</span>
      <Icon name={snake.sex === 'male' ? 'male' : 'female'} size={16} className="text-stone-500" />
      <span className="sr-only">{snake.sex}</span>
    </span>
  );
}

function SelectedBadge({ className }) {
  return (
    <span className={clsx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-700 text-card', className)}>
      <Icon name="check" size={14} />
    </span>
  );
}

/**
 * Figma: SnakeCard — Layout (detailed 264px | compact) × State (default|hover|selected|ineligible).
 * Hover is a CSS state. Ineligible cards stay visible but are disabled, with the reason pill.
 */
export function SnakeCard({ snake, layout = 'detailed', selected = false, onSelect, className }) {
  const inel = !snake.ready;
  const base = clsx(
    'focus-ring group relative text-left transition-[box-shadow,border-color] border',
    inel ? 'bg-ivory-100 border-line cursor-not-allowed' : selected ? 'stroke-selected' : 'bg-card border-line hover:border-line-strong hover:shadow-md',
    selected && layout === 'compact' && 'bg-sage-100',
    selected && layout === 'detailed' && 'bg-card',
  );

  if (layout === 'compact') {
    return (
      <button type="button" disabled={inel} aria-pressed={selected} onClick={onSelect}
        className={clsx(base, 'flex w-full items-center gap-3 rounded-tile px-3.5 py-3', className)}>
        <SnakeAvatar morph={snake.morph} size={44} dim={inel} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <NameRow snake={snake} dim={inel} />
          <span className="text-body-sm text-charcoal-600">{snake.line}</span>
          <span className="text-label text-stone-500">{snake.age} · {snake.weight}</span>
          {(inel || (snake.missingData && snake.missingData.length > 0)) && <StatusPill tone={snake.status[0]} className="mt-1 self-start">{snake.status[1]}</StatusPill>}
        </span>
        {selected ? <SelectedBadge /> : <Icon name="chevron-right" size={18} className="text-stone-400" />}
      </button>
    );
  }

  return (
    <button type="button" disabled={inel} aria-pressed={selected} onClick={onSelect}
      className={clsx(base, 'flex w-full flex-col gap-3 rounded-card p-4 md:w-[264px]', className)}>
      <span className="flex w-full items-center gap-3">
        <SnakeAvatar morph={snake.morph} size={56} dim={inel} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <NameRow snake={snake} dim={inel} />
          <span className="text-body-sm text-stone-500">{snake.cltchId} · Ball python</span>
        </span>
      </span>
      <MorphTags tags={snake.tags} />
      <span className="text-body-sm text-charcoal-600">{snake.age} · {snake.weight}</span>
      <StatusPill tone={snake.status[0]}>{snake.status[1]}</StatusPill>
      {selected && <SelectedBadge className="absolute right-4 top-4" />}
    </button>
  );
}

/** Figma: FemaleSummary — Ready / NotReady with readiness checks. */
export function FemaleSummary({ female, onChange }) {
  const ok = female.ready;
  return (
    <section aria-label={`Selected female: ${female.name}`}
      className={clsx('flex flex-col gap-3.5 rounded-card border bg-card p-4', ok ? 'border-line' : 'border-risk')}>
      <div className="flex items-center gap-3">
        <SnakeAvatar morph={female.morph} size={52} />
        <div className="flex min-w-0 flex-1 flex-col">
          <NameRow snake={female} />
          <span className="text-body-sm text-stone-500">{female.cltchId} · Ball python</span>
        </div>
        {onChange && <Button variant="ghost" size="sm" onClick={onChange}>Change</Button>}
      </div>
      <MorphTags tags={female.tags} />
      <Divider />
      <h4 className="text-eyebrow text-stone-500">Breeding readiness</h4>
      <ul className="flex flex-col gap-2">
        {female.readiness.map(([s, l, v]) => <CheckRow key={l} status={s} label={l} value={v} labelWidth={76} />)}
      </ul>
      <StatusPill tone={!ok ? 'Risk' : female.missingData && female.missingData.length ? 'Caution' : 'Success'} className="self-start">
        {!ok ? 'Not ready · run blocked' : female.missingData && female.missingData.length ? 'Some data missing · check before pairing' : 'Ready to breed'}
      </StatusPill>
    </section>
  );
}
