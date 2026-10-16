'use client';

import { useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';
import Icon from './Icon';

const FIELD = 'w-full rounded-control border bg-card text-body text-charcoal-900 placeholder:text-stone-400 transition-[border-color,box-shadow] outline-none';
const FIELD_STATE = (error, disabled) => clsx(
  error ? 'border-risk' : 'border-line-strong',
  !disabled && 'focus:border-forest-700 focus:shadow-[inset_0_0_0_0.5px_var(--color-forest-700),var(--shadow-focus)]',
  disabled && 'bg-ivory-100 text-stone-400 cursor-not-allowed',
);

function Helper({ id, error, children, counter }) {
  if (!error && !children && !counter) return null;
  return (
    <div className="flex items-center gap-1.5">
      {error && <Icon name="alert" size={14} className="shrink-0 text-risk" />}
      <p id={id} className={clsx('flex-1 text-body-sm', error ? 'text-risk' : 'text-stone-500')}>{error || children}</p>
      {counter && <span className="text-label text-stone-500">{counter}</span>}
    </div>
  );
}

/** Figma: Input/Textarea — goal prompt, 132px high, counter bottom-right. */
export function Textarea({ label, value, onChange, placeholder, helper, error, disabled, maxLength = 500, className }) {
  const id = useId();
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-body-sm-md text-charcoal-700">{label}</label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        aria-invalid={!!error}
        aria-describedby={id + '-help'}
        className={clsx(FIELD, FIELD_STATE(error, disabled), 'h-[132px] resize-none px-3.5 py-3')}
      />
      <Helper id={id + '-help'} error={error} counter={`${value.length} / ${maxLength}`}>{helper}</Helper>
    </div>
  );
}

/** Figma: Input/Text — 44px field with label, helper/error and an optional trailing control. */
export function TextInput({ label, value, onChange, type = 'text', placeholder, error, helper, autoComplete, disabled, trailing, inputRef, className, ...rest }) {
  const id = useId();
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-body-sm-md text-charcoal-700">{label}</label>
      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error || helper ? id + '-help' : undefined}
          className={clsx(FIELD, FIELD_STATE(error, disabled), 'h-11 px-3.5', trailing && 'pr-12')}
          {...rest}
        />
        {trailing && <span className="absolute right-1 top-1/2 -translate-y-1/2">{trailing}</span>}
      </div>
      <Helper id={id + '-help'} error={error}>{helper}</Helper>
    </div>
  );
}

/** Figma: Input/Search — 44px, search icon, no visible label. */
export function SearchInput({ value, onChange, placeholder = 'Search by name, ID or morph', label = 'Search', className, autoFocus }) {
  return (
    <div className={clsx('relative', className)}>
      <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
      <input
        type="search"
        aria-label={label}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={clsx(FIELD, FIELD_STATE(false, false), 'h-11 pl-[40px] pr-3.5')}
      />
    </div>
  );
}

/**
 * Figma: Select — Closed/Open. Custom listbox so options can show avatars like the design.
 * options: [{ value, label, leading }]
 */
export function Select({ label, value, options, onChange, disabled, className }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();
  const ref = useRef(null);
  const listRef = useRef(null);
  const current = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (open && listRef.current) listRef.current.focus();
  }, [open]);

  const choose = (o) => { onChange(o.value); setOpen(false); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(options[active]); }
    else if (e.key === 'Escape' || e.key === 'Tab') setOpen(false);
  };

  return (
    <div className={clsx('relative flex flex-col gap-1.5', className)} ref={ref}>
      <span id={id + '-label'} className="text-body-sm-md text-charcoal-700">{label}</span>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={() => { setActive(Math.max(0, options.indexOf(current))); setOpen((o) => !o); }}
        className={clsx(FIELD, 'flex h-11 items-center gap-2 px-3.5 text-left',
          open ? 'border-forest-700 shadow-[inset_0_0_0_0.5px_var(--color-forest-700),var(--shadow-focus)]' : 'border-line-strong',
          disabled && 'bg-ivory-100 text-stone-400', 'focus-visible:border-forest-700 focus-visible:shadow-[var(--shadow-focus)]')}
      >
        <span id={id + '-value'} className="flex-1 truncate">{current.label}</span>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} className="text-charcoal-600" />
      </button>
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={id + '-label'}
          aria-activedescendant={`${id}-opt-${active}`}
          onKeyDown={onKey}
          className="absolute left-0 right-0 top-full z-30 mt-1.5 flex animate-fade-in flex-col gap-0.5 rounded-tile border border-line bg-card p-1.5 shadow-md outline-none"
        >
          {options.map((o, i) => {
            const sel = o.value === current.value;
            return (
              <li
                key={String(o.value)}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={sel}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(o)}
                className={clsx('flex h-10 cursor-pointer items-center gap-2.5 rounded-icon px-2.5 text-body-sm text-charcoal-900',
                  sel ? 'bg-sage-100' : i === active ? 'bg-ivory-100' : '')}
              >
                {o.leading}
                <span className="flex-1 truncate">{o.label}</span>
                {sel && <Icon name="check" size={16} className="text-forest-700" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Figma: Checkbox — Unchecked/Checked, 18px box. */
export function Checkbox({ checked, onChange, label, disabled }) {
  return (
    <label className={clsx('inline-flex items-center gap-2 text-body-sm-md text-charcoal-700', disabled ? 'opacity-50' : 'cursor-pointer')}>
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden="true"
        className={clsx('flex h-[18px] w-[18px] items-center justify-center rounded-[5px] peer-focus-visible:shadow-[var(--shadow-focus)] peer-focus-visible:outline-[1.5px] peer-focus-visible:outline-forest-700',
          checked ? 'bg-forest-700' : 'border-[1.5px] border-line-strong bg-card')}
      >
        {checked && <Icon name="check" size={12} className="text-card" />}
      </span>
      {label}
    </label>
  );
}
