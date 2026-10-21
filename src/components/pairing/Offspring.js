'use client';

import { useEffect, useState } from 'react';
import Button from '../ui/Button';
import { Callout, Segmented, Skeleton } from '../ui/Misc';
import { OddsList } from './Indicators';
import { getOffspring } from '@/lib/api';

const TONE = { visual: 'Standard', super: 'Target', het: 'Muted' };

/** Possible offspring for a female × male pair, from Cltch's Gene Engine. */
export default function OffspringPanel({ female, male }) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [view, setView] = useState(0); // 0 = combinations, 1 = per trait
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setState({ loading: true, data: null, error: null });
    getOffspring(female.id, male.id, { refresh: attempt > 0 })
      .then((data) => { if (alive) setState({ loading: false, data, error: null }); })
      .catch((e) => { if (alive) setState({ loading: false, data: null, error: e.message }); });
    return () => { alive = false; };
  }, [female.id, male.id, attempt]);

  const { loading, data, error } = state;

  return (
    <section className="flex flex-col gap-4 rounded-card border border-line bg-card p-5" aria-label="Possible offspring" aria-busy={loading}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex flex-1 flex-col gap-0.5">
          <h3 className="text-h3">Possible offspring</h3>
          <p className="text-body-sm text-stone-500">Chance per egg · Cltch Gene Engine</p>
        </div>
        {data && data.available && (
          <Segmented label="Offspring view" items={['Combinations', 'Per trait']} active={view} onChange={setView} />
        )}
      </div>

      {loading && (
        <div className="flex flex-col gap-3" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex flex-col items-start gap-3">
          <Callout tone="Risk" title="Couldn't load possible offspring" role="alert">{error}</Callout>
          <Button variant="secondary" size="sm" iconLeft="refresh" onClick={() => setAttempt((a) => a + 1)}>Try again</Button>
        </div>
      )}

      {data && !data.available && (
        <Callout tone="Missing" title="Offspring can't be predicted">{data.reason}</Callout>
      )}

      {data && data.available && (
        <>
          {view === 0 ? (
            <>
              <OddsList rows={data.combinations.map((c) => ({ label: c.name, pct: c.percent, tone: c.name.startsWith('Normal') ? 'Muted' : 'Standard', note: c.chanceLabel }))} />
              {data.combinationsTotal > data.combinations.length && (
                <p className="text-label text-stone-500">Showing the {data.combinations.length} most likely of {data.combinationsTotal} combinations.</p>
              )}
            </>
          ) : (
            <OddsList rows={data.traits.map((t) => ({ label: t.name, pct: t.percent, tone: TONE[t.kind] || 'Standard', note: `${t.ratio} · ${t.chanceLabel}` }))} />
          )}
        </>
      )}

      {data && data.warnings && data.warnings.length > 0 && (
        <Callout tone="Risk" title="Welfare warning">{data.warnings.map((w) => w.message).join(' ')}</Callout>
      )}

      {data && (
        <div className="flex flex-col gap-1">
          {data.inputs && (data.inputs.female.length > 0 || data.inputs.male.length > 0) && (
            <p className="text-label text-stone-500">
              Inputs — {female.name}: {data.inputs.female.join(', ') || 'none'} · {male.name}: {data.inputs.male.join(', ') || 'none'}
            </p>
          )}
          {(data.notes || []).map((n) => <p key={n} className="text-label text-stone-500">{n}</p>)}
        </div>
      )}
    </section>
  );
}
