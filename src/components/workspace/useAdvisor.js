'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { askAdvisor, getCollection, getFemale, getMaleCandidates } from '@/lib/api';
import { mergeResults, toResults } from '@/lib/candidates';
import { femaleProfile } from '@/lib/cltch';
import { DEFAULT_GOALS, goalsFor } from '@/lib/goals';

// One reducer drives every screen in the Figma flow:
// D01 empty · D02 selector · D03 goals · D04 loading · D05 results · D06 detail · D07 compare · D08 refine · D09 error/blocked
const SHORTLIST = 10;

const initial = {
  female: null, // the selected female (females themselves load page by page in the selector)
  males: [],
  syncedAt: null,
  femaleId: null,
  goals: DEFAULT_GOALS,
  goalsTouched: false,
  goalError: null,
  run: 'idle', // idle | loading | done | error
  loadingStep: 0,
  results: null,
  error: null,
  selectedMaleId: null,
  compareIds: [],
  view: 'list', // list | detail | compare
  detailTab: 'Offspring',
  hetProven: false,
  panelCollapsed: false,
  panelMode: 'explain', // explain | chat
  chat: { messages: [], earlier: null, title: null, changes: null, followUps: null },
  asking: false,
  excludedOpen: true,
  selectorOpen: false,
  mobileScreen: 'female', // female | goals | results
  advisorSheet: false,
  goalsSheet: false,
  planned: {},
  loadingMore: false,
  loadMoreError: null,
};

function reducer(s, a) {
  switch (a.type) {
    case 'loaded':
      return { ...s, males: a.males, syncedAt: a.syncedAt };
    case 'openSelector':
      return { ...s, selectorOpen: a.open };
    case 'selectFemale':
      return {
        ...initial, males: s.males, syncedAt: s.syncedAt,
        female: a.female, femaleId: a.female.id, goals: goalsFor(a.female.id, a.female), mobileScreen: 'goals',
      };
    case 'mobileScreen':
      return { ...s, mobileScreen: a.screen, view: a.screen === 'results' ? s.view : 'list' };
    case 'setGoals':
      return { ...s, goals: a.goals, goalsTouched: true, goalError: null };
    case 'goalError':
      return { ...s, goalError: a.message };
    case 'runStart':
      return { ...s, run: 'loading', loadingStep: 0, error: null, view: 'list', panelMode: 'explain', advisorSheet: false, goalsSheet: false, mobileScreen: 'results', goalsTouched: false, chat: initial.chat, panelCollapsed: false };
    case 'runStep':
      return { ...s, loadingStep: Math.min(3, s.loadingStep + 1) };
    case 'runDone': {
      const recs = a.results.recommendations;
      return {
        ...s, run: 'done', results: a.results, error: null,
        selectedMaleId: recs[0] ? recs[0].male.id : null,
        compareIds: recs.slice(0, 2).map((r) => r.male.id),
        excludedOpen: a.results.excluded.length <= 5,
      };
    }
    case 'runError':
      return { ...s, run: 'error', error: a.error };
    case 'moreStart':
      return { ...s, loadingMore: true, loadMoreError: null };
    case 'moreDone':
      return { ...s, loadingMore: false, results: mergeResults(s.results, a.results) };
    case 'moreError':
      return { ...s, loadingMore: false, loadMoreError: a.message };
    case 'selectMale':
      return { ...s, selectedMaleId: a.id, panelMode: 'explain', panelCollapsed: false };
    case 'view':
      return { ...s, view: a.view, selectedMaleId: a.id || s.selectedMaleId, detailTab: a.view === 'detail' ? 'Offspring' : s.detailTab, hetProven: a.view === 'detail' && a.id !== s.selectedMaleId ? false : s.hetProven, compareIds: a.compareIds || s.compareIds };
    case 'tab':
      return { ...s, detailTab: a.tab };
    case 'hetProven':
      return { ...s, hetProven: a.value };
    case 'toggleCompare': {
      const has = s.compareIds.includes(a.id);
      const ids = has ? s.compareIds.filter((x) => x !== a.id) : s.compareIds.length >= 3 ? s.compareIds : [...s.compareIds, a.id];
      return { ...s, compareIds: ids };
    }
    case 'panelCollapsed':
      return { ...s, panelCollapsed: a.value };
    case 'panelMode':
      return { ...s, panelMode: a.mode };
    case 'excludedOpen':
      return { ...s, excludedOpen: a.value };
    case 'askStart':
      return {
        ...s, asking: true, panelMode: 'chat', panelCollapsed: false,
        chat: { ...s.chat, messages: [...s.chat.messages, { role: 'user', text: a.question }, { role: 'advisor', text: null }] },
      };
    case 'askDone': {
      const r = a.response;
      const messages = s.chat.messages.slice(0, -1).concat({ role: 'advisor', text: r.reply });
      let next = { ...s, asking: false, chat: { ...s.chat, messages } };
      const act = r.action || {};
      if (act.type === 'setObjective' && r.results) {
        const recs = r.results.recommendations;
        const prevObjective = s.goals.objective;
        next = {
          ...next,
          goals: { ...s.goals, objective: act.objective },
          results: r.results,
          selectedMaleId: recs[0] ? recs[0].male.id : null,
          compareIds: recs.slice(0, 2).map((x) => x.male.id),
          view: 'list',
          excludedOpen: false,
          chat: {
            ...next.chat,
            earlier: s.chat.earlier || r.earlier,
            title: r.title,
            changes: r.changes,
            followUps: [
              act.objective === 'Low risk' ? 'Why does track record matter so much?' : 'What changed in the scores?',
              `Go back to ${prevObjective}`,
              recs.length >= 2 ? `Compare ${recs[0].male.name} and ${recs[1].male.name}` : null,
            ].filter(Boolean),
          },
        };
      }
      if (act.type === 'hetProven') next = { ...next, hetProven: true, view: 'detail', selectedMaleId: act.maleId || s.selectedMaleId, detailTab: 'Offspring' };
      if (act.type === 'openCompare') next = { ...next, view: 'compare', compareIds: act.ids };
      if (act.type === 'select') next = { ...next, selectedMaleId: act.maleId };
      if (act.type === 'openSelector') next = { ...next, selectorOpen: true };
      return next;
    }
    case 'askError': {
      const messages = s.chat.messages.slice(0, -1).concat({ role: 'advisor', text: `Sorry — I couldn't answer that (${a.message}). Try again in a moment.` });
      return { ...s, asking: false, chat: { ...s.chat, messages } };
    }
    case 'advisorSheet':
      return { ...s, advisorSheet: a.open };
    case 'goalsSheet':
      return { ...s, goalsSheet: a.open };
    case 'plan':
      return { ...s, planned: { ...s.planned, [a.id]: !s.planned[a.id] } };
    case 'reset':
      return { ...initial, males: s.males, syncedAt: s.syncedAt };
    default:
      return s;
  }
}

