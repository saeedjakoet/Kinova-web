'use client';

import clsx from 'clsx';
import Icon from '../ui/Icon';
import { ConfidencePill } from '../ui/Badges';
import { Bullets, CheckRow, IconTile, Segmented } from '../ui/Misc';
import SnakeAvatar from '../snake/SnakeAvatar';
import { MatchIndicator, OddsList } from './Indicators';

function Parent({ snake, role, mobile }) {
  if (mobile) {
    return (
      <span className="flex items-center gap-2.5">
        <SnakeAvatar morph={snake.morph} size={44} />
        <span className="text-h3">{snake.name}</span>
      </span>
    );
  }
  return (
    <div className="flex w-[150px] shrink-0 flex-col items-center gap-1.5">
      <SnakeAvatar morph={snake.morph} size={72} />
      <span className="text-h3">{snake.name}</span>
      <span className="text-center text-label text-stone-500">{role} · {snake.line}</span>
    </div>
  );
}

/** Figma: Pair header (D06 / M04). */
export function PairHeader({ female, rec, mobile }) {
  if (mobile) {
    return (
      <section className="flex flex-col gap-3.5 rounded-card border border-line bg-card p-4 shadow-sm" aria-label={`${female.name} × ${rec.male.name}`}>
        <div className="flex flex-wrap items-center gap-2.5">
          <Parent snake={female} mobile />
          <Icon name="x" size={14} className="text-stone-500" />
          <Parent snake={rec.male} mobile />
        </div>
        <div className="flex items-center gap-3">
          <MatchIndicator score={rec.score} size="sm" />
          <span className="flex-1" />
          <ConfidencePill level={rec.confidence} />
        </div>
      </section>
    );
  }
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-card border border-line bg-card p-6 shadow-sm" aria-label={`${female.name} × ${rec.male.name}`}>
      <Parent snake={female} role="Dam" />
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ivory-100 text-charcoal-600">
        <Icon name="x" size={18} /><span className="sr-only">paired with</span>
      </span>
      <Parent snake={rec.male} role="Sire" />
      <span className="flex-1" />
      <div className="flex flex-col items-center gap-2.5">
        <MatchIndicator score={rec.score} size="lg" />
        <ConfidencePill level={rec.confidence} />
      </div>
    </section>
  );
}

function Card({ children, className, label }) {
  return <section aria-label={label} className={clsx('flex flex-col rounded-card border border-line bg-card', className)}>{children}</section>;
}

export function SectionHead({ icon, title, as: H = 'h3' }) {
  return (
    <div className="flex items-center gap-2.5">
      <IconTile icon={icon} />
      <H className="text-h3">{title}</H>
    </div>
  );
}

export function StatTile({ label, value, note }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-tile bg-ivory-100 p-3.5">
      <span className="text-eyebrow text-stone-500">{label}</span>
      <span className="text-title">{value}</span>
      {note && <span className="text-label text-stone-500">{note}</span>}
    </div>
  );
}

/** Figma: "Chance per egg" card with the 66%-het / proven toggle. */
export function OffspringCard({ female, rec, hetProven, onHetProven, mobile }) {
  const rows = hetProven && rec.odds.proven ? rec.odds.proven : rec.odds.recorded;
  const tiles = hetProven && rec.tiles.proven ? rec.tiles.proven : rec.tiles.recorded;
  const shownRows = mobile ? rows.slice(0, 4) : rows;
  const hidden = rows.slice(4);
  const hetLabel = female.hetLabel || '66%';
  return (
    <Card className={mobile ? 'gap-3.5 p-4' : 'gap-4 p-6'} label="Offspring odds">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="flex flex-1 flex-col gap-0.5">
          <h3 className={mobile ? 'text-h3' : 'text-h2'}>Chance per egg</h3>
          {!mobile && <p className="text-body-sm text-stone-500">{rows.length} possible outcomes · targets highlighted</p>}
        </div>
        {rec.hetProvenAvailable && (
          <Segmented
            label="Odds view"
            items={mobile ? ['As recorded', 'If het proven'] : [`As recorded (${hetLabel} het)`, 'If het is proven']}
            active={hetProven ? 1 : 0}
            onChange={(i) => onHetProven(i === 1)}
          />
        )}
      </div>
      <OddsList rows={shownRows} />
      {mobile && hidden.length > 0 && (
        <p className="text-label text-stone-500">+ {hidden.length} more outcome{hidden.length === 1 ? '' : 's'} ({[...new Set(hidden.map((h) => h.pct + '%'))].join(', ')} each)</p>
      )}
      <div className={clsx('flex gap-3', mobile && 'gap-2')}>
        {(mobile ? tiles.slice(0, 2) : tiles).map((t) => <StatTile key={t.label} {...t} />)}
      </div>
      {!mobile && (
        <p className="text-label text-stone-500">Het Clown babies look normal for Clown but carry it. Each egg is independent, so small clutches vary widely.</p>
      )}
    </Card>
  );
}

