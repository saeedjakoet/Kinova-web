'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import Icon from '../ui/Icon';
import { Callout, Divider, StepMarker, Tabs, Bullets } from '../ui/Misc';
import { FemaleSummary } from '../snake/SnakeCards';
import RecommendationCard, { RecommendationCardSkeleton, ExcludedMales } from '../pairing/RecommendationCard';
import { SHORTLIST } from '@/lib/candidates';
import { PairHeader, OffspringCard, GeneticsCard, LineageCard, CompletenessCard, CompareTable } from '../pairing/Detail';
import { ExplanationPanel, StreamingPanel, ErrorPanel, ConversationPanel, PanelShell, FollowUps, Composer, EstimateNotice } from '../advisor/Advisor';
import { FeedbackState, HowItWorks, ResultsHeader } from '../layout/Chrome';
import GoalsForm from '../layout/GoalsForm';
import OffspringPanel from '../pairing/Offspring';

const OBJECTIVE_REASON = {
  'Low risk': 'a proven record matters more for this objective',
  'Rare morph': 'target odds matter most for this objective',
  Variability: 'variety matters more for this objective',
  'Quick success': 'a proven record and good odds matter for this objective',
  'Target morph': 'odds of the target morph dominate this objective',
};

export function goalsLabel(female, goals, spec) {
  return [female && female.name, goals.objective, spec || goals.traits[goals.traits.length - 1]].filter(Boolean).join(' · ');
}

// ---------------------------------------------------------------------------
// Left rail (desktop) — Step 1 female, Step 2 goals
// ---------------------------------------------------------------------------
function RailSection({ n, title, state, children, className }) {
  return (
    <section className={clsx('flex flex-col gap-4', className)} aria-labelledby={`rail-${n}`}>
      <div className="flex items-center gap-2.5">
        <StepMarker n={n} state={state} />
        <h2 id={`rail-${n}`} className="text-h3">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export function FemaleEmpty({ onSelect }) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-card border border-dashed border-line-strong bg-ivory-50 p-5 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sage-100 text-forest-700"><Icon name="female" size={22} /></span>
      <span className="text-body-md">No female selected</span>
      <span className="text-body-sm text-stone-500">Pick one of your 5 females from Cltch.</span>
      <Button variant="secondary" iconLeft="search" onClick={onSelect}>Select a female</Button>
    </div>
  );
}