export default function useAdvisor() {
  const [s, dispatch] = useReducer(reducer, initial);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const simulateFailure = params.get('fail') === '1';
  const pendingView = useRef(null);
  const timer = useRef(null);

  // Sample males from the mock route. Females are paged from FastAPI by the selector (useFemalePages).
  useEffect(() => {
    let alive = true;
    getCollection().then((d) => { if (alive) dispatch({ type: 'loaded', males: d.males, syncedAt: d.syncedAt }); });
    return () => { alive = false; };
  }, []);

  const female = s.female;
  const results = s.results;
  const recs = results ? results.recommendations : [];
  const selected = recs.find((r) => r.male.id === s.selectedMaleId) || recs[0] || null;

  // Find pairings: ranked males from the API (shortlist of 10; "check more" pages through the rest).
  // Breeding goals are not sent yet — objectives aren't connected; ranking uses provisional criteria.
  const run = useCallback(async () => {
    if (!s.femaleId) return;
    dispatch({ type: 'runStart' });
    clearInterval(timer.current);
    timer.current = setInterval(() => dispatch({ type: 'runStep' }), 420);
    try {
      if (simulateFailure) throw Object.assign(new Error("Cltch didn't respond in time."), { code: 'GENE_ENGINE_TIMEOUT' });
      const data = await getMaleCandidates(s.femaleId, { limit: SHORTLIST });
      dispatch({ type: 'runDone', results: toResults(data, female) });
      const pv = pendingView.current;
      pendingView.current = null;
      if (pv && pv.view !== 'list') {
        const ids = data.recommendations.map((r) => r.male.id);
        if (pv.view === 'detail' && ids.includes(pv.male)) dispatch({ type: 'view', view: 'detail', id: pv.male });
        if (pv.view === 'compare') dispatch({ type: 'view', view: 'compare' });
      }
    } catch (e) {
      dispatch({ type: 'runError', error: { code: e.code || 'UNKNOWN', message: e.message, runId: e.payload && e.payload.runId, status: e.status } });
    } finally {
      clearInterval(timer.current);
    }
  }, [s.femaleId, simulateFailure, female]);

  const loadMore = useCallback(async () => {
    const paging = s.results && s.results.paging;
    if (!s.femaleId || s.loadingMore || !paging || !paging.hasMore) return;
    dispatch({ type: 'moreStart' });
    try {
      const data = await getMaleCandidates(s.femaleId, { offset: paging.nextOffset, limit: SHORTLIST });
      dispatch({ type: 'moreDone', results: toResults(data, female) });
    } catch (e) {
      dispatch({ type: 'moreError', message: e.message });
    }
  }, [s.femaleId, s.loadingMore, s.results, female]);

  // Warm the API caches (female, male list, pedigree) as soon as a female is picked,
  // so Find pairings only pays for the shortlist checks.
  useEffect(() => {
    if (!s.femaleId || !female || !female.ready) return;
    getMaleCandidates(s.femaleId, { limit: 0 }).catch(() => {});
  }, [s.femaleId, female]);

  useEffect(() => () => clearInterval(timer.current), []);

  // Deep links: /advisor?female=juniper&view=detail&male=atlas  (also ?female=ember → blocked state)
  // The female is fetched by id because she may not be on the first page of the selector.
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current) return undefined;
    const fid = params.get('female');
    if (!fid) { deepLinked.current = true; return undefined; }
    let alive = true;
    getFemale(fid)
      .then((f) => {
        if (!alive) return;
        deepLinked.current = true;
        const view = params.get('view');
        if (f.ready && view) pendingView.current = { view, male: params.get('male') };
        dispatch({ type: 'selectFemale', female: f });
      })
      .catch(() => { if (alive) deepLinked.current = true; }); // unknown id or Cltch down: start without a selection
    return () => { alive = false; };
  }, [params]);

  // Auto-run after a deep link selected a ready female with a view
  useEffect(() => {
    if (pendingView.current && s.femaleId && s.run === 'idle') run();
  }, [s.femaleId, s.run, run]);

  // Keep the URL in sync (shareable state; back/forward reloads into the same state)
  useEffect(() => {
    if (!deepLinked.current) return;
    const q = new URLSearchParams();
    if (s.femaleId) q.set('female', s.femaleId);
    if (s.run === 'done' && s.view !== 'list') q.set('view', s.view);
    if (s.run === 'done' && s.view === 'detail' && s.selectedMaleId) q.set('male', s.selectedMaleId);
    if (simulateFailure) q.set('fail', '1');
    const next = q.toString();
    if (next !== params.toString()) router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [s.femaleId, s.view, s.selectedMaleId, s.run, simulateFailure, params, pathname, router]);

  // Scroll to top when the main view changes
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' }); }, [s.view, s.mobileScreen]);

  const ask = useCallback(async (question) => {
    if (!s.femaleId || s.asking) return;
    dispatch({ type: 'askStart', question });
    try {
      const r = await askAdvisor({ femaleId: s.femaleId, goals: s.goals, question, context: { selectedMaleId: s.selectedMaleId, compareIds: s.compareIds }, female: femaleProfile(female) });
      dispatch({ type: 'askDone', response: r });
    } catch (e) {
      dispatch({ type: 'askError', message: e.message });
    }
  }, [s.femaleId, s.goals, s.selectedMaleId, s.compareIds, s.asking, female]);

  const actions = {
    openSelector: (open = true) => dispatch({ type: 'openSelector', open }),
    selectFemale: (female) => dispatch({ type: 'selectFemale', female }),
    setGoals: (goals) => dispatch({ type: 'setGoals', goals }),
    run,
    retry: () => run(),
    loadMore,
    selectMale: (id) => dispatch({ type: 'selectMale', id }),
    viewDetail: (id) => dispatch({ type: 'view', view: 'detail', id }),
    viewList: () => dispatch({ type: 'view', view: 'list' }),
    viewCompare: (ids) => dispatch({ type: 'view', view: 'compare', compareIds: ids }),
    setTab: (tab) => dispatch({ type: 'tab', tab }),
    setHetProven: (value) => dispatch({ type: 'hetProven', value }),
    toggleCompare: (id) => dispatch({ type: 'toggleCompare', id }),
    setPanelCollapsed: (value) => dispatch({ type: 'panelCollapsed', value }),
    setPanelMode: (mode) => dispatch({ type: 'panelMode', mode }),
    setExcludedOpen: (value) => dispatch({ type: 'excludedOpen', value }),
    ask,
    setMobileScreen: (screen) => dispatch({ type: 'mobileScreen', screen }),
    setAdvisorSheet: (open) => dispatch({ type: 'advisorSheet', open }),
    setGoalsSheet: (open) => dispatch({ type: 'goalsSheet', open }),
    togglePlan: (id) => dispatch({ type: 'plan', id }),
    startOver: () => { dispatch({ type: 'reset' }); router.replace(simulateFailure ? `${pathname}?fail=1` : pathname, { scroll: false }); },
  };

  return { s, female, results, recs, selected, actions, simulateFailure };
}
