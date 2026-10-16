'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { clearSession, useSession } from '@/lib/auth';
import Icon from '../ui/Icon';
import Button, { IconButton } from '../ui/Button';
import { PocBadge, StatusPill } from '../ui/Badges';
import { StepMarker } from '../ui/Misc';

function LogoMark({ size = 32 }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center bg-forest-900 text-logo text-ivory-50" style={{ width: size, height: size, borderRadius: size / 4 }} aria-hidden="true">K</span>
  );
}

const NAV = [
  { label: 'My Snakes', short: 'Snakes', icon: 'grid', href: '#' },
  { label: 'Pairing Advisor', short: 'Advisor', icon: 'dna', href: '/advisor', active: true },
  { label: 'History', short: 'History', icon: 'history', href: '#' },
];

function Nav({ compact }) {
  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      {NAV.map((n) => (
        <a key={n.label} href={n.href} aria-current={n.active ? 'page' : undefined}
          aria-disabled={n.href === '#' || undefined}
          onClick={(e) => { if (n.href === '#') e.preventDefault(); }}
          title={n.href === '#' ? 'Not part of the PoC' : undefined}
          className={clsx('focus-ring inline-flex h-9 items-center gap-2 rounded-icon px-3 text-body-sm-md transition-colors',
            n.active ? 'bg-sage-100 text-forest-900' : 'text-charcoal-600 hover:bg-ivory-100')}>
          <Icon name={n.icon} size={16} />
          {compact ? n.short : n.label}
        </a>
      ))}
    </nav>
  );
}

function initialsOf(email) {
  const name = (email || '').split('@')[0];
  const parts = name.split(/[._-]+/).filter(Boolean);
  return ((parts[0] || 'K')[0] + ((parts[1] || '')[0] || (parts[0] || '')[1] || '')).toUpperCase();
}

function Account({ withName }) {
  const session = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const email = session && session.user ? session.user.email : '';

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const signOut = () => {
    clearSession();
    router.replace('/login');
  };

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}
        className="focus-ring flex items-center gap-2 rounded-control" aria-label={`Account${email ? `: ${email}` : ''}`}>
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sand-300 text-label text-charcoal-900">{initialsOf(email)}</span>
        {withName && (
          <>
            <span className="flex max-w-[180px] flex-col text-left">
              <span className="truncate text-body-sm-md">{email || 'Kinova Reptiles'}</span>
              <span className="text-label text-stone-500">Breeder workspace</span>
            </span>
            <Icon name="chevron-down" size={16} className="text-stone-500" />
          </>
        )}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-1.5 flex min-w-[220px] animate-fade-in flex-col gap-0.5 rounded-tile border border-line bg-card p-1.5 shadow-md">
          {email && <p className="truncate px-2.5 py-2 text-label text-stone-500">Signed in as {email}</p>}
          <button type="button" role="menuitem" onClick={signOut}
            className="focus-ring flex h-9 w-full items-center gap-2 rounded-icon px-2.5 text-left text-body-sm text-charcoal-900 hover:bg-ivory-100">
            <Icon name="log-out" size={16} className="text-charcoal-600" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/** Figma: Header — Breakpoint Desktop (≥1280) / Tablet (768–1279) / Mobile (<768). */
export function Header({ breakpoint }) {
  if (breakpoint === 'mobile') {
    return (
      <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-line bg-card px-3">
        <IconButton icon="menu" label="Menu" />
        <LogoMark size={28} />
        <span className="text-body-sm-md">Breeding Advisor</span>
        <PocBadge />
        <span className="flex-1" />
        <Account />
      </header>
    );
  }
  const tablet = breakpoint === 'tablet';
  return (
    <header className={clsx('sticky top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-card', tablet ? 'px-5' : 'px-8')}>
      <div className={clsx('flex items-center', tablet ? 'gap-2' : 'gap-3')}>
        <LogoMark />
        <span className="text-brand text-forest-900">Kinova</span>
        {!tablet && <span className="h-5 w-px bg-line" aria-hidden="true" />}
        {!tablet && <span className="text-body-md text-charcoal-700">Breeding Advisor</span>}
        <PocBadge />
      </div>
      <Nav compact={tablet} />
      <div className={clsx('flex items-center', tablet ? 'gap-2' : 'gap-4')}>
        {!tablet && <StatusPill tone="Info">Sample data</StatusPill>}
        {!tablet && <IconButton icon="help" label="Help" />}
        <Account withName={!tablet} />
      </div>
    </header>
  );
}

