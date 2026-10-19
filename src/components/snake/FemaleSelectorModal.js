'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Dialog } from '../ui/Overlay';
import Button, { IconButton } from '../ui/Button';
import Chip from '../ui/Chip';
import Icon from '../ui/Icon';
import { SearchInput } from '../ui/Fields';
import { Callout, Skeleton } from '../ui/Misc';
import { SnakeCard } from './SnakeCards';
import { FEMALES_PAGE_SIZE, getFemalesPage, prefetchFemalesPage } from '@/lib/api';

const FILTERS = ['All females', 'Ready to breed', 'Not ready'];
const READY_PARAM = ['all', 'ready', 'not_ready'];
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Server-paged females: each page comes from GET /api/cltch/females (6 per page), search and
 * the ready filter run on the API, and the next page is prefetched so "Next" is instant.
 */
export function useFemalePages() {
  const [q, setQState] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilterState] = useState(0);
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [fetching, setFetching] = useState(true);
  const refreshNext = useRef(false);

  // Debounce typing; the page resets with the query so we never fetch "page 3" of a new search.
  useEffect(() => {
    const next = q.trim();
    if (next === query) return undefined;
    const t = setTimeout(() => { setQuery(next); setPage(1); }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q, query]);

  const setFilter = useCallback((i) => { setFilterState(i); setPage(1); }, []);
  const retry = useCallback(() => { refreshNext.current = true; setAttempt((a) => a + 1); }, []);

  useEffect(() => {
    let alive = true;
    const args = { page, pageSize: FEMALES_PAGE_SIZE, q: query, ready: READY_PARAM[filter] };
    const refresh = refreshNext.current;
    refreshNext.current = false;
    setFetching(true);
    getFemalesPage({ ...args, refresh })
      .then((r) => {
        if (!alive) return;
        // The collection can shrink between visits (cache refresh); fall back to the last page.
        if (r.total > 0 && page > r.totalPages) { setPage(r.totalPages); return; }
        setResult(r);
        setError(null);
        setFetching(false);
        if (r.hasNext) prefetchFemalesPage({ ...args, page: page + 1 });
      })
      .catch((e) => {
        if (!alive || e.status === 401) return;
        setError(e.message);
        setFetching(false);
      });
    return () => { alive = false; };
  }, [page, query, filter, attempt]);

  const counts = result ? [result.counts.all, result.counts.ready, result.counts.notReady] : [0, 0, 0];
  return {
    q,
    setQ: setQState,
    filter,
    setFilter,
    counts,
    females: result ? result.females : [],
    page,
    setPage,
    totalPages: result ? result.totalPages : 1,
    pageSize: FEMALES_PAGE_SIZE,
    total: result ? result.total : 0,
    totalInCollection: result ? result.totalInCollection : 0,
    loading: !result && !error, // first load: show skeletons
    fetching, // page/search change: keep showing the previous page, dimmed
    error,
    retry,
  };
}

export function FilterChips({ filter, setFilter, counts, labels = FILTERS }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Filter females">
      {labels.map((f, i) => (
        <Chip key={f} type="neutral" role="radio" selected={filter === i} onClick={() => setFilter(i)}>{`${f} · ${counts[i]}`}</Chip>
      ))}
    </div>
  );
}

export function PaginationControls({ page, totalPages, total, pageSize, onPageChange }) {
  if (total <= pageSize) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-body-sm text-stone-500">Showing {from}-{to} of {total}</p>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
        <span className="min-w-20 text-center text-body-sm text-stone-500">Page {page} of {totalPages}</span>
        <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
      </div>
    </div>
  );
}

/** Loading / error / empty states shared by the modal and the mobile list. */
export function CollectionStatus({ loading, error, onRetry, total, query, layout = 'detailed' }) {
  if (loading) {
    return (
      <ul className={clsx('grid gap-3', layout === 'detailed' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-[repeat(3,264px)]' : 'grid-cols-1')} aria-busy="true" aria-label="Loading females">
        {[0, 1, 2, 3, 4, 5].slice(0, layout === 'detailed' ? 6 : 4).map((i) => (
          <li key={i} className="flex flex-col gap-3 rounded-card border border-line bg-card p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="rounded-full" style={{ width: layout === 'detailed' ? 56 : 44, height: layout === 'detailed' ? 56 : 44 }} />
              <div className="flex flex-1 flex-col gap-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-32" /></div>
            </div>
            {layout === 'detailed' && <><Skeleton className="h-6 w-28" /><Skeleton className="h-6 w-24 rounded-full" /></>}
          </li>
        ))}
      </ul>
    );
  }
  if (error) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Callout tone="Risk" title="Couldn't load your females" role="alert">{error}</Callout>
        <Button variant="secondary" size="sm" iconLeft="refresh" onClick={onRetry}>Try again</Button>
      </div>
    );
  }
  if (total === 0) {
    return <p className="rounded-tile bg-ivory-100 px-4 py-6 text-center text-body-sm text-stone-500">No females found in your Cltch collection.</p>;
  }
  if (query !== undefined) {
    return <p className="rounded-tile bg-ivory-100 px-4 py-6 text-center text-body-sm text-stone-500">No females match “{query}”.</p>;
  }
  return null;
}

/** Figma D02 — "Choose a female" modal (880px, 3-column card grid). Data: GET /api/cltch/females (paged). */
export default function FemaleSelectorModal({ open, onClose, selectedId, onSelect }) {
  const p = useFemalePages();
  const ready = !p.loading && !p.error && p.totalInCollection > 0;

  return (
    <Dialog open={open} onClose={onClose} label="Choose a female">
      <div className="flex flex-col gap-5 rounded-[20px] bg-card p-5 shadow-lg md:p-8">
        <div className="flex items-center gap-3">
          <div className="flex flex-1 flex-col gap-0.5">
            <h2 className="text-h1">Choose a female</h2>
            <p className="text-body-sm text-stone-500">
              {p.loading ? 'Loading your Cltch collection…' : `${p.totalInCollection} female${p.totalInCollection === 1 ? '' : 's'} in your Cltch collection`}
            </p>
          </div>
          <IconButton icon="x" label="Close" onClick={onClose} />
        </div>
        {ready && (
          <>
            <SearchInput value={p.q} onChange={p.setQ} label="Search females" />
            <FilterChips filter={p.filter} setFilter={p.setFilter} counts={p.counts} />
          </>
        )}
        {ready && p.total > 0 ? (
          <ul className={clsx('grid grid-cols-1 gap-3 transition-opacity sm:grid-cols-2 md:grid-cols-[repeat(3,264px)]', p.fetching && 'opacity-60')} aria-busy={p.fetching}>
            {p.females.map((f) => (
              <li key={f.id}>
                <SnakeCard snake={f} selected={f.id === selectedId} onSelect={() => onSelect(f)} />
              </li>
            ))}
          </ul>
        ) : (
          <CollectionStatus loading={p.loading} error={p.error} onRetry={p.retry} total={p.totalInCollection} query={p.q} />
        )}
        {ready && p.total > 0 && (
          <PaginationControls page={p.page} totalPages={p.totalPages} total={p.total} pageSize={p.pageSize} onPageChange={p.setPage} />
        )}
        <div className="flex items-center gap-2">
          <Icon name="info" size={16} className="shrink-0 text-stone-500" />
          <p className="text-body-sm text-stone-500">Females with missing weight or age can still be chosen; ineligible females stay visible so you can see why.</p>
        </div>
      </div>
    </Dialog>
  );
}