export function GeneticsCard({ rec }) {
  return (
    <Card className="flex-1 gap-3 p-5" label="Genetics">
      <SectionHead icon="dna" title="Genetics" />
      <Bullets items={rec.geneticsBullets} />
    </Card>
  );
}

export function LineageCard({ rec }) {
  return (
    <Card className="flex-1 gap-3 p-5" label="Lineage and kinship">
      <SectionHead icon="lineage" title="Lineage & kinship" />
      <div className="flex items-center gap-3">
        <span className={clsx('text-score-lg', rec.lineage.kinship === 'Unknown' ? 'text-caution' : 'text-forest-700')}>{rec.lineage.kinship}</span>
        <span className="flex flex-col">
          <span className="text-body-sm-md">Kinship coefficient</span>
          <span className="text-label text-stone-500">Your limit: 6.25%</span>
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {rec.lineage.rows.map(([s, l, v]) => <CheckRow key={l} status={s} label={l} value={v} labelWidth={64} />)}
      </ul>
      <p className="text-label text-stone-500">{rec.lineage.note}</p>
    </Card>
  );
}

export function CompletenessCard({ rec, labelWidth = 120 }) {
  return (
    <Card className="gap-3 p-5" label="Data behind this estimate">
      <SectionHead icon="info" title="Data behind this estimate" />
      <ul className="flex flex-col gap-2">
        {rec.completeness.map(([s, l, v]) => <CheckRow key={l} status={s} label={l} value={v} labelWidth={labelWidth} />)}
      </ul>
    </Card>
  );
}

/** Figma D07 — side-by-side compare (2–3 males). Stronger value per row is highlighted, never chosen. */
export function CompareTable({ female, recs, spec }) {
  const best = (vals, dir = 'max') => {
    const valid = vals.filter((v) => v != null);
    if (valid.length < 2 || new Set(valid).size === 1) return -1;
    const target = dir === 'max' ? Math.max(...valid) : Math.min(...valid);
    return vals.filter((v) => v === target).length === 1 ? vals.indexOf(target) : -1;
  };
  const conf = { High: 3, Medium: 2, Low: 1 };
  const rows = [
    ['Visual Clown chance', recs.map((r) => r.compare.visualClown), best(recs.map((r) => r.compare.visualClownP))],
    [`${spec || 'Target'} chance`, recs.map((r) => r.compare.target), best(recs.map((r) => r.compare.targetP))],
    ['Other traits added', recs.map((r) => r.compare.adds), -1],
    ['Kinship', recs.map((r) => r.compare.kinship), best(recs.map((r) => r.compare.kinshipGens))],
    ['Track record', recs.map((r) => r.compare.record), best(recs.map((r) => r.compare.clutches))],
    ['Age · weight', recs.map((r) => r.compare.ageWeight), -1],
    ['Data confidence', recs.map((r) => r.compare.confidence), best(recs.map((r) => conf[r.compare.confidence]))],
    ['Main caveat', recs.map((r) => r.compare.caveat), -1],
  ];

  return (
    <div className="overflow-x-auto rounded-card border border-line bg-card">
      <table className="w-full min-w-[560px] border-collapse text-left">
        <caption className="sr-only">Comparison of {recs.map((r) => r.male.name).join(', ')} for {female.name}</caption>
        <thead>
          <tr className="border-b border-line bg-ivory-50">
            <th scope="col" className="w-[168px] p-4 align-middle text-eyebrow text-stone-500">For {female.name}</th>
            {recs.map((r) => (
              <th key={r.male.id} scope="col" className="p-4 align-middle font-normal">
                <span className="flex items-center gap-3">
                  <SnakeAvatar morph={r.male.morph} size={40} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-h3">{r.male.name}</span>
                    <span className="text-label text-stone-500">{r.male.tags.map((t) => t[1]).join(' · ')}</span>
                  </span>
                  <MatchIndicator score={r.score} size="sm" />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, vals, b], i) => (
            <tr key={label} className={clsx(i < rows.length - 1 && 'border-b border-line')}>
              <th scope="row" className="w-[168px] px-4 py-3.5 align-top text-body-sm-md font-medium text-charcoal-600">{label}</th>
              {vals.map((v, j) => (
                <td key={recs[j].male.id} className={clsx('px-4 py-3.5 align-top', b === j && 'bg-sage-100')}>
                  <span className="block text-body-md">{v}</span>
                  {b === j && <span className="text-label text-moss-700">Stronger</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
