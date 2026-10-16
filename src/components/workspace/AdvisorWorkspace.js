'use client';

import { useMemo } from 'react';
import useBreakpoint from '@/lib/useBreakpoint';
import useAdvisor from './useAdvisor';
import { Header, SubHeader, MobileStepper } from '../layout/Chrome';
import GoalsForm from '../layout/GoalsForm';
import FemaleSelectorModal, { useFemaleFilter, FilterChips, CollectionStatus, PaginationControls } from '../snake/FemaleSelectorModal';
import { SnakeCard, FemaleSummary } from '../snake/SnakeCards';
import SnakeAvatar from '../snake/SnakeAvatar';
import Button, { IconButton } from '../ui/Button';
import Chip from '../ui/Chip';
import { Dialog, SheetHandle } from '../ui/Overlay';
import { SearchInput } from '../ui/Fields';
import { AdvisorMark } from '../advisor/Advisor';
import { LeftRail, CenterContent, AdvisorPanel, advisorTeaser } from './Sections';

function stepOf(s, female) {
  if (!female || !female.ready) return 1;
  return s.run === 'idle' ? 2 : 3;
}

function AdvisorSheetBody({ ctx, onClose }) {
  return (
    <>
      <div className="mb-3 flex items-center">
        <h2 className="text-h3">Advisor</h2>
        <span className="flex-1" />
        <IconButton icon="x" label="Close advisor" onClick={onClose} />
      </div>
      <AdvisorPanel ctx={ctx} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Desktop ≥1280 — Figma D01–D09: 360 rail · fluid centre · 440 advisor
// ---------------------------------------------------------------------------
function DesktopLayout({ ctx }) {
  const { s, female, actions } = ctx;
  return (
    <div className="flex min-h-dvh flex-col">
      <Header breakpoint="desktop" />
      <SubHeader step={stepOf(s, female)} onStartOver={actions.startOver} />
      <div className="grid flex-1 grid-cols-[360px_minmax(0,1fr)_440px]">
        <aside className="border-r border-line bg-card p-6" aria-label="Female and breeding goals">
          <LeftRail ctx={ctx} />
        </aside>
        <main id="main" className="flex min-w-0 flex-col gap-5 px-8 pb-12 pt-7">
          <CenterContent ctx={ctx} layout="desktop" />
        </main>
        <aside className="flex flex-col gap-4 border-l border-line bg-ivory-100 p-6" aria-label="Advisor">
          <AdvisorPanel ctx={ctx} />
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tablet 768–1279 — Figma T01/T02: summary bar, single column, advisor drawer → right sheet
// ---------------------------------------------------------------------------
function SummaryBar({ ctx }) {
  const { s, female, actions } = ctx;
  const avoid = s.goals.constraints.includes('avoidSpider');
  return (
    <div className="flex items-center gap-3.5 border-b border-line bg-card px-5 py-3">
      <SnakeAvatar morph={female.morph} size={40} />
      <div className="flex shrink-0 flex-col">
        <span className="text-body-md">{female.name}</span>
        <span className="text-label text-stone-500">{female.line}</span>
      </div>
      <span className="h-8 w-px bg-line" aria-hidden="true" />
      <ul className="flex min-w-0 flex-1 flex-wrap gap-1.5" aria-label="Current goals">
        <li><Chip type="objective" selected>{s.goals.objective}</Chip></li>
        {s.goals.traits.slice(-1).map((t) => <li key={t}><Chip type="trait" selected>{t}</Chip></li>)}
        {avoid && <li><Chip type="avoid" selected>Avoid Spider</Chip></li>}
      </ul>
      <Button variant="secondary" size="sm" iconLeft="sliders" onClick={() => actions.setGoalsSheet(true)}>Edit goals</Button>
    </div>
  );
}

function AdvisorDrawer({ ctx }) {
  const t = advisorTeaser(ctx);
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-3 rounded-t-sheet border border-line bg-card px-6 pb-7 pt-2.5 shadow-lg">
      <SheetHandle />
      <div className="flex items-center gap-3">
        <AdvisorMark />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-h3">{t.title}</span>
          <p className="line-clamp-2 text-body-sm text-charcoal-600">{t.text}</p>
        </div>
        <Button variant="secondary" size="sm" iconRight="arrow-right" onClick={() => ctx.actions.setAdvisorSheet(true)}>Read explanation</Button>
      </div>
    </div>
  );
}

function TabletLayout({ ctx }) {
  const { s, female, actions } = ctx;
  const ran = s.run !== 'idle' && female && female.ready;
  return (
    <div className="flex min-h-dvh flex-col">
      <Header breakpoint="tablet" />
      {ran && <SummaryBar ctx={ctx} />}
      <main id="main" className="mx-auto flex w-full max-w-[834px] flex-col gap-4 px-6 pb-[200px] pt-6">
        {!female && <CenterContent ctx={ctx} layout="tablet" />}
        {female && !ran && (
          <>
            <FemaleSummary female={female} onChange={() => actions.openSelector(true)} />
            {female.ready ? (
              <section className="flex flex-col gap-4 rounded-card border border-line bg-card p-6" aria-labelledby="goals-title">
                <h2 id="goals-title" className="text-h2">Breeding goals</h2>
                <GoalsForm goals={s.goals} onChange={actions.setGoals} males={s.males} onSubmit={() => actions.run()} error={s.goalError} />
              </section>
            ) : (
              <CenterContent ctx={ctx} layout="tablet" />
            )}
          </>
        )}
        {ran && <CenterContent ctx={ctx} layout="tablet" />}
      </main>
      {female && <AdvisorDrawer ctx={ctx} />}
      <Dialog open={s.advisorSheet} onClose={() => actions.setAdvisorSheet(false)} label="Advisor" placement="right">
        <AdvisorSheetBody ctx={ctx} onClose={() => actions.setAdvisorSheet(false)} />
      </Dialog>
      <Dialog open={s.goalsSheet} onClose={() => actions.setGoalsSheet(false)} label="Edit goals" placement="right">
        <div className="mb-3 flex items-center">
          <h2 className="text-h3">Breeding goals</h2>
          <span className="flex-1" />
          <IconButton icon="x" label="Close goals" onClick={() => actions.setGoalsSheet(false)} />
        </div>
        <div className="rounded-card border border-line bg-card p-5">
          <GoalsForm goals={s.goals} onChange={actions.setGoals} males={s.males} onSubmit={() => actions.run()}
            submitLabel={s.goalsTouched ? 'Update pairings' : 'Find pairings'} loading={s.run === 'loading'} error={s.goalError} />
        </div>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile <768 — Figma M01–M05: 3-step flow, sticky bottom actions, advisor bottom sheet
// ---------------------------------------------------------------------------
function MobileFemaleList({ ctx }) {
  const { s, actions } = ctx;
  const { q, setQ, filter, setFilter, counts, shown, pagedShown, page, setPage, totalPages, pageSize } = useFemaleFilter(s.females);
  const ready = !s.femalesLoading && !s.loadError && s.females.length > 0;
  return (
    <>
      <MobileStepper step={1} title="Choose a female" />
      {ready && (
        <>
          <SearchInput value={q} onChange={setQ} label="Search females" />
          <FilterChips filter={filter} setFilter={setFilter} counts={counts} labels={['All', 'Ready', 'Not ready']} />
        </>
      )}
      {ready && shown.length > 0 ? (
        <>
          <ul className="flex flex-col gap-2.5">
            {pagedShown.map((f) => (
              <li key={f.id}>
                <SnakeCard snake={f} layout="compact" selected={f.id === s.femaleId} onSelect={() => actions.selectFemale(f.id)} />
              </li>
            ))}
          </ul>
          <PaginationControls page={page} totalPages={totalPages} total={shown.length} pageSize={pageSize} onPageChange={setPage} />
        </>
      ) : (
        <CollectionStatus layout="compact" loading={s.femalesLoading} error={s.loadError} onRetry={actions.reloadFemales} total={s.females.length} query={q} />
      )}
    </>
  );
}

function MobileLayout({ ctx }) {
  const { s, female, results, selected, actions } = ctx;
  const screen = !female ? 'female' : s.mobileScreen;
  const t = advisorTeaser(ctx);
  const invalid = !s.goals.text.trim() && !s.goals.traits.length;
  const other = results && selected ? results.recommendations.find((r) => r.male.id !== selected.male.id) : null;

  let bar = null;
  if (screen === 'goals' && female && female.ready) {
    bar = <Button variant="primary" iconLeft="search" className="w-full" disabled={invalid} onClick={() => actions.run()}>Find pairings</Button>;
  } else if (screen === 'results' && s.view === 'detail') {
    bar = (
      <>
        <Button variant="secondary" iconLeft="columns" disabled={!other} onClick={() => other && actions.viewCompare([selected.male.id, other.male.id])}>Compare</Button>
        <Button variant="primary" iconLeft="message" className="flex-1" onClick={() => actions.setAdvisorSheet(true)}>Ask advisor</Button>
      </>
    );
  } else if (screen === 'results') {
    bar = (
      <>
        <AdvisorMark size={32} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-label text-forest-700">Advisor</span>
          <p className="truncate text-body-sm">{t.text}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => actions.setAdvisorSheet(true)}>Ask</Button>
      </>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header breakpoint="mobile" />
      <main id="main" className="flex flex-col gap-4 px-4 pb-32 pt-4">
        {screen === 'female' && <MobileFemaleList ctx={ctx} />}
        {screen === 'goals' && female && (
          <>
            <MobileStepper step={2} title="Describe your goals" />
            <SnakeCard snake={female} layout="compact" selected onSelect={() => actions.setMobileScreen('female')} />
            {female.ready
              ? <GoalsForm goals={s.goals} onChange={actions.setGoals} males={s.males} showAction={false} error={s.goalError} />
              : <CenterContent ctx={ctx} layout="mobile" />}
          </>
        )}
        {screen === 'results' && female && (
          <>
            {s.view === 'list' && (
              <>
                <MobileStepper step={3} title="Review pairings" />
                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip type="objective" selected>{s.goals.objective}</Chip>
                  {s.goals.traits.slice(-1).map((tr) => <Chip key={tr} type="trait" selected>{tr}</Chip>)}
                  {s.goals.constraints.includes('avoidSpider') && <Chip type="avoid" selected>Avoid Spider</Chip>}
                  <Button variant="ghost" size="sm" iconLeft="sliders" onClick={() => actions.setMobileScreen('goals')}>Edit</Button>
                </div>
                {s.run === 'done' && results && (
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-h2">{results.recommendations.length} males suit {female.name}</h2>
                    <p className="text-body-sm text-stone-500">{results.screened} screened · {results.excluded.length} excluded · estimates, not guarantees</p>
                  </div>
                )}
              </>
            )}
            <CenterContent ctx={ctx} layout="mobile" />
          </>
        )}
      </main>
      {bar && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2.5 border-t border-line bg-card px-4 pb-7 pt-3 shadow-md">{bar}</div>
      )}
      <Dialog open={s.advisorSheet} onClose={() => actions.setAdvisorSheet(false)} label="Advisor" placement="bottom">
        <SheetHandle />
        <AdvisorSheetBody ctx={ctx} onClose={() => actions.setAdvisorSheet(false)} />
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
export default function AdvisorWorkspace() {
  const bp = useBreakpoint();
  const advisor = useAdvisor();
  const { s, actions } = advisor;

  // On mobile, "choose a female" is a screen rather than a modal.
  const ctx = useMemo(() => ({
    ...advisor,
    actions: bp === 'mobile' ? { ...actions, openSelector: () => actions.setMobileScreen('female') } : actions,
  }), [advisor, actions, bp]);

  if (!bp) return <div className="min-h-dvh bg-ivory-50" aria-busy="true" />;


  return (
    <>
      {bp === 'desktop' && <DesktopLayout ctx={ctx} />}
      {bp === 'tablet' && <TabletLayout ctx={ctx} />}
      {bp === 'mobile' && <MobileLayout ctx={ctx} />}
      {bp !== 'mobile' && (
        <FemaleSelectorModal
          open={s.selectorOpen}
          onClose={() => actions.openSelector(false)}
          females={s.females}
          selectedId={s.femaleId}
          loading={s.femalesLoading}
          error={s.loadError}
          onRetry={actions.reloadFemales}
          onSelect={(id) => actions.selectFemale(id)}
        />
      )}
    </>
  );
}