export function LeftRail({ ctx }) {
  const { s, female, actions } = ctx;
  const ready = female && female.ready;
  const step2State = !ready ? 'upcoming' : s.run === 'done' || s.run === 'loading' ? 'done' : 'current';
  const submitLabel = s.run === 'done' && s.goalsTouched ? 'Update pairings' : 'Find pairings';
  return (
    <div className="flex flex-col gap-6">
      <RailSection n={1} title={female ? 'Female' : 'Choose a female'} state={female ? (ready ? 'done' : 'current') : 'current'}>
        {female ? <FemaleSummary female={female} onChange={() => actions.openSelector(true)} /> : <FemaleEmpty onSelect={() => actions.openSelector(true)} />}
      </RailSection>
      <Divider />
      <RailSection n={2} title="Breeding goals" state={step2State}>
        <GoalsForm
          goals={s.goals}
          onChange={actions.setGoals}
          males={ctx.s.males}
          disabled={!ready}
          disabledText={female && !ready ? 'Goals unlock when the female passes readiness checks' : 'Choose a female first'}
          onSubmit={() => actions.run()}
          submitLabel={submitLabel}
          loading={s.run === 'loading'}
          error={s.goalError}
        />
      </RailSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Centre column
// ---------------------------------------------------------------------------
function SortMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const opts = ['Match score', 'Target odds', 'Track record'];
  return (
    <span className="relative" ref={ref}>
      <Button variant="secondary" size="sm" iconRight="chevron-down" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>Sort: {value}</Button>
      {open && (
        <ul role="menu" className="absolute right-0 top-full z-30 mt-1.5 flex min-w-[180px] animate-fade-in flex-col gap-0.5 rounded-tile border border-line bg-card p-1.5 shadow-md">
          {opts.map((o) => (
            <li key={o} role="none">
              <button type="button" role="menuitemradio" aria-checked={o === value} onClick={() => { onChange(o); setOpen(false); }}
                className={clsx('focus-ring flex h-9 w-full items-center gap-2 rounded-icon px-2.5 text-left text-body-sm', o === value ? 'bg-sage-100' : 'hover:bg-ivory-100')}>
                <span className="flex-1">{o}</span>
                {o === value && <Icon name="check" size={16} className="text-forest-700" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}

function sortRecs(recs, by) {
  const list = [...recs];
  if (by === 'Target odds') list.sort((a, b) => b.compare.targetP - a.compare.targetP || a.rank - b.rank);
  else if (by === 'Track record') list.sort((a, b) => b.compare.clutches - a.compare.clutches || a.rank - b.rank);
  else list.sort((a, b) => a.rank - b.rank);
  return list;
}

function refineBanner(results, changes) {
  const moved = results.recommendations.filter((r) => changes[r.male.id] && changes[r.male.id].to < changes[r.male.id].from);
  if (!moved.length) return 'The order is unchanged. Your traits and constraints are unchanged.';
  return `${moved[0].male.name} moves up — ${OBJECTIVE_REASON[results.objective] || 'the weights changed'}. Your traits and constraints are unchanged.`;
}

export function ResultsList({ ctx, layout = 'desktop' }) {
  const { s, female, results, actions } = ctx;
  const [sortBy, setSortBy] = useState('Match score');
  // Cltch runs show only the top SHORTLIST; the API checks further until that top is guaranteed.
  const allRecs = sortRecs(results.recommendations, sortBy);
  const recs = results.source === 'cltch' ? allRecs.slice(0, SHORTLIST) : allRecs;
  const mobile = layout === 'mobile';
  const n = recs.length;
  const changes = s.chat.changes;
  const compareCount = s.compareIds.length;
  const cltch = results.source === 'cltch';
  const notChecked = results.notChecked || [];

  return (
    <>
      {cltch && (
        results.targets && results.targets.length ? (
          <Callout tone="Info" title={`Ranked for ${results.targetLabel}`}>
            Every ready male was scored on the chance of a baby showing {results.targetLabel} in one egg, so this order holds across your whole collection. Relatedness, collection gaps and clean combos only break near-ties. Sellable mix is still awaiting your input.
          </Callout>
        ) : (
          <Callout tone="Missing" title="Provisional ranking">
            No season targets selected, so males are scored on Kinova&apos;s pairing criteria with an assumed goal (recessive progress). Pick Season targets on the left to rank by the odds of the morphs you want.
          </Callout>
        )
      )}
      {results.sampleMales && (
        <Callout tone="Missing" title="Approximate results">
          {female.name}&apos;s genetics are estimated from her Cltch morphs and ranked against the PoC&apos;s sample males until the pairings endpoint is connected.
        </Callout>
      )}
      {changes && s.chat.title && (
        <Callout tone="Info" title={`Re-ranked for ${results.objective}`}>{refineBanner(results, changes)}</Callout>
      )}
      {!mobile && (
        <ResultsHeader
          eyebrow="Step 3 · Recommended pairings"
          title={cltch
            ? (n ? `Top ${n} male${n === 1 ? '' : 's'} for ${female.name}` : `No eligible males checked yet for ${female.name}`)
            : (n ? `${n} male${n === 1 ? '' : 's'} suit${n === 1 ? 's' : ''} ${female.name}` : `No males suit ${female.name}`)}
          sub={cltch
            ? `${results.rankedBy} · ${results.screened} males screened · ${results.excluded.length} excluded`
            : `Ranked for ${results.objective}${results.spec ? ` · target ${results.spec}` : ''} · ${results.screened} ${results.sampleMales ? 'sample males' : 'males'} screened, ${results.excluded.length} excluded`}
          right={n > 1 && !cltch ? (
            <>
              <SortMenu value={sortBy} onChange={setSortBy} />
              <Button variant="primary" size="sm" iconLeft="columns" disabled={compareCount < 2} onClick={() => actions.viewCompare()}>
                Compare ({compareCount})
              </Button>
            </>
          ) : null}
        />
      )}
      {n === 0 && (
        <FeedbackState type="NoResults"
          title={cltch && notChecked.length ? 'None of the checked males passed' : 'No males meet these constraints'}
          body={cltch && notChecked.length
            ? 'Every male in this shortlist was excluded — see the reasons below. Check the next males to keep looking.'
            : 'Every male was excluded — see the reasons below.'} />
      )}
      <ol className="flex flex-col gap-4" aria-label="Recommended males, ranked">
        {recs.map((r) => (
          <li key={r.male.id}>
            <RecommendationCard
              rec={r}
              layout={mobile ? 'mobile' : 'desktop'}
              selected={!mobile && r.male.id === s.selectedMaleId}
              compared={!mobile && s.compareIds.includes(r.male.id) && r.male.id !== s.selectedMaleId}
              compareDisabled={compareCount >= 3}
              onSelect={() => (mobile ? actions.viewDetail(r.male.id) : actions.selectMale(r.male.id))}
              onView={actions.viewDetail}
              onAsk={(rec) => { actions.selectMale(rec.male.id); if (layout === 'tablet') actions.setAdvisorSheet(true); }}
              onToggleCompare={cltch ? null : actions.toggleCompare}
              change={changes ? changes[r.male.id] : null}
            />
          </li>
        ))}
      </ol>
      {cltch && n > 0 && (
        <TopGuarantee guaranteed={!!(results.paging && results.paging.topGuaranteed)} shownCount={n}
          readyTotal={results.paging ? results.paging.readyTotal : n} notes={results.notes}
          canContinue={!!(results.paging && results.paging.hasMore)}
          loading={s.loadingMore} error={s.loadMoreError} onMore={actions.loadMore} compact={mobile} />
      )}
      {cltch && n === 0 && results.paging && results.paging.hasMore && (
        <TopGuarantee guaranteed={false} shownCount={0} readyTotal={results.paging.readyTotal} notes={results.notes}
          canContinue loading={s.loadingMore} error={s.loadMoreError} onMore={actions.loadMore} compact={mobile} />
      )}
      {results.excluded.length > 0 && (
        <ExcludedMales excluded={results.excluded} open={s.excludedOpen} onToggle={() => actions.setExcludedOpen(!s.excludedOpen)} compact={mobile} />
      )}
    </>
  );
}

/**
 * One line under the top picks. Guaranteed: none of the other ready males could beat them, so they aren't
 * listed. Not guaranteed (check limit hit or a check didn't complete): say why and offer to keep checking.
 */
function TopGuarantee({ guaranteed, shownCount, readyTotal, notes, canContinue, loading, error, onMore, compact }) {
  const why = (notes || []).find((t) => /didn't complete|Stopped at/.test(t));
  return (
    <section className="overflow-hidden rounded-card border border-line bg-card" aria-label="How sure is this top list">
      <div className={clsx('flex flex-wrap items-center gap-2.5', compact ? 'px-4 py-3.5' : 'px-5 py-3.5')}>
        <Icon name={guaranteed ? 'check' : 'alert'} size={18} className={guaranteed ? 'text-forest-700' : 'text-caution'} />
        <span className="flex-1 text-body-md">
          {guaranteed
            ? `The best ${shownCount} of all ${readyTotal} ready males. No other male could rank higher, even as a perfect outcross.`
            : why || `An unchecked male could still rank higher.`}
        </span>
        {!guaranteed && canContinue && (
          <Button variant="secondary" size="sm" iconLeft="refresh" loading={loading} onClick={onMore}>
            {loading ? 'Checking…' : 'Keep checking'}
          </Button>
        )}
      </div>
      {error && <div className="px-5 pb-3"><Callout tone="Risk" size="compact">{error}</Callout></div>}
    </section>
  );
}

/** Detail for a real Cltch male: criteria, relatedness and checks (offspring odds not connected yet). */
function CltchDetail({ ctx, layout }) {
  const { female, selected: rec, actions } = ctx;
  const mobile = layout === 'mobile';
  const rel = rec.relatedness;
  return (
    <>
      <Button variant="ghost" size="sm" iconLeft="arrow-left" onClick={actions.viewList} className="self-start">{mobile ? 'Results' : 'All pairings'}</Button>
      <PairHeader female={female} rec={rec} mobile={mobile} />
      <OffspringPanel female={female} male={rec.male} />
      <section className="flex flex-col gap-3 rounded-card border border-line bg-card p-5" aria-label="Pairing criteria">
        <h3 className="text-h3">Pairing criteria · provisional score {rec.score}</h3>
        <ul className="flex flex-col gap-3">
          {rec.criteria.map((c) => (
            <li key={c.key} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-body-sm-md">{c.label}</span>
                <span className="text-body-sm-md tabular-nums text-charcoal-700">{c.score == null ? '—' : `${Math.round(c.score * 100)}`}</span>
              </div>
              <span className="block h-2 overflow-hidden rounded-[4px] bg-ivory-100" aria-hidden="true">
                <span className="block h-full rounded-[4px] bg-moss-500" style={{ width: `${c.score == null ? 0 : Math.round(c.score * 100)}%` }} />
              </span>
              <span className="text-label text-stone-500">{c.detail} · weight {Math.round(c.weight * 100)}%</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-3 rounded-card border border-line bg-card p-5" aria-label="Relatedness">
        <h3 className="text-h3">Relatedness</h3>
        {rel ? (
          <>
            <p className="text-body-sm text-charcoal-700">
              {rel.known
                ? `${rel.coefficient === 0 ? '0% — no shared ancestors' : `${Math.round(rel.coefficient * 1000) / 10}% (${rel.relationship})`}.`
                : 'Unknown — pedigree not recorded in Cltch (not assumed to be zero).'}
            </p>
            {rel.pedigreeGenerations && (
              <p className="text-label text-stone-500">
                Pedigree found: {female.name} {rel.pedigreeGenerations.female} gen · {rec.male.name} {rel.pedigreeGenerations.male} gen · searched {rel.pedigreeGenerations.searched}
              </p>
            )}
            {rel.sharedAncestors && rel.sharedAncestors.length > 0 && (
              <p className="text-body-sm text-charcoal-700">Shared ancestors: {rel.sharedAncestors.map((a) => a.name || a.id).join(', ')}</p>
            )}
          </>
        ) : <p className="text-body-sm text-stone-500">Not checked.</p>}
      </section>
      {rec.warnings.length > 0 && (
        <Callout tone="Caution" title="Warnings">{rec.warnings.map((w) => w.message).join(' ')}</Callout>
      )}
      <Callout tone="Missing" title="Awaiting your input">
        {rec.awaitingInput.map((a) => `${a.label}: ${a.detail}`).join(' ')}
      </Callout>
    </>
  );
}

export function DetailView({ ctx, layout = 'desktop' }) {
  const { s, female, results, selected, actions } = ctx;
  const mobile = layout === 'mobile';
  const rec = selected;
  if (!rec) return null;
  if (rec.source === 'cltch') return <CltchDetail ctx={ctx} layout={layout} />;
  const other = results.recommendations.find((r) => r.male.id !== rec.male.id);
  const tabs = mobile ? ['Offspring', 'Genetics', 'Lineage'] : ['Offspring', 'Genetics', 'Lineage', 'Records'];
  const tab = tabs.includes(s.detailTab) ? s.detailTab : 'Offspring';
  const planned = !!s.planned[rec.male.id];

  return (
    <>
      <Button variant="ghost" size="sm" iconLeft="arrow-left" onClick={actions.viewList} className="self-start">{mobile ? 'Results' : 'All pairings'}</Button>
      <PairHeader female={female} rec={rec} mobile={mobile} />
      <Tabs items={tabs} active={tab} onChange={actions.setTab} label="Pairing detail" />
      <div role="tabpanel" aria-label={tab} className="flex flex-col gap-4">
        {tab === 'Offspring' && (
          <>
            <OffspringCard female={female} rec={rec} hetProven={s.hetProven} onHetProven={actions.setHetProven} mobile={mobile} />
            {mobile ? (
              <>
                <Callout tone={rec.explanation.caveat.tone} title={rec.explanation.caveat.title}>{rec.explanation.caveat.body}</Callout>
                <CompletenessCard rec={rec} labelWidth={96} />
              </>
            ) : (
              <>
                <div className="flex flex-col gap-4 lg:flex-row">
                  <GeneticsCard rec={rec} />
                  <LineageCard rec={rec} />
                </div>
                <CompletenessCard rec={rec} />
              </>
            )}
          </>
        )}
        {tab === 'Genetics' && <GeneticsCard rec={rec} />}
        {tab === 'Lineage' && <LineageCard rec={rec} />}
        {tab === 'Records' && <CompletenessCard rec={rec} />}
      </div>
      {!mobile && (
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" iconLeft={planned ? 'check' : 'bookmark'} onClick={() => actions.togglePlan(rec.male.id)} aria-pressed={planned}>
            {planned ? 'Added to season plan' : 'Add to season plan'}
          </Button>
          {other && (
            <Button variant="secondary" iconLeft="columns" onClick={() => actions.viewCompare([rec.male.id, other.male.id])}>
              Compare with {other.male.name}
            </Button>
          )}
        </div>
      )}
    </>
  );
}

export function CompareView({ ctx, layout = 'desktop' }) {
  const { s, female, results, actions } = ctx;
  const recs = results.recommendations.filter((r) => s.compareIds.includes(r.male.id));
  const mobile = layout === 'mobile';
  const remaining = results.recommendations.filter((r) => !s.compareIds.includes(r.male.id));
  if (recs.length < 2) {
    return (
      <>
        <Button variant="ghost" size="sm" iconLeft="arrow-left" onClick={actions.viewList} className="self-start">All pairings</Button>
        <FeedbackState type="NoResults" title="Pick two males to compare" body="Tick “Compare” on two or three recommendation cards." />
      </>
    );
  }
  return (
    <>
      <Button variant="ghost" size="sm" iconLeft="arrow-left" onClick={actions.viewList} className="self-start">{mobile ? 'Results' : 'All pairings'}</Button>
      <ResultsHeader eyebrow="Compare" title={recs.map((r) => r.male.name).join(' vs ')}
        sub={`For ${female.name} · ${results.objective}${results.spec ? ` · target ${results.spec}` : ''}`}
        right={recs.length < 3 && remaining.length ? remaining.slice(0, 1).map((r) => (
          <Chip key={r.male.id} type="neutral" icon="plus" onClick={() => actions.viewCompare([...s.compareIds, r.male.id])}>{`Add ${r.male.name}`}</Chip>
        )) : null} />
      <CompareTable female={female} recs={recs} spec={results.spec} />
      <Callout tone="Info" title="Highlights, not verdicts">
        Stronger values are highlighted per row; the choice stays yours.{recs.every((r) => r.stats[1][1].startsWith('0%')) ? ` All are unrelated to ${female.name} and carry no welfare-risk genes.` : ''}
      </Callout>
      <div className="flex flex-wrap gap-3">
        {recs.map((r) => (
          <Button key={r.male.id} variant="secondary" iconRight="arrow-right" onClick={() => actions.viewDetail(r.male.id)}>View {r.male.name} pairing</Button>
        ))}
      </div>
    </>
  );
}

/** Everything that appears in the centre column, by state. */
export function CenterContent({ ctx, layout = 'desktop' }) {
  const { s, female, results, actions } = ctx;
  const mobile = layout === 'mobile';

  if (!female) {
    return (
      <>
        <ResultsHeader as="h2" eyebrow="Pairing Advisor" title="Find the right male for your female" sub="Choose a female to begin. Recommendations are estimates to support your decisions." />
        <FeedbackState type="Start" title="Start with a female"
          body="Choose one of your females. The advisor checks she's ready, screens your males and explains the best pairings for your goals."
          primary={{ label: 'Choose a female', onClick: () => actions.openSelector(true) }} />
        <HowItWorks />
      </>
    );
  }
  if (!female.ready) {
    return (
      <>
        {!mobile && <ResultsHeader eyebrow="Pairing Advisor" title="Run blocked" sub={`Readiness checks failed for ${female.name}`} />}
        <FeedbackState type="NotReady" title={female.blocked.title} body={female.blocked.body}
          primary={{ label: 'Choose another female', onClick: () => (mobile ? actions.setMobileScreen('female') : actions.openSelector(true)) }}
          secondary={mobile ? null : { label: 'Review readiness rules', onClick: () => { const el = document.querySelector('[aria-label^="Selected female"]'); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.setAttribute('tabindex', '-1'); el.focus(); } } }} />
      </>
    );
  }
  if (s.run === 'idle') {
    return (
      <>
        <ResultsHeader eyebrow="Step 3 · Recommended pairings" title="Ready when you are" sub={`${female.name} passed every readiness check. Review the goals on the left, then find pairings.`} />
        <FeedbackState type="NoResults" title="Pairings will appear here" body={`Describe your goals, then select Find pairings. The advisor will screen 4 males against ${female.name}.`} />
      </>
    );
  }
  if (s.run === 'loading') {
    return (
      <>
        {!mobile && <ResultsHeader eyebrow="Step 3 · Recommended pairings" title={`Finding pairings for ${female.name}…`} sub="Screening 4 males against your goals" />}
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading recommendations">
          {[0, 1, 2].map((i) => <RecommendationCardSkeleton key={i} layout={mobile ? 'mobile' : 'desktop'} />)}
        </div>
      </>
    );
  }
  if (s.run === 'error') {
    return (
      <>
        {!mobile && <ResultsHeader eyebrow="Step 3 · Recommended pairings" title="Pairings unavailable" sub={goalsLabel(female, s.goals)} />}
        <FeedbackState type="Error"
          title={s.error.code === 'GENE_ENGINE_TIMEOUT' ? "We couldn't reach the Gene Engine" : 'Something went wrong'}
          body={s.error.message}
          code={`${s.error.code}${s.error.runId ? ` · run ${s.error.runId}` : ''}`}
          primary={{ label: 'Try again', icon: 'refresh', onClick: actions.retry }}
          secondary={{ label: 'Back to goals', onClick: () => { if (mobile) actions.setMobileScreen('goals'); else { const t = document.querySelector('textarea'); if (t) t.focus(); } } }} />
      </>
    );
  }
  if (s.view === 'detail') return <DetailView ctx={ctx} layout={layout} />;
  if (s.view === 'compare') return <CompareView ctx={ctx} layout={layout} />;
  return <ResultsList ctx={ctx} layout={layout} />;
}

// ---------------------------------------------------------------------------
// Advisor panel (right column / drawer / sheet)
// ---------------------------------------------------------------------------
export function AdvisorPanel({ ctx }) {
  const { s, female, results, selected, actions } = ctx;

  if (!female) {
    return (
      <PanelShell title="Your breeding advisor" subtitle="Explains every recommendation">
        <p className="text-body text-charcoal-700">Once you&apos;ve chosen a female and described your goals, I&apos;ll explain each recommended pairing — why it fits, the offspring odds, and what&apos;s still uncertain.</p>
        <section className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-icon bg-sage-100 text-forest-700"><Icon name="help" size={16} /></span>
            <h4 className="text-h3">What I can help with</h4>
          </div>
          <Bullets items={['Why one male ranks above another', 'Offspring odds in plain language', 'Why a male was excluded', 'How missing data affects confidence']} />
        </section>
        <Callout tone="Info" size="compact">I don&apos;t calculate genetics or rank males myself — I explain results from the breeding engine.</Callout>
        <EstimateNotice />
      </PanelShell>
    );
  }

  if (!female.ready) {
    const chat = s.chat.messages.length > 0;
    return (
      <PanelShell title="Why I stopped" subtitle={`Readiness check · ${female.name}`}>
        <p className="text-body text-charcoal-700">{female.blocked.advisor}</p>
        <Callout tone="Info" size="compact">Readiness thresholds are configurable per breeder. These are the PoC defaults for ball pythons.</Callout>
        {chat && <ConversationMessages messages={s.chat.messages} />}
        <FollowUps items={[`When could ${female.name} be ready?`, 'Show my ready females']} onAsk={actions.ask} disabled={s.asking} />
        <EstimateNotice />
      </PanelShell>
    );
  }

  if (s.run === 'loading') return <StreamingPanel female={female} goalsLabel={goalsLabel(female, s.goals)} step={s.loadingStep} />;
  if (s.run === 'error') return <ErrorPanel subtitle={goalsLabel(female, s.goals)} onRetry={actions.retry} />;

  if (s.run === 'idle') {
    const het = female.hetLabel;
    return (
      <PanelShell title={`${female.name} looks ready`} subtitle="Readiness summary">
        <p className="text-body text-charcoal-700">
          {female.name} is mature ({female.age}), {female.weight} and not gravid.{het ? ` Her het Clown is a ${het} possibility — I'll flag wherever that affects the odds.` : ''}
        </p>
        {het && <Callout tone="Missing" size="compact">Unproven het: {female.name} hasn&apos;t produced a visual Clown yet.</Callout>}
        {s.chat.messages.length > 0 && <ConversationMessages messages={s.chat.messages} />}
        <FollowUps items={[het ? `What does ${het} het mean?` : null, `Which goals work best for ${female.name}?`].filter(Boolean)} onAsk={actions.ask} disabled={s.asking} />
        <EstimateNotice />
      </PanelShell>
    );
  }

  if (s.panelMode === 'chat' && s.chat.messages.length) {
    return (
      <ConversationPanel
        title={s.chat.title || 'Advisor'}
        subtitle={`${female.name} · conversation`}
        earlier={s.chat.earlier}
        messages={s.chat.messages}
        changes={s.chat.changes}
        results={results}
        followUps={s.chat.followUps || (selected ? selected.explanation.followUps : [])}
        onAsk={actions.ask}
        asking={s.asking}
        onBack={() => actions.setPanelMode('explain')}
      />
    );
  }

  if (s.view === 'compare') {
    const recs = results.recommendations.filter((r) => s.compareIds.includes(r.male.id));
    if (recs.length >= 2) {
      const note = results.compareNotes[recs.map((r) => r.male.id).join('+')] || { summary: '', choices: {} };
      return (
        <PanelShell title={recs.length === 2 ? `${recs[0].male.name} or ${recs[1].male.name}?` : 'Which male fits best?'} subtitle={`Comparison for ${female.name}`}>
          <p className="text-body-lg">{note.summary}</p>
          {recs.map((r) => (
            <div key={r.male.id} className="flex flex-col gap-2 rounded-tile border border-line bg-ivory-50 p-4">
              <span className="text-body-md">Choose {r.male.name} if…</span>
              <Bullets items={note.choices[r.male.id] || []} />
            </div>
          ))}
          <FollowUps
            items={[female.hetLabel ? `What if ${female.name}'s het is proven?` : null,
              ...results.recommendations.filter((r) => !s.compareIds.includes(r.male.id)).slice(0, 1).map((r) => `Add ${r.male.name} to the comparison`),
              results.objective === 'Low risk' ? 'Go back to Rare morph' : 'Show low-risk options instead'].filter(Boolean)}
            onAsk={actions.ask} disabled={s.asking} />
          <Composer placeholder="Ask about these males…" onAsk={actions.ask} disabled={s.asking} />
          <EstimateNotice />
        </PanelShell>
      );
    }
  }

  if (!selected) return null;
  return (
    <ExplanationPanel
      explanation={selected.explanation}
      collapsed={s.panelCollapsed}
      onToggle={() => actions.setPanelCollapsed(!s.panelCollapsed)}
      onAsk={selected.source === 'cltch' ? undefined : actions.ask}
      asking={s.asking}
    />
  );
}

function ConversationMessages({ messages }) {
  return (
    <ol className="flex flex-col gap-4 border-t border-line pt-4" aria-live="polite">
      {messages.map((m, i) => (
        <li key={i} className={clsx('text-body', m.role === 'user' ? 'self-end rounded-[14px_14px_4px_14px] bg-forest-900 px-3.5 py-2.5 text-ivory-50' : 'text-charcoal-900')}>
          {m.text || <span className="text-stone-500">Thinking…</span>}
        </li>
      ))}
    </ol>
  );
}

/** One-line advisor teaser used by the tablet drawer and the mobile sticky bar. */
export function advisorTeaser(ctx) {
  const { s, female, selected } = ctx;
  if (!female) return { title: 'Advisor', text: 'Choose a female to get started.' };
  if (s.run === 'loading') return { title: 'Working on it…', text: 'Predicting offspring odds and ranking males.' };
  if (s.run === 'error') return { title: 'Explanation unavailable', text: 'Rankings need the Gene Engine — try again.' };
  if (s.panelMode === 'chat' && s.chat.messages.length) {
    const last = [...s.chat.messages].reverse().find((m) => m.role === 'advisor' && m.text);
    return { title: s.chat.title || 'Advisor', text: last ? last.text : 'Thinking…' };
  }
  if (selected) return { title: selected.explanation.title, text: selected.explanation.summary };
  return { title: 'Advisor', text: 'Ask about readiness, goals or odds.' };
}
