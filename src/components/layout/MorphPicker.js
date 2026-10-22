'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import Chip from '../ui/Chip';
import Icon from '../ui/Icon';
import { searchMorphs } from '@/lib/api';

const FORM_HINT = { het: 'Het', super: 'Super', visual: '' };

/**
 * Season-target picker backed by the Cltch morph catalogue (GET /api/cltch/morphs).
 * Options are morph forms ("Clown", "Het Clown", "Super Pastel") or combo morphs ("Banana Clown").
 */
export default function MorphPicker({ selected, onAdd, disabled, max = 4 }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [state, setState] = useState({ loading: false, items: [], error: null });
  const ref = useRef(null);
  const inputRef = useRef(null);
  const full = selected.length >= max;

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    if (inputRef.current) inputRef.current.focus();
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    const t = setTimeout(() => {
      searchMorphs(q, { limit: 30 })
        .then((items) => { if (alive) setState({ loading: false, items, error: null }); })
        .catch((e) => { if (alive) setState({ loading: false, items: [], error: e.message }); });
    }, 200);
    return () => { alive = false; clearTimeout(t); };
  }, [q, open]);

  const chosen = new Set(selected.map((t) => t.id));
  const items = state.items.filter((o) => !chosen.has(o.id));

  return (
    <span className="relative" ref={ref}>
      <Chip type="neutral" icon="plus" disabled={disabled || full} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="listbox">
        {full ? `Max ${max} targets` : 'Add target'}
      </Chip>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 flex w-[312px] max-w-[calc(100vw-32px)] animate-fade-in flex-col gap-1.5 rounded-tile border border-line bg-card p-2 shadow-md">
          <div className="relative">
            <Icon name="search" size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search morphs or combos…"
              aria-label="Search morphs or combos"
              className="h-9 w-full rounded-icon border border-line-strong pl-8 pr-2 text-body-sm outline-none focus:border-forest-700"
            />
          </div>
          <ul role="listbox" aria-label="Morphs" className="flex max-h-[320px] flex-col gap-0.5 overflow-y-auto">
            {state.loading && <li className="px-2.5 py-2 text-body-sm text-stone-500">Loading catalogue…</li>}
            {state.error && <li className="px-2.5 py-2 text-body-sm text-risk">{state.error}</li>}
            {!state.loading && !state.error && items.length === 0 && (
              <li className="px-2.5 py-2 text-body-sm text-stone-500">No morphs match “{q}”.</li>
            )}
            {!state.loading && items.map((o) => (
              <li key={o.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  disabled={o.isCombo && !o.usable}
                  title={o.isCombo && !o.usable ? "This combo's genes aren't available in the catalogue" : o.name}
                  onClick={() => { onAdd({ id: o.id, name: o.name, form: o.form, isCombo: o.isCombo, typeLabel: o.typeLabel }); setOpen(false); setQ(''); }}
                  className={clsx('focus-ring flex w-full flex-col items-start gap-0.5 rounded-icon px-2.5 py-2 text-left hover:bg-ivory-100',
                    o.isCombo && !o.usable && 'opacity-40')}
                >
                  {/* Full name, wrapping onto a second line if needed; type label underneath so it never squeezes the name. */}
                  <span className="w-full break-words text-body-sm-md text-charcoal-900">{o.name}</span>
                  <span className="text-label text-stone-500">
                    {o.isCombo ? 'Combo' : [FORM_HINT[o.form], o.typeLabel].filter(Boolean).join(' · ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  );
}