/** Figma: Stepper — Female → Goals → Pairings. */
export function Stepper({ current }) {
  const labels = ['Female', 'Goals', 'Pairings'];
  return (
    <ol className="flex items-center gap-2.5" aria-label="Progress">
      {labels.map((l, i) => {
        const n = i + 1;
        const st = n < current ? 'done' : n === current ? 'current' : 'upcoming';
        return (
          <li key={l} className="flex items-center gap-2.5" aria-current={st === 'current' ? 'step' : undefined}>
            {i > 0 && <span className={clsx('h-[1.5px] w-7', n <= current ? 'bg-forest-700' : 'bg-line-strong')} aria-hidden="true" />}
            <span className="flex items-center gap-2">
              <StepMarker n={n} state={st} />
              <span className={clsx('text-body-sm-md', st === 'upcoming' ? 'text-stone-500' : 'text-charcoal-900')}>{l}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function SubHeader({ step, onStartOver }) {
  return (
    <div className="flex h-[60px] items-center gap-4 border-b border-line bg-ivory-50 px-8">
      <h1 className="text-title">Pairing Advisor</h1>
      <span className="h-5 w-px bg-line" aria-hidden="true" />
      <Stepper current={step} />
      <span className="flex-1" />
      <span className="text-body-sm text-stone-500">Season 2026 · draft run</span>
      <Button variant="ghost" size="sm" iconLeft="refresh" onClick={onStartOver}>Start over</Button>
    </div>
  );
}

/** Mobile stepper with progress bar (M01–M03). */
export function MobileStepper({ step, title }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center">
        <span className="text-eyebrow text-moss-700">Step {step} of 3</span>
        <span className="flex-1" />
        <span className="text-label text-stone-500">{['Female', 'Goals', 'Pairings'][step - 1]}</span>
      </div>
      <span className="block h-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step} aria-label="Progress">
        <span className="block h-full rounded-full bg-forest-700 transition-[width]" style={{ width: `${(step / 3) * 100}%` }} />
      </span>
      <h1 className="text-h1">{title}</h1>
    </div>
  );
}

export function ResultsHeader({ eyebrow, title, sub, right, as: H = 'h2' }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-eyebrow text-moss-700">{eyebrow}</span>
      <div className="flex flex-wrap items-center gap-3">
        <H className="min-w-0 flex-1 text-h1">{title}</H>
        {right}
      </div>
      {sub && <p className="text-body-sm text-charcoal-600">{sub}</p>}
    </div>
  );
}

const STATES = {
  Start: { icon: 'leaf', bg: 'bg-sage-100', fg: 'text-forest-700' },
  NoResults: { icon: 'search', bg: 'bg-ivory-100', fg: 'text-charcoal-600' },
  NotReady: { icon: 'alert', bg: 'bg-caution-bg', fg: 'text-caution' },
  Error: { icon: 'alert', bg: 'bg-risk-bg', fg: 'text-risk' },
};

/** Figma: FeedbackState — Start | NoResults | NotReady | Error. */
export function FeedbackState({ type, title, body, code, primary, secondary }) {
  const s = STATES[type];
  return (
    <section className="flex flex-col items-center gap-4 rounded-card border border-line bg-card px-6 py-12 text-center md:px-10" role={type === 'Error' ? 'alert' : undefined}>
      <span className={clsx('flex h-[72px] w-[72px] items-center justify-center rounded-full', s.bg, s.fg)}>
        <Icon name={s.icon} size={32} />
      </span>
      <h2 className="text-h2">{title}</h2>
      <p className="max-w-[440px] text-body text-charcoal-600">{body}</p>
      {code && <span className="inline-flex h-6 items-center rounded-tag bg-ivory-100 px-2 text-mono-sm text-charcoal-600">{code}</span>}
      {(primary || secondary) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {primary && <Button variant="primary" iconLeft={primary.icon} onClick={primary.onClick}>{primary.label}</Button>}
          {secondary && <Button variant="secondary" onClick={secondary.onClick}>{secondary.label}</Button>}
        </div>
      )}
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    ['1', 'female', 'Choose a female', 'Readiness is checked first: age, weight and gravid status.'],
    ['2', 'sliders', 'Describe your goals', 'Free text plus chips for objective, traits and constraints.'],
    ['3', 'columns', 'Review ranked pairings', 'Scores, offspring odds and caveats — and why others were excluded.'],
  ];
  return (
    <section className="flex flex-col gap-3" aria-labelledby="how-title">
      <h3 id="how-title" className="text-eyebrow text-stone-500">How the advisor works</h3>
      <ol className="grid gap-3 md:grid-cols-3">
        {steps.map(([n, icon, t, b]) => (
          <li key={n} className="flex flex-col gap-2 rounded-tile border border-line bg-card p-4">
            <span className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-icon bg-sage-100 text-forest-700"><Icon name={icon} size={16} /></span>
              <span className="text-label text-stone-500">{n}</span>
            </span>
            <span className="text-body-md">{t}</span>
            <span className="text-body-sm text-charcoal-600">{b}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
