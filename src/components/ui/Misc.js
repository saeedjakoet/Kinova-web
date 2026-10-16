'use client';

import { useRef } from 'react';
import clsx from 'clsx';
import Icon from './Icon';

const CALLOUT = {
  Success: { box: 'bg-success-bg', fg: 'text-success', title: 'text-success', icon: 'check', t: 'Looks good' },
  Info: { box: 'bg-info-bg', fg: 'text-info', title: 'text-info', icon: 'info', t: 'Good to know' },
  Caution: { box: 'bg-caution-bg', fg: 'text-caution', title: 'text-caution', icon: 'alert', t: 'Things to consider' },
  Risk: { box: 'bg-risk-bg', fg: 'text-risk', title: 'text-risk', icon: 'alert', t: 'Welfare risk' },
  Missing: { box: 'bg-ivory-100 border border-dashed border-line-strong', fg: 'text-charcoal-600', title: 'text-charcoal-900', icon: 'help', t: 'Missing information' },
};

/** Figma: Callout — Tone (Info|Caution|Risk|Missing|Success) × Size (default|compact; compact hides title). */
export function Callout({ tone = 'Info', size = 'default', title, children, className, role }) {
  const c = CALLOUT[tone];
  const compact = size === 'compact';
  return (
    <div role={role} className={clsx('flex gap-2.5 rounded-tile', compact ? 'px-3 py-2.5' : 'px-4 py-3.5', c.box, className)}>
      <Icon name={c.icon} size={compact ? 16 : 18} className={clsx('mt-0.5 shrink-0', c.fg)} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {!compact && <p className={clsx('text-body-sm-md', c.title)}>{title || c.t}</p>}
        <p className="text-body-sm text-charcoal-700">{children}</p>
      </div>
    </div>
  );
}

/** Figma: Tab — underline tabs (44px). Arrow keys move between tabs. */
export function Tabs({ items, active, onChange, label, className }) {
  const refs = useRef([]);
  const onKey = (e, i) => {
    let n = null;
    if (e.key === 'ArrowRight') n = (i + 1) % items.length;
    if (e.key === 'ArrowLeft') n = (i - 1 + items.length) % items.length;
    if (n != null) { e.preventDefault(); onChange(items[n]); refs.current[n] && refs.current[n].focus(); }
  };
  return (
    <div role="tablist" aria-label={label} className={clsx('flex gap-6 overflow-x-auto border-b border-line', className)}>
      {items.map((t, i) => {
        const a = t === active;
        return (
          <button
            key={t}
            ref={(el) => { refs.current[i] = el; }}
            role="tab"
            aria-selected={a}
            tabIndex={a ? 0 : -1}
            onClick={() => onChange(t)}
            onKeyDown={(e) => onKey(e, i)}
            className={clsx('focus-ring -mb-px h-11 shrink-0 border-b-2 px-1 text-body-md transition-colors',
              a ? 'border-forest-900 text-charcoal-900' : 'border-transparent text-stone-500 hover:text-charcoal-700')}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

/** Figma: Segmented control (odds view). */
export function Segmented({ items, active, onChange, label, className }) {
  return (
    <div role="radiogroup" aria-label={label} className={clsx('inline-flex gap-1 rounded-control bg-ivory-100 p-1', className)}>
      {items.map((s, i) => {
        const on = i === active;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(i)}
            className={clsx('focus-ring h-8 whitespace-nowrap rounded-icon px-3 text-body-sm-md transition-colors',
              on ? 'bg-card text-charcoal-900 shadow-sm' : 'text-stone-500 hover:text-charcoal-700')}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}

export function Skeleton({ className, style }) {
  return <span aria-hidden="true" className={clsx('block animate-pulse rounded-tag bg-ivory-100', className)} style={style} />;
}

/** 28px sage icon tile used by section headers. */
export function IconTile({ icon, size = 28, iconSize = 16, className }) {
  return (
    <span className={clsx('inline-flex shrink-0 items-center justify-center rounded-icon bg-sage-100 text-forest-700', className)} style={{ width: size, height: size }}>
      <Icon name={icon} size={iconSize} />
    </span>
  );
}

export function Divider({ className }) {
  return <hr className={clsx('h-px w-full border-0 bg-line', className)} />;
}

export function Bullets({ items, size = 'sm', className }) {
  return (
    <ul className={clsx('flex flex-col gap-1.5', className)}>
      {items.map((s) => (
        <li key={s} className="flex gap-2.5">
          <span aria-hidden="true" className={clsx('h-1.5 w-1.5 shrink-0 rounded-full bg-moss-500', size === 'sm' ? 'mt-[7px]' : 'mt-[9px]')} />
          <span className={clsx('text-charcoal-700', size === 'sm' ? 'text-body-sm' : 'text-body')}>{s}</span>
        </li>
      ))}
    </ul>
  );
}

const CHECK = {
  ok: { icon: 'check', fg: 'text-success', bg: 'bg-success-bg', sr: 'Passed' },
  warn: { icon: 'alert', fg: 'text-caution', bg: 'bg-caution-bg', sr: 'Warning' },
  fail: { icon: 'x', fg: 'text-risk', bg: 'bg-risk-bg', sr: 'Failed' },
};

/** Status + label + value row (readiness, data completeness, lineage). */
export function CheckRow({ status, label, value, labelWidth = 96 }) {
  const c = CHECK[status];
  return (
    <li className="flex items-start gap-2.5">
      <span className={clsx('flex h-5 w-5 shrink-0 items-center justify-center rounded-full', c.bg, c.fg)}>
        <Icon name={c.icon} size={12} />
        <span className="sr-only">{c.sr}</span>
      </span>
      <span className="shrink-0 text-body-sm text-charcoal-600" style={{ width: labelWidth }}>{label}</span>
      <span className={clsx('min-w-0 flex-1 text-body-sm-md', status === 'fail' ? 'text-risk' : 'text-charcoal-900')}>{value}</span>
    </li>
  );
}

export function StepMarker({ n, state }) {
  if (state === 'done') {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-700 text-ivory-50">
        <Icon name="check" size={14} />
      </span>
    );
  }
  return (
    <span className={clsx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-label',
      state === 'current' ? 'bg-forest-900 text-ivory-50' : 'border border-line-strong bg-card text-stone-500')}>
      {n}
    </span>
  );
}
