'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import Chip from '../ui/Chip';
import Button from '../ui/Button';
import { Textarea } from '../ui/Fields';
import { Callout } from '../ui/Misc';
import { OBJECTIVES, TRAIT_OPTIONS, CONSTRAINT_OPTIONS } from '@/lib/goals';

function Group({ label, children, id }) {
  return (
    <div className="flex flex-col gap-2" role="group" aria-labelledby={id}>
      <span id={id} className="text-body-sm-md text-charcoal-700">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/** Small popover menu for "Add trait" / "Add constraint". */
function AddMenu({ label, options, onPick, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <span className="relative" ref={ref}>
      <Chip type="neutral" icon="plus" disabled={disabled || !options.length} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">{label}</Chip>
      {open && (
        <ul role="menu" className="absolute left-0 top-full z-30 mt-1.5 flex min-w-[200px] animate-fade-in flex-col gap-0.5 rounded-tile border border-line bg-card p-1.5 shadow-md">
          {options.map((o) => (
            <li key={o.value} role="none">
              <button type="button" role="menuitem" onClick={() => { onPick(o.value); setOpen(false); }}
                className="focus-ring flex h-9 w-full items-center rounded-icon px-2.5 text-left text-body-sm text-charcoal-900 hover:bg-ivory-100">
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}

/**
 * Goals: free-text prompt + structured chips (objective single-select; traits & constraints multi-select)
 * + preferred male + primary action. Used in the desktop rail, tablet sheet and mobile step 2.
 */
export default function GoalsForm({ goals, onChange, disabled, disabledText, onSubmit, submitLabel = 'Find pairings', loading, showAction = true, error }) {
  const set = (patch) => onChange({ ...goals, ...patch });
  const constraintLabel = (id) => (CONSTRAINT_OPTIONS.find((c) => c.id === id) || {}).label;

  return (
    <div className={clsx('flex flex-col gap-4', disabled && 'opacity-55')}>
      {!disabled && (
        <Callout tone="Info" size="compact">Season goals aren&apos;t connected yet — ranking uses provisional criteria. These settings don&apos;t change results for now.</Callout>
      )}
      <Textarea
        label="What are you hoping to produce?"
        value={disabled ? '' : goals.text}
        placeholder={disabled ? disabledText || 'Choose a female first' : 'e.g. Visual Clowns with Pastel, avoid Spider, proven male…'}
        onChange={(v) => set({ text: v })}
        disabled={disabled}
        helper="Plain language is fine — the advisor turns this into structured goals."
        error={!disabled && error ? error : null}
      />
      <Group label="Objective" id="g-objective">
        <span role="radiogroup" aria-labelledby="g-objective" className="contents">
          {OBJECTIVES.map((o) => (
            <Chip key={o} type="objective" role="radio" selected={!disabled && goals.objective === o} disabled={disabled} onClick={() => set({ objective: o })}>{o}</Chip>
          ))}
        </span>
      </Group>
      <Group label="Target traits" id="g-traits">
        {!disabled && goals.traits.map((t) => (
          <Chip key={t} type="trait" selected onRemove={() => set({ traits: goals.traits.filter((x) => x !== t) })} removeLabel={`Remove target ${t}`}>{t}</Chip>
        ))}
        <AddMenu label="Add trait" disabled={disabled}
          options={TRAIT_OPTIONS.filter((t) => !goals.traits.includes(t)).map((t) => ({ value: t, label: t }))}
          onPick={(t) => set({ traits: [...goals.traits, t] })} />
      </Group>
      <Group label="Constraints" id="g-constraints">
        {!disabled && CONSTRAINT_OPTIONS.filter((c) => goals.constraints.includes(c.id) || c.id === 'maxKinship').map((c) => {
          const on = goals.constraints.includes(c.id);
          return on ? (
            <Chip key={c.id} type={c.kind === 'Avoid' ? 'avoid' : 'objective'} selected onRemove={() => set({ constraints: goals.constraints.filter((x) => x !== c.id) })} removeLabel={`Remove ${c.label}`}>{c.label}</Chip>
          ) : (
            <Chip key={c.id} type="objective" selected={false} onClick={() => set({ constraints: [...goals.constraints, c.id] })}>{c.label}</Chip>
          );
        })}
        <AddMenu label="Add constraint" disabled={disabled}
          options={CONSTRAINT_OPTIONS.filter((c) => !goals.constraints.includes(c.id) && c.id !== 'maxKinship').map((c) => ({ value: c.id, label: constraintLabel(c.id) }))}
          onPick={(id) => set({ constraints: [...goals.constraints, id] })} />
      </Group>
      {showAction && (
        <>
          <Button variant="primary" size="md" iconLeft="search" loading={loading} disabled={disabled} onClick={onSubmit} className="w-full">
            {loading ? 'Finding pairings…' : submitLabel}
          </Button>
          <p className="text-center text-label text-stone-500">
            {disabled ? 'Select a ready female to set goals.' : 'Ranks your eligible males · top 10 checked first'}
          </p>
        </>
      )}
    </div>
  );
}
