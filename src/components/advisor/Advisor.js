'use client';

import { useId, useState } from 'react';
import clsx from 'clsx';
import Icon from '../ui/Icon';
import Button, { IconButton } from '../ui/Button';
import { Bullets, Callout, IconTile, Skeleton } from '../ui/Misc';
import { OddsList } from '../pairing/Indicators';

/** Figma: AdvisorMark — calm leaf mark, intentionally not a "sparkle" AI icon. */
export function AdvisorMark({ size = 36 }) {
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-sage-200 text-forest-700" style={{ width: size, height: size }} aria-hidden="true">
      <Icon name="leaf" size={18} />
    </span>
  );
}

/** Figma: EstimateNotice — required at the bottom of every advisor response. */
export function EstimateNotice() {
  return (
    <p className="flex gap-2 rounded-control bg-ivory-100 px-3 py-2.5 text-body-sm text-charcoal-600">
      <Icon name="info" size={16} className="mt-0.5 shrink-0 text-stone-500" />
      <span>Estimates from Mendelian odds and your Cltch records — not guaranteed outcomes. Confirm hets, health and weight before pairing.</span>
    </p>
  );
}

export function FollowUps({ items, onAsk, disabled }) {
  if (!items || !items.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-eyebrow text-stone-500">Ask a follow-up</h4>
      <ul className="flex flex-wrap gap-2">
        {items.map((q) => (
          <li key={q}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onAsk(q)}
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-line-strong bg-card px-3 py-[7px] text-left text-body-sm text-charcoal-900 transition-colors hover:border-moss-500 hover:bg-sage-100 disabled:opacity-50"
            >
              <Icon name="message" size={14} className="shrink-0 text-forest-700" />
              {q}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Composer({ placeholder = 'Ask about this pairing…', onAsk, disabled }) {
  const [value, setValue] = useState('');
  const id = useId();
  const submit = (e) => {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onAsk(value.trim());
    setValue('');
  };
  return (
    <form onSubmit={submit}
      className="flex h-12 items-center gap-2 rounded-tile border border-line-strong bg-card pl-3.5 pr-1.5 focus-within:border-forest-700 focus-within:shadow-[var(--shadow-focus)]">
      <label className="sr-only" htmlFor={id}>{placeholder}</label>
      <input id={id} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-body text-charcoal-900 outline-none placeholder:text-stone-400" />
      <IconButton icon="send" label="Send question" variant="solid" iconSize={16} type="submit" disabled={disabled || !value.trim()} className="disabled:opacity-60" />
    </form>
  );
}

function Section({ icon, title, children }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <IconTile icon={icon} />
        <h4 className="text-h3">{title}</h4>
      </div>
      {children}
    </section>
  );
}

export function PanelShell({ title, subtitle, action, children, className, live }) {
  return (
    <section className={clsx('flex flex-col gap-5 rounded-card border border-line bg-card p-5 shadow-sm', className)} aria-label={title} aria-live={live}>
      <header className="flex items-center gap-3">
        <AdvisorMark />
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="text-h3">{title}</h3>
          {subtitle && <p className="text-body-sm text-stone-500">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function StepRow({ state, title, sub }) {
  return (
    <li className="flex gap-3">
      {state === 'done' && <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success text-card"><Icon name="check" size={12} /></span>}
      {state === 'active' && <Icon name="loader" size={20} className="shrink-0 animate-spin text-forest-700" />}
      {state === 'pending' && <span className="h-5 w-5 shrink-0 rounded-full border-[1.5px] border-line-strong" />}
      <span className="flex flex-col">
        <span className={clsx('text-body-md', state === 'pending' ? 'text-stone-500' : 'text-charcoal-900')}>{title}</span>
        {sub && <span className="text-body-sm text-stone-500">{sub}</span>}
        <span className="sr-only">{state === 'done' ? 'done' : state === 'active' ? 'in progress' : 'pending'}</span>
      </span>
    </li>
  );
}

/** Figma: ExplanationPanel — Streaming state (loading). */
export function StreamingPanel({ female, goalsLabel, step }) {
  const steps = [
    [`Checked ${female.name}'s readiness`, `Mature, ${female.weight}, not gravid`],
    ['Screened 6 males', '3 eligible · 3 excluded with reasons'],
    ['Predicting offspring odds', 'Gene Engine · 3 pairings'],
    ['Ranking and writing the explanation', null],
  ];
  return (
    <PanelShell title="Working on it…" subtitle={goalsLabel} live="polite">
      <ol className="flex flex-col gap-3.5">
        {steps.map(([t, s], i) => <StepRow key={t} title={t} sub={i <= step ? s : null} state={i < step ? 'done' : i === step ? 'active' : 'pending'} />)}
      </ol>
      <div className="flex flex-col gap-2" aria-hidden="true">
        <Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-[200px]" />
      </div>
      <p className="text-body-sm text-stone-500">The advisor explains results calculated by the genetics engine. It doesn&apos;t estimate odds itself.</p>
    </PanelShell>
  );
}

/** Figma: ExplanationPanel — Error state. */
export function ErrorPanel({ subtitle, onRetry }) {
  return (
    <PanelShell title="Explanation unavailable" subtitle={subtitle}>
      <Callout tone="Risk" title="Couldn't write the explanation" role="alert">Rankings and odds are still valid — only the plain-language summary failed to load.</Callout>
      <Button variant="secondary" size="sm" iconLeft="refresh" onClick={onRetry} className="self-start">Try again</Button>
      <EstimateNotice />
    </PanelShell>
  );
}

/** Figma: ExplanationPanel — Expanded / Collapsed. */
export function ExplanationPanel({ explanation, collapsed, onToggle, onAsk, asking }) {
  const e = explanation;
  const toggle = <IconButton icon={collapsed ? 'chevron-down' : 'chevron-up'} label={collapsed ? 'Expand explanation' : 'Collapse explanation'} onClick={onToggle} aria-expanded={!collapsed} />;
  if (collapsed) {
    return (
      <PanelShell title={e.title} subtitle={e.subtitle} action={toggle}>
        <p className="line-clamp-3 text-body text-charcoal-700">{e.summary}</p>
        <Button variant="ghost" size="sm" iconRight="chevron-down" onClick={onToggle} className="self-start">Read full explanation</Button>
      </PanelShell>
    );
  }
  return (
    <PanelShell title={e.title} subtitle={e.subtitle} action={onToggle ? toggle : null}>
      <p className="text-body-lg">{e.summary}</p>
      <Section icon="target" title="How it fits your goals"><Bullets items={e.fits} /></Section>
      <Section icon="egg" title="Possible offspring">
        <OddsList rows={e.odds} />
        <p className="text-label text-stone-500">Chance per egg. A typical clutch is 5–8 eggs, so real results can differ a lot.</p>
      </Section>
      <Section icon="dna" title="Genetics & lineage"><p className="text-body-sm text-charcoal-700">{e.genetics}</p></Section>
      <Callout tone={e.caveat.tone} title={e.caveat.title}>{e.caveat.body}</Callout>
      <FollowUps items={e.followUps} onAsk={onAsk} disabled={asking} />
      <Composer onAsk={onAsk} disabled={asking} />
      <EstimateNotice />
    </PanelShell>
  );
}

export function ChatMessage({ role, text }) {
  if (role === 'user') {
    return (
      <li className="flex flex-col items-end gap-1">
        <p className="max-w-[288px] rounded-[14px_14px_4px_14px] bg-forest-900 px-3.5 py-2.5 text-body text-ivory-50">{text}</p>
        <span className="text-label text-stone-500">You · just now</span>
      </li>
    );
  }
  return (
    <li className="flex gap-2.5">
      <AdvisorMark size={28} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-label text-forest-700">Advisor</span>
        {text ? <p className="text-body text-charcoal-900">{text}</p> : (
          <span className="flex items-center gap-1.5 py-2" aria-label="Advisor is typing">
            {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-pulse rounded-full bg-stone-400" style={{ animationDelay: `${i * 150}ms` }} />)}
          </span>
        )}
      </div>
    </li>
  );
}

/** Figma D08 — conversation inside the advisor panel. */
export function ConversationPanel({ title, subtitle, earlier, messages, changes, results, followUps, onAsk, asking, onBack }) {
  const changed = changes && results ? results.recommendations.map((r) => ({ r, c: changes[r.male.id] })).filter((x) => x.c) : [];
  return (
    <PanelShell title={title} subtitle={subtitle}
      action={onBack ? <IconButton icon="arrow-left" label="Back to explanation" onClick={onBack} /> : null}>
      {earlier && (
        <div className="flex flex-col gap-1 rounded-tile bg-ivory-100 p-3">
          <span className="text-eyebrow text-stone-500">Earlier · {earlier.objective}</span>
          <p className="text-body-sm text-charcoal-600">{earlier.text}</p>
        </div>
      )}
      <ol className="flex flex-col gap-4" aria-live="polite">
        {messages.map((m, i) => <ChatMessage key={i} role={m.role} text={m.text} />)}
      </ol>
      {changed.length > 0 && (
        <div className="flex flex-col gap-2.5 rounded-tile border border-line p-3.5">
          <h4 className="text-eyebrow text-stone-500">What changed</h4>
          <ul className="flex flex-col gap-2.5">
            {changed.map(({ r, c }) => (
              <li key={r.male.id} className="flex items-center gap-2.5">
                <Icon name={c.to < c.from ? 'arrow-up' : 'arrow-down'} size={16} className={c.to < c.from ? 'text-success' : 'text-stone-500'} />
                <span className="w-[70px] shrink-0 text-body-sm-md">{r.male.name}</span>
                <span className="flex-1 text-body-sm text-charcoal-600">#{c.from} → #{c.to} · score {c.fromScore} → {c.toScore}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <FollowUps items={followUps} onAsk={onAsk} disabled={asking} />
      <Composer placeholder="Ask a follow-up…" onAsk={onAsk} disabled={asking} />
      <EstimateNotice />
    </PanelShell>
  );
}
