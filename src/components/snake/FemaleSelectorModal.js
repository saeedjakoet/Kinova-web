'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Dialog } from '../ui/Overlay';
import Button, { IconButton } from '../ui/Button';
import Chip from '../ui/Chip';
import Icon from '../ui/Icon';
import { SearchInput } from '../ui/Fields';
import { Callout, Skeleton } from '../ui/Misc';
import { SnakeCard } from './SnakeCards';

const FILTERS = ['All females', 'Ready to breed', 'Not ready'];
const PAGE_SIZE = 6;

export function useFemaleFilter(females) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState(0);
  const [page, setPage] = useState(1);
  const counts = [females.length, females.filter((f) => f.ready).length, females.filter((f) => !f.ready).length];
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return females.filter((f) => {
      if (filter === 1 && !f.ready) return false;
      if (filter === 2 && f.ready) return false;
      if (!s) return true;
      return [f.name, f.cltchId, String(f.id), f.morph, f.line, ...(f.morphNames || [])]
        .some((v) => String(v || '').toLowerCase().includes(s));
    });
  }, [females, q, filter]);
  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const pageClamped = Math.min(page, totalPages);
  const pageStart = (pageClamped - 1) * PAGE_SIZE;
  const pagedShown = useMemo(() => shown.slice(pageStart, pageStart + PAGE_SIZE), [shown, pageStart]);

  useEffect(() => setPage(1), [q, filter]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return {
    q, setQ, filter, setFilter, counts, shown, page: pageClamped, setPage, totalPages, pagedShown, pageSize: PAGE_SIZE,
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

/** Figma D02 — "Choose a female" modal (880px, 3-column card grid). Data: GET /api/cltch/females. */
export default function FemaleSelectorModal({ open, onClose, females, selectedId, onSelect, loading, error, onRetry }) {
  const { q, setQ, filter, setFilter, counts, shown, pagedShown, page, setPage, totalPages, pageSize } = useFemaleFilter(females);
  const ready = !loading && !error && females.length > 0;

  return (
    <Dialog open={open} onClose={onClose} label="Choose a female">
      <div className="flex flex-col gap-5 rounded-[20px] bg-card p-5 shadow-lg md:p-8">
        <div className="flex items-center gap-3">
          <div className="flex flex-1 flex-col gap-0.5">
            <h2 className="text-h1">Choose a female</h2>
            <p className="text-body-sm text-stone-500">
              {loading ? 'Loading your Cltch collection…' : `${females.length} female${females.length === 1 ? '' : 's'} in your Cltch collection`}
            </p>
          </div>
          <IconButton icon="x" label="Close" onClick={onClose} />
        </div>
        {ready && (
          <>
            <SearchInput value={q} onChange={setQ} label="Search females" />
            <FilterChips filter={filter} setFilter={setFilter} counts={counts} />
          </>
        )}
        {ready && shown.length > 0 ? (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-[repeat(3,264px)]">
            {pagedShown.map((f) => (
              <li key={f.id}>
                <SnakeCard snake={f} selected={f.id === selectedId} onSelect={() => onSelect(f.id)} />
              </li>
            ))}
          </ul>
        ) : (
          <CollectionStatus loading={loading} error={error} onRetry={onRetry} total={females.length} query={q} />
        )}
        {ready && shown.length > 0 && (
          <PaginationControls page={page} totalPages={totalPages} total={shown.length} pageSize={pageSize} onPageChange={setPage} />
        )}
        <div className="flex items-center gap-2">
          <Icon name="info" size={16} className="shrink-0 text-stone-500" />
          <p className="text-body-sm text-stone-500">Females with missing weight or age can still be chosen; ineligible females stay visible so you can see why.</p>
        </div>
      </div>
    </Dialog>
  );
}
