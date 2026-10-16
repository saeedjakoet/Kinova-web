// Minimal Mendelian calculator for the PoC.
// Clown is recessive (copy count 0/1/2, het may be a probability); every other gene is
// treated as an independent incomplete-dominant locus (0/1 copy per parent).
// In production these odds come from Cltch's Gene Engine — the advisor never computes them.

import { VISUAL_ORDER } from './mock-data';

const EPS = 1e-9;

function clownCopies(gene, hetOverride) {
  if (!gene) return [[0, 1]];
  if (gene.visual) return [[2, 1]];
  const p = hetOverride != null ? hetOverride : gene.het;
  return p >= 1 ? [[1, 1]] : [[1, p], [0, 1 - p]];
}

function nameOf(traits, clown) {
  const base = traits.join(' ');
  if (clown === 'visual') return base ? base + ' Clown' : 'Clown';
  const look = base || 'Normal';
  return clown === 'het' ? look + ' · het Clown' : look;
}

/**
 * All offspring outcomes with probability per egg.
 * @param {{genes:Object}} female
 * @param {{genes:Object}} male
 * @param {{femaleHet?: number}} [opts] override the female's het probability (1 = proven)
 */
export function offspring(female, male, opts = {}) {
  const fg = female.genes;
  const mg = male.genes;
  const clownInvolved = !!(fg.Clown || mg.Clown);

  let pVisual = 0;
  let pHet = 0;
  for (const [cf, pf] of clownCopies(fg.Clown, fg.Clown && !fg.Clown.visual ? opts.femaleHet : null)) {
    for (const [cm, pm] of clownCopies(mg.Clown)) {
      const a = cf / 2;
      const b = cm / 2;
      pVisual += pf * pm * a * b;
      pHet += pf * pm * (a * (1 - b) + (1 - a) * b);
    }
  }
  const clownStates = clownInvolved
    ? [['visual', pVisual], ['het', pHet], ['none', 1 - pVisual - pHet]].filter((s) => s[1] > EPS)
    : [['none', 1]];

  const loci = VISUAL_ORDER.filter((g) => fg[g] || mg[g]).map((g) => {
    const a = (fg[g] || 0) / 2;
    const b = (mg[g] || 0) / 2;
    const sup = a * b;
    const single = a * (1 - b) + (1 - a) * b;
    return { gene: g, states: [['super', sup], ['single', single], ['none', 1 - sup - single]].filter((s) => s[1] > EPS) };
  });

  let combos = [{ p: 1, traits: [] }];
  for (const l of loci) {
    combos = combos.flatMap((c) => l.states.map(([s, p]) => ({
      p: c.p * p,
      traits: s === 'none' ? c.traits : c.traits.concat(s === 'super' ? 'Super ' + l.gene : l.gene),
    })));
  }
  return combos.flatMap((c) => clownStates.map(([s, p]) => ({
    name: nameOf(c.traits, s),
    p: c.p * p,
    traits: c.traits,
    visualClown: s === 'visual',
    hetClown: s === 'het',
  })));
}

/** Does an outcome visually show a trait such as "Pastel Clown"? */
export function matches(outcome, trait) {
  return trait.split(' ').every((w) => (w === 'Clown' ? outcome.visualClown : outcome.traits.some((t) => t === w || t === 'Super ' + w)));
}

/** The most specific target traits (most words), e.g. ["Pastel Clown"] from ["Clown", "Pastel Clown"]. */
export function mostSpecific(targets) {
  if (!targets || !targets.length) return [];
  const max = Math.max(...targets.map((t) => t.split(' ').length));
  return targets.filter((t) => t.split(' ').length === max);
}

/** Target = matches the most specific goal · Standard = matches any goal · Muted = neither. */
export function toneOf(outcome, targets) {
  if (!targets || !targets.length) return outcome.traits.length || outcome.visualClown ? 'Standard' : 'Muted';
  if (mostSpecific(targets).some((t) => matches(outcome, t))) return 'Target';
  if (targets.some((t) => matches(outcome, t))) return 'Standard';
  return 'Muted';
}

const TONE_RANK = { Target: 0, Standard: 1, Muted: 2 };
function firstTraitIndex(o) {
  const t = o.traits[0];
  return t ? VISUAL_ORDER.indexOf(t.replace('Super ', '')) : 99;
}

/** Outcome rows ordered like the Figma pairing detail. */
export function outcomeRows(outcomes, targets) {
  return outcomes
    .map((o) => ({ ...o, tone: toneOf(o, targets) }))
    .sort((a, b) => {
      if (TONE_RANK[a.tone] !== TONE_RANK[b.tone]) return TONE_RANK[a.tone] - TONE_RANK[b.tone];
      if (Math.abs(a.p - b.p) > EPS) return b.p - a.p;
      const byCount = a.tone === 'Target' ? a.traits.length - b.traits.length : b.traits.length - a.traits.length;
      if (byCount) return byCount;
      return firstTraitIndex(a) - firstTraitIndex(b);
    })
    .map((o) => ({ label: o.name, pct: Math.round(o.p * 100), tone: o.tone }));
}

export function sumP(outcomes, fn) {
  return outcomes.reduce((s, o) => (fn(o) ? s + o.p : s), 0);
}

export function pct(p) {
  return Math.round(p * 100) + '%';
}

export function frac(p) {
  return p > 0 ? '1 in ' + Math.round(1 / p) : 'none';
}

function binomial(n, r) {
  const out = [];
  let c = 1;
  for (let k = 0; k <= n; k++) {
    out.push(c * Math.pow(r, k) * Math.pow(1 - r, n - k));
    c = (c * (n - k)) / (k + 1);
  }
  return out;
}

/**
 * Expected count and the common (10th–90th percentile) range in a clutch, mixing over
 * the female's het uncertainty.
 * @param {{p:number, rate:number}[]} mixture
 */
export function clutchRange(mixture, n = 6) {
  const dist = new Array(n + 1).fill(0);
  let mean = 0;
  for (const m of mixture) {
    binomial(n, m.rate).forEach((v, k) => { dist[k] += m.p * v; });
    mean += m.p * m.rate * n;
  }
  let acc = 0;
  let lo = 0;
  let hi = n;
  let loSet = false;
  for (let k = 0; k <= n; k++) {
    acc += dist[k];
    if (!loSet && acc >= 0.1) { lo = k; loSet = true; }
    if (acc >= 0.9) { hi = k; break; }
  }
  return { expected: Math.round(mean), lo, hi };
}

export function joinAnd(list) {
  if (list.length <= 1) return list.join('');
  return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
}
