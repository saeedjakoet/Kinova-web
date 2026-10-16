// Mock advisor backend (server-side only — used by the API route handlers).
// Mirrors the pipeline in Kinova_Breeding_Advisor_Meeting_Brief.md:
// readiness → eligibility (reason codes) → offspring odds → scoring/ranking → plain-language explanation.
// Swap this module for real Cltch calls + the Python ranking without changing the UI contract.

import {
  FEMALES, MALES, KINSHIP_LIMIT, SCORE_OVERRIDES, REASON_OVERRIDES, SUMMARY_OVERRIDES,
  COMPARE_OVERRIDES, LOW_RISK_REPLY_OVERRIDE, VISUAL_ORDER, findFemale, findMale,
} from './mock-data';
import { offspring, matches, mostSpecific, outcomeRows, sumP, pct, frac, clutchRange, joinAnd } from './genetics';

const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

/** Approximate genes from Cltch morph names, e.g. ["Pastel", "66% het Clown", "Banana"]. */
export function genesFromMorphs(names) {
  const genes = {};
  const unmodelled = [];
  for (const raw of names || []) {
    const n = String(raw).trim();
    if (!n) continue;
    const het = n.match(/^(?:(\d{1,3})\s*%\s*|possible\s+|pos\.?\s+)?het\s+([a-z]+)$/i);
    if (het) {
      if (cap(het[2]) === 'Clown') {
        const p = het[1] ? Math.min(1, Number(het[1]) / 100) : /possible|pos/i.test(n) ? 0.5 : 1;
        genes.Clown = p < 1 ? { het: p, hetLabel: `${Math.round(p * 100)}%` } : { het: 1 };
      } else unmodelled.push(n);
      continue;
    }
    const sup = n.match(/^super\s+([a-z]+)$/i);
    if (sup && VISUAL_ORDER.includes(cap(sup[1]))) { genes[cap(sup[1])] = 2; continue; }
    const unknownWords = [];
    n.split(/\s+/).forEach((w) => {
      const g = cap(w);
      if (g === 'Clown') genes.Clown = { visual: true };
      else if (VISUAL_ORDER.includes(g)) genes[g] = Math.max(genes[g] || 0, 1);
      else if (g !== 'Normal') unknownWords.push(w);
    });
    if (unknownWords.length) unmodelled.push(unknownWords.join(' '));
  }
  return { genes, unmodelled: [...new Set(unmodelled)] };
}

function femaleFromProfile(p) {
  const { genes, unmodelled } = genesFromMorphs(p.morphNames);
  return {
    ...p,
    sex: 'female',
    genes,
    unmodelled,
    ready: p.ready !== false,
    lineage: { parents: 'Not recorded in Cltch', generations: 0, unknown: true },
    blocked: p.ready === false ? {
      title: `${p.name} isn't ready to breed yet`,
      body: 'She failed a readiness check (see her summary).',
      advisor: `I only suggest pairings for females that pass every readiness check. ${p.name} doesn't yet.`,
    } : null,
    fromCltch: true,
  };
}

function resolveFemale(femaleId, profile) {
  const known = findFemale(femaleId);
  if (known) return known;
  if (profile && profile.id === femaleId) return femaleFromProfile(profile);
  return null;
}

const DOWNGRADE = { High: 'Medium', Medium: 'Low', Low: 'Low' };

export class EngineError extends Error {
  constructor(status, code, message, extra) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra || {};
  }
}

const WEIGHTS = {
  'Rare morph': { target: 0.5, variety: 0.2, record: 0.15, conf: 0.15 },
  'Low risk': { target: 0.15, variety: 0.05, record: 0.45, conf: 0.35 },
  Variability: { target: 0.1, variety: 0.6, record: 0.15, conf: 0.15 },
  'Quick success': { target: 0.3, variety: 0.1, record: 0.4, conf: 0.2 },
  'Target morph': { target: 0.7, variety: 0.05, record: 0.1, conf: 0.15 },
};
const CONF_VALUE = { High: 1, Medium: 0.75, Low: 0.45 };
const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth'];
const COUNT_WORD = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];

export function levelFor(score) {
  return score >= 80 ? 'Strong' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Low';
}

function newGenes(female, male) {
  return VISUAL_ORDER.filter((g) => male.genes[g] && !female.genes[g] && g !== 'Spider');
}

function femaleHetInfo(female) {
  const c = female.genes.Clown;
  if (!c || c.visual || c.het >= 1) return null;
  return { p: c.het, label: c.hetLabel || pct(c.het) };
}

function clownWanted(goals) {
  return goals.traits.some((t) => t.includes('Clown'));
}

// ---------------------------------------------------------------------------
// Per-pair facts
// ---------------------------------------------------------------------------
function pairFacts(female, male, goals) {
  const het = femaleHetInfo(female);
  const recorded = offspring(female, male);
  const proven = het ? offspring(female, male, { femaleHet: 1 }) : null;
  const notHet = het ? offspring(female, male, { femaleHet: 0 }) : null;
  const spec = mostSpecific(goals.traits)[0] || null;
  const clownInvolved = !!(female.genes.Clown || male.genes.Clown);
  const rel = male.relations && male.relations[female.id];
  const kinship = male.lineage.sireMissing || female.lineage.unknown ? null : rel ? rel.kinship : 0;
  const pVisual = sumP(recorded, (o) => o.visualClown);
  const pVisualProven = proven ? sumP(proven, (o) => o.visualClown) : pVisual;
  const pTarget = spec ? sumP(recorded, (o) => matches(o, spec)) : null;
  const pTargetProven = spec && proven ? sumP(proven, (o) => matches(o, spec)) : pTarget;
  const variety = new Set(recorded.filter((o) => o.traits.length || o.visualClown).map((o) => o.name.split(' · ')[0])).size;
  return { female, male, goals, het, recorded, proven, notHet, spec, clownInvolved, rel, kinship, pVisual, pVisualProven, pTarget, pTargetProven, variety, adds: newGenes(female, male) };
}

function scoreFor(d, objective, goals) {
  const override = SCORE_OVERRIDES[d.female.id + ':' + objective];
  if (override && override[d.male.id] != null) return override[d.male.id];
  const w = WEIGHTS[objective] || WEIGHTS['Rare morph'];
  const target = d.spec ? Math.min(1, (d.pTarget || 0) / 0.5) : Math.min(1, d.variety / 8);
  const variety = Math.min(1, d.variety / 8);
  const record = d.male.record.proven ? Math.min(1, 0.6 + 0.1 * d.male.record.clutches) : 0.3;
  const conf = CONF_VALUE[d.male.confidence];
  let s = 30 + 68 * (w.target * target + w.variety * variety + w.record * record + w.conf * conf);
  if (goals.constraints.includes('provenOnly') && !d.male.record.proven) s -= 8;
  if (goals.preferredMaleId === d.male.id) s += 4;
  return Math.max(1, Math.min(99, Math.round(s)));
}

function reasonFor(d) {
  const o = REASON_OVERRIDES[d.female.id + ':' + d.male.id];
  if (o) return o;
  const m = d.male;
  const other = VISUAL_ORDER.filter((g) => m.genes[g]);
  if (m.genes.Clown && m.genes.Clown.visual) {
    if (d.pVisual === 0) return `Visual Clown${other.length ? ' ' + other.join(' ') : ''}. Every baby will be het Clown, setting up visual Clowns next generation.`;
    return `Visual Clown${other.length ? ' ' + other.join(' ') : ''}. Every baby carries Clown; about ${frac(d.pVisual)} eggs should be visual Clowns${d.spec && d.spec !== 'Clown' && d.pTarget > 0 ? `, with ${d.spec}s possible` : ''}.`;
  }
  if (m.genes.Clown) {
    const lead = `${m.record.proven ? 'Proven' : 'Unproven'} het Clown${other.length ? ' with ' + joinAnd(other) : ''}.`;
    return d.pVisual > 0 ? `${lead} Visual Clown odds are ${pct(d.pVisual)} per egg.` : `${lead} No visual Clowns this season; about half the babies will be het Clown.`;
  }
  return `No Clown genes${clownWanted(d.goals) ? ', so no visual Clowns this season' : ''}. Adds ${joinAnd(d.adds.length ? d.adds : other)}.`;
}

function statsFor(d) {
  const m = d.male;
  const fg = d.female.lineage.generations;
  const mg = m.lineage.generations;
  let target;
  if (d.spec) {
    target = ['Target odds', `${pct(d.pTarget)} ${d.spec}`, d.pTarget === 0 ? `Adds ${d.adds.join(' & ') || 'no new genes'}` : d.het ? `${pct(d.pTargetProven)} if het proven` : 'Chance per egg'];
  } else {
    target = ['Variety', `${d.variety} visual morphs`, `Adds ${d.adds.join(' & ') || 'no new genes'}`];
  }
  const kin = d.kinship == null
    ? ['Kinship', 'Unknown', 'Sire not recorded']
    : ['Kinship', `${pct(d.kinship)} · ${d.kinship === 0 ? 'unrelated' : 'related'}`, `${Math.min(fg, mg) === Math.max(fg, mg) ? fg : Math.min(fg, mg) + '–' + Math.max(fg, mg)} generations checked`];
  const record = m.record.proven
    ? ['Track record', `Proven · ${m.record.clutches} clutch${m.record.clutches === 1 ? '' : 'es'}`, m.record.note]
    : ['Track record', 'Unproven', m.record.note];
  return [target, kin, record];
}

function flagFor(d) {
  if (d.female.lineage.unknown) return `${d.female.name}'s lineage isn't recorded in Cltch, so kinship can't be checked.`;
  if (d.male.lineage.sireMissing) return `${d.male.name}'s sire isn't recorded, so kinship can't be fully checked.`;
  if (d.het && d.male.genes.Clown && d.male.genes.Clown.visual) return `${d.female.name}'s het Clown is unproven (${d.het.label}). Odds already account for that.`;
  return null;
}

function summaryOdds(d) {
  const rows = [];
  if (d.clownInvolved) rows.push({ label: 'Any visual Clown', pct: Math.round(d.pVisual * 100), tone: clownWanted(d.goals) ? 'Target' : 'Standard' });
  if (d.spec && d.spec !== 'Clown') {
    const names = [...new Set(d.recorded.filter((o) => matches(o, d.spec)).map((o) => o.name))].filter((n) => n !== d.spec);
    rows.push({ label: d.spec + (names.length ? ` (incl. ${joinAnd(names)})` : ''), pct: Math.round(d.pTarget * 100), tone: 'Target' });
  }
  d.adds.forEach((g) => rows.push({ label: `${g} (any)`, pct: Math.round(sumP(d.recorded, (o) => o.traits.some((t) => t === g || t === 'Super ' + g)) * 100), tone: 'Standard' }));
  if (d.clownInvolved) rows.push({ label: 'Het Clown carriers (look normal for Clown)', pct: Math.round(sumP(d.recorded, (o) => o.hetClown) * 100), tone: 'Muted' });
  return rows.slice(0, 4);
}

function tilesFor(d, proven) {
  const outs = proven && d.proven ? d.proven : d.recorded;
  if (!d.clownInvolved) {
    const tiles = d.adds.slice(0, 2).map((g) => ({ label: `${g} (any)`, value: pct(sumP(outs, (o) => o.traits.includes(g))), note: 'Chance per egg' }));
    tiles.push({ label: 'Visual morphs', value: String(d.variety), note: 'Possible combinations' });
    return tiles;
  }
  const pV = sumP(outs, (o) => o.visualClown);
  const mixture = !proven && d.het
    ? [{ p: d.het.p, rate: sumP(d.proven, (o) => o.visualClown) }, { p: 1 - d.het.p, rate: sumP(d.notHet, (o) => o.visualClown) }]
    : [{ p: 1, rate: pV }];
  const c = clutchRange(mixture, 6);
  const tiles = [{ label: 'Any visual Clown', value: pct(pV), note: !proven && d.het ? `${pct(d.pVisualProven)} if het proven` : d.het ? `${pct(d.pVisual)} as recorded` : 'Chance per egg' }];
  if (d.spec && d.spec !== 'Clown') {
    const pT = sumP(outs, (o) => matches(o, d.spec));
    tiles.push({ label: d.spec, value: pct(pT), note: !proven && d.het ? `${pct(d.pTargetProven)} if het proven` : d.het ? `${pct(d.pTarget)} as recorded` : 'Chance per egg' });
  }
  tiles.push({ label: '6-egg clutch', value: `~${c.expected} Clown${c.expected === 1 ? '' : 's'}`, note: c.hi === 0 ? 'None expected' : `${c.lo}–${c.hi} is common` });
  return tiles;
}

function geneticsSentence(d) {
  const genes = VISUAL_ORDER.filter((g) => d.female.genes[g] || d.male.genes[g]);
  const parts = [];
  if (d.clownInvolved) parts.push('Clown is recessive');
  if (genes.length) parts.push(`${joinAnd(genes)} ${genes.length === 1 ? 'is' : 'are'} incomplete dominant`);
  const shared = genes.filter((g) => d.female.genes[g] && d.male.genes[g]);
  let s = parts.join('; ') + '. ';
  s += shared.length ? `Super ${joinAnd(shared)} ${shared.length === 1 ? 'is' : 'are'} possible (25% per egg); no lethal combinations. ` : 'No super forms or lethal combinations are possible. ';
  const fg = d.female.lineage.generations;
  const mg = d.male.lineage.generations;
  const gens = fg === mg ? `${fg}` : `${Math.min(fg, mg)}–${Math.max(fg, mg)}`;
  s += d.kinship == null
    ? d.female.lineage.unknown ? `${d.female.name}'s lineage isn't recorded, so kinship is unknown.` : `${d.male.name}'s sire isn't recorded, so kinship is unknown.`
    : d.kinship === 0
      ? `${d.female.name} and ${d.male.name} share no ancestors in ${gens} recorded generations (kinship 0%).`
      : `${d.female.name} and ${d.male.name} are related (kinship ${pct(d.kinship)}).`;
  return s;
}

function geneticsBullets(d) {
  const f = d.female.name;
  const m = d.male.name;
  const out = [];
  if (d.male.genes.Clown && d.male.genes.Clown.visual) out.push(`Clown is recessive. ${m} passes one copy to every baby; a visual Clown also needs one from ${f}.`);
  else if (d.male.genes.Clown) out.push(`Clown is recessive. A visual Clown needs a copy from both ${m} and ${f}.`);
  else if (d.female.genes.Clown) out.push(`Clown is recessive. ${m} doesn't carry it, so babies can be het at most.`);
  const genes = VISUAL_ORDER.filter((g) => d.female.genes[g] || d.male.genes[g]);
  const shared = genes.filter((g) => d.female.genes[g] && d.male.genes[g]);
  const singles = genes.filter((g) => !shared.includes(g));
  if (singles.length) out.push(`${joinAnd(singles)} ${singles.length === 1 ? 'is' : 'are'} incomplete dominant — 50% chance ${singles.length === 1 ? '' : 'each '}per egg.`);
  out.push(shared.length ? `Super ${joinAnd(shared)} possible (25% per egg) — no lethal or welfare-risk combinations.` : 'No super forms, lethal or welfare-risk combinations in this pairing.');
  return out;
}

function caveatFor(d) {
  const f = d.female;
  const m = d.male;
  const parts = [];
  if (d.het && m.genes.Clown && m.genes.Clown.visual) parts.push(`${f.name} hasn't produced a Clown yet, so her het status is a probability. If she isn't het, you'll get het Clown carriers but no visual Clowns.`);
  else if (d.het && m.genes.Clown) parts.push(`Visual Clowns need ${f.name} to be het as well — that's ${d.het.label} likely, not proven.`);
  if (m.lineage.sireMissing) parts.push(`${m.name}'s sire isn't recorded, so kinship can't be fully checked.`);
  if (f.lineage.unknown) parts.push(`${f.name}'s lineage isn't recorded in Cltch, so kinship can't be checked.`);
  const missing = (f.readiness || []).filter((r) => r[0] === 'warn' && /^Unknown/.test(r[2])).map((r) => r[1].toLowerCase());
  if (missing.length) parts.push(`${f.name}'s ${joinAnd(missing)} ${missing.length === 1 ? "isn't" : "aren't"} recorded — confirm she meets the breeding minimums before pairing.`);
  if (f.unmodelled && f.unmodelled.length) parts.push(`${joinAnd(f.unmodelled)} ${f.unmodelled.length === 1 ? "isn't" : "aren't"} modelled in the PoC genetics yet, so ${f.unmodelled.length === 1 ? "it's" : "they're"} left out of these odds.`);
  if (!m.record.proven) parts.push(`${m.name} is unproven, so fertility is unknown.`);
  else if (m.record.clutches === 1) parts.push(`${m.name} has only one recorded clutch.`);
  if (!parts.length) return { tone: 'Info', title: 'Good to know', body: 'Odds are calculated per egg. A typical clutch is 5–8 eggs, so real results vary.' };
  return { tone: 'Caution', title: 'Things to consider', body: parts.join(' ') };
}

function summaryFor(d, rank, objective) {
  const o = SUMMARY_OVERRIDES[d.female.id + ':' + d.male.id];
  if (o && rank === 1 && objective === 'Rare morph') return o;
  const f = d.female;
  const m = d.male;
  let s = rank === 1
    ? `${m.name} is the best fit for ${d.spec ? d.spec + 's' : objective.toLowerCase() + ' goals'}.`
    : `${m.name} ranks #${rank} for ${objective.toLowerCase()}.`;
  if (m.genes.Clown && m.genes.Clown.visual) {
    s += d.het
      ? ` As a visual Clown he passes Clown to every baby — so whether you get visual Clowns depends on ${f.name}, who is likely (${d.het.label}) but not proven het.`
      : d.pVisual > 0 ? ` As a visual Clown he passes Clown to every baby, and ${f.name} carries it too — about ${frac(d.pVisual)} eggs should be visual Clowns.` : ' As a visual Clown he makes every baby het Clown.';
  } else if (m.genes.Clown) {
    s += d.pVisual > 0 ? ` He's a ${m.record.proven ? 'proven' : 'possible'} het Clown, so visual Clowns need ${f.name} to carry Clown too — about ${frac(d.pVisual)} eggs.` : ` He carries Clown, so about half the babies will be het.`;
  } else {
    s += ` He adds ${joinAnd(d.adds) || 'variety'} but no Clown${clownWanted(d.goals) ? ', so no visual Clowns this season' : ''}.`;
  }
  if (m.record.proven && m.record.clutches >= 3) s += ` He's the most reliable choice, with ${m.record.sentence}.`;
  return s;
}

function fitsFor(d) {
  const out = [];
  if (d.goals.traits.length && d.clownInvolved && clownWanted(d.goals)) {
    out.push(d.pVisual > 0
      ? `Target trait: about ${frac(d.pVisual)} eggs could be a visual Clown${d.spec && d.spec !== 'Clown' && d.pTarget > 0 ? `, and ${frac(d.pTarget)} a ${d.spec}` : ''}.`
      : 'Target trait: no visual Clowns are possible from this pairing.');
  } else {
    out.push(`Variety: ${d.variety} visual morph combinations are possible.`);
  }
  if (d.goals.constraints.includes('avoidSpider')) out.push(`Avoid Spider: ${d.male.name} carries no Spider and no welfare-risk genes.`);
  out.push(d.male.record.proven ? `Proven male: ${d.male.record.sentence}.` : `Unproven male: ${d.male.record.sentence}.`);
  return out;
}

function lineageFor(d) {
  const m = d.male;
  return {
    kinship: d.kinship == null ? 'Unknown' : pct(d.kinship),
    rows: [
      [d.female.lineage.unknown ? 'warn' : 'ok', d.female.name, d.female.lineage.parents],
      [m.lineage.generations >= 3 && !m.lineage.sireMissing ? 'ok' : 'warn', m.name, `${m.lineage.parents} · ${m.lineage.generations} generation${m.lineage.generations === 1 ? '' : 's'}`],
    ],
    note: d.kinship == null ? (d.female.lineage.unknown ? "Kinship can't be checked without the female's lineage." : "Kinship can't be fully checked without the sire.") : 'No shared ancestors found in the recorded generations.',
  };
}

function completenessFor(d) {
  const f = d.female;
  const m = d.male;
  const rows = [f.unmodelled && f.unmodelled.length
    ? ['warn', 'Genotypes', `${f.name}: ${joinAnd(f.unmodelled)} not modelled`]
    : ['ok', 'Genotypes', f.fromCltch ? `${f.name}'s morphs from Cltch` : 'Both recorded in Cltch']];
  if (f.lineage.unknown) rows.push(['warn', `${f.name} lineage`, 'Not recorded in Cltch']);
  if (d.het) rows.push(['warn', `${f.name} het`, `${d.het.label} possible — not proven by a clutch`]);
  rows.push([m.lineage.generations >= 3 && !m.lineage.sireMissing ? 'ok' : 'warn', `${m.name} lineage`, m.lineage.note || `${m.lineage.generations} generations`]);
  rows.push(m.record.proven
    ? ['ok', 'Clutch history', `${m.name}: ${historyOf(m)}`]
    : ['warn', 'Clutch history', `${m.name}: no clutches yet`]);
  rows.push(['ok', 'Weights', 'Updated 12 days ago']);
  return rows;
}

function historyOf(m) {
  if (!m.record.proven) return 'No clutches yet';
  if (m.record.clutches === 1) return '1 clutch · ' + m.record.note.replace(' eggs', '');
  return `${m.record.clutches} clutches · ${m.record.note}`;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
export function exclusionFor(female, male, goals) {
  if (male.immature) return { code: 'IMMATURE', reason: male.immature.reason };
  if (male.genes.Spider) {
    return goals.constraints.includes('avoidSpider')
      ? { code: 'AVOID_GENE · WELFARE', reason: "Carries Spider — matches your 'Avoid Spider' constraint and the welfare rule (neurological wobble)." }
      : { code: 'WELFARE', reason: 'Carries Spider, which is linked to a neurological wobble — excluded by the welfare rule.' };
  }
  const rel = male.relations && male.relations[female.id];
  if (rel && rel.kinship > KINSHIP_LIMIT) {
    return { code: 'KINSHIP_LIMIT', reason: `${rel.text}. Kinship ${pct(rel.kinship)} exceeds your 6.25% limit.` };
  }
  return null;
}

/**
 * @param {string} femaleId
 * @param {{text:string, objective:string, traits:string[], constraints:string[], preferredMaleId:?string}} goals
 */
export function evaluate(femaleId, goals, profile) {
  const female = resolveFemale(femaleId, profile);
  if (!female) throw new EngineError(404, 'FEMALE_NOT_FOUND', 'Unknown female.');
  if (!female.ready) throw new EngineError(422, 'FEMALE_NOT_READY', female.blocked ? female.blocked.body : 'Female failed readiness checks.', { checks: female.readiness });
  if (!goals.text.trim() && !goals.traits.length) throw new EngineError(400, 'GOALS_REQUIRED', 'Describe at least one goal or pick a target trait.');

  const objective = goals.objective;
  const excluded = [];
  const eligible = [];
  for (const male of MALES) {
    const ex = exclusionFor(female, male, goals);
    if (ex) excluded.push({ male: publicSnake(male), code: ex.code, reason: ex.reason });
    else eligible.push(pairFacts(female, male, goals));
  }
  const scored = eligible.map((d) => ({ d, score: scoreFor(d, objective, goals) })).sort((a, b) => b.score - a.score);
  const n = scored.length;
  const kinEx = excluded.find((e) => e.code === 'KINSHIP_LIMIT') || excluded[0];

  const recommendations = scored.map(({ d, score }, i) => {
    const rank = i + 1;
    const otherName = rank === 1 ? scored[1] && scored[1].d.male.name : scored[0].d.male.name;
    const followUps = [
      d.het ? `What if ${female.name}'s het is proven?` : 'Compare the top two males',
      otherName ? `Why is ${otherName} ranked ${ORDINAL[rank === 1 ? 1 : 0]}?` : null,
      kinEx ? `Why was ${kinEx.male.name} excluded?` : null,
      objective === 'Low risk' ? 'Go back to Rare morph' : 'Show low-risk options instead',
    ].filter(Boolean);
    return {
      male: publicSnake(d.male),
      rank,
      score,
      level: levelFor(score),
      confidence: female.lineage.unknown ? DOWNGRADE[d.male.confidence] : d.male.confidence,
      reason: reasonFor(d),
      stats: statsFor(d),
      flag: flagFor(d),
      hetProvenAvailable: !!d.het,
      odds: { recorded: outcomeRows(d.recorded, goals.traits), proven: d.proven ? outcomeRows(d.proven, goals.traits) : null },
      tiles: { recorded: tilesFor(d, false), proven: d.het ? tilesFor(d, true) : null },
      explanation: {
        title: `Why ${d.male.name}?`,
        subtitle: `${female.name} × ${d.male.name} · ranked #${rank} of ${n}`,
        summary: summaryFor(d, rank, objective),
        fits: fitsFor(d),
        odds: summaryOdds(d),
        genetics: geneticsSentence(d),
        caveat: caveatFor(d),
        followUps,
      },
      geneticsBullets: geneticsBullets(d),
      lineage: lineageFor(d),
      completeness: completenessFor(d),
      compare: {
        visualClown: d.clownInvolved ? pct(d.pVisual) : '—',
        visualClownP: d.pVisual,
        target: d.spec ? pct(d.pTarget) : '—',
        targetP: d.pTarget || 0,
        adds: d.adds.length ? d.adds.map((g) => `${g} (50%)`).join(', ') : 'None',
        kinship: d.kinship == null ? 'Unknown · sire not recorded' : `${pct(d.kinship)} · ${d.male.lineage.generations} generation${d.male.lineage.generations === 1 ? '' : 's'} checked`,
        kinshipGens: d.kinship == null ? -1 : d.male.lineage.generations,
        record: historyOf(d.male),
        clutches: d.male.record.clutches,
        ageWeight: `${d.male.age} · ${d.male.weight}`,
        confidence: female.lineage.unknown ? DOWNGRADE[d.male.confidence] : d.male.confidence,
        caveat: d.het && d.male.genes.Clown && d.male.genes.Clown.visual
          ? `Depends on ${female.name}'s unproven het`
          : d.male.lineage.sireMissing ? 'Sire not recorded' : !d.male.record.proven ? 'Unproven male' : 'Fewer visual Clowns',
      },
    };
  });

  // "Fewer visual Clowns" only makes sense for males behind the best visual-Clown odds.
  const bestVisual = Math.max(0, ...recommendations.map((r) => r.compare.visualClownP));
  recommendations.forEach((r) => {
    if (r.compare.caveat === 'Fewer visual Clowns' && r.compare.visualClownP >= bestVisual) r.compare.caveat = 'No major caveat';
  });

  // Compare notes for every 2- and 3-male combination (keyed by ids in rank order).
  const compareNotes = {};
  const combos = [];
  for (let i = 0; i < recommendations.length; i++) {
    for (let j = i + 1; j < recommendations.length; j++) {
      combos.push([recommendations[i], recommendations[j]]);
      for (let k = j + 1; k < recommendations.length; k++) combos.push([recommendations[i], recommendations[j], recommendations[k]]);
    }
  }
  combos.forEach((c) => { compareNotes[c.map((r) => r.male.id).join('+')] = compareSummary(female.id, c); });

  return {
    compareNotes,
    runId: 'kb-run-' + String(Math.floor(Math.random() * 9000) + 1000),
    female: publicSnake(female),
    objective,
    goals,
    screened: MALES.length,
    recommendations,
    excluded,
    spec: mostSpecific(goals.traits)[0] || null,
    sampleMales: !!female.fromCltch,
  };
}

export function compareSummary(femaleId, recs) {
  const key = femaleId + ':' + recs.map((r) => r.male.id).join('+');
  if (COMPARE_OVERRIDES[key]) return COMPARE_OVERRIDES[key];
  const [a, b] = recs;
  const choices = {};
  recs.forEach((r) => {
    const items = [];
    if (r.compare.visualClownP > 0 && r.compare.visualClownP === Math.max(...recs.map((x) => x.compare.visualClownP))) items.push('Visual Clowns this season matter most');
    if (r.compare.clutches >= 3) items.push('A reliable, well-documented pairing matters most');
    if (r.compare.adds !== 'None') items.push(`You also want ${r.compare.adds.replace(/ \(50%\)/g, '')} in the clutch`);
    if (!items.length) items.push('Its trade-offs suit your goals better');
    choices[r.male.id] = items;
  });
  const summary = a && b
    ? `${a.male.name} scores ${a.score} and ${b.male.name} ${b.score}. ${a.compare.visualClownP !== b.compare.visualClownP ? `Visual Clown odds are ${a.compare.visualClown} vs ${b.compare.visualClown}. ` : ''}${b.compare.clutches > a.compare.clutches ? `${b.male.name} has the stronger breeding record.` : `${a.male.name} has the stronger breeding record.`}`
    : '';
  return { summary, choices };
}

// ---------------------------------------------------------------------------
// Advisor follow-ups (canned PoC answers built from computed results)
// ---------------------------------------------------------------------------
export function answer(femaleId, goals, question, context = {}, profile) {
  const q = question.toLowerCase();
  const female = resolveFemale(femaleId, profile);
  if (!female) throw new EngineError(404, 'FEMALE_NOT_FOUND', 'Unknown female.');

  if (!female.ready) {
    if (q.includes('when could')) return { reply: `${female.name} needs to pass every readiness check first. ${female.blocked.body} Re-check her weight in 4–6 weeks.` };
    if (q.includes('ready females')) return { reply: 'Open the female list to see who is ready to breed.', action: { type: 'openSelector' } };
    return { reply: female.blocked.advisor };
  }

  const current = evaluate(femaleId, goals, profile);
  const top = current.recommendations;

  const switchTo = (objective) => {
    const next = evaluate(femaleId, { ...goals, objective }, profile);
    const changes = {};
    next.recommendations.forEach((r) => {
      const before = top.find((x) => x.male.id === r.male.id);
      if (before) changes[r.male.id] = { from: before.rank, to: r.rank, fromScore: before.score, toScore: r.score };
    });
    let reply;
    if (objective === 'Low risk' && LOW_RISK_REPLY_OVERRIDE[femaleId]) reply = LOW_RISK_REPLY_OVERRIDE[femaleId];
    else {
      const lead = next.recommendations[0];
      const moved = next.recommendations.filter((r) => changes[r.male.id] && changes[r.male.id].from !== r.rank);
      reply = `Done — I re-ranked for ${objective.toLowerCase()}. ${lead.male.name} is now #1 (score ${lead.score}).` +
        (moved.length ? ' ' + moved.map((r) => `${r.male.name} moves from #${changes[r.male.id].from} to #${r.rank}.`).join(' ') : ' The order is unchanged.');
    }
    return {
      reply,
      action: { type: 'setObjective', objective },
      results: next,
      changes,
      earlier: { objective: goals.objective, text: `${top[0].male.name} ranked #1 for ${current.spec ? current.spec + ' odds' : goals.objective.toLowerCase()}.` },
      title: `Re-ranked for ${objective.toLowerCase()}`,
    };
  };

  if (q.includes('low-risk') || q.includes('low risk')) return switchTo('Low risk');
  if (q.includes('rare morph')) return switchTo('Rare morph');
  if (q.includes('variab')) return switchTo('Variability');
  if (q.includes('quick')) return switchTo('Quick success');

  const selected = top.find((r) => r.male.id === context.selectedMaleId) || top[0];

  if (q.includes('het is proven') || q.includes('het proven')) {
    const fh = femaleHetInfo(female);
    if (!fh) return { reply: `${female.name}'s genetics are already proven, so the odds shown are final.` };
    const d = pairFacts(female, findMale(selected.male.id), goals);
    return {
      reply: `If ${female.name}'s het Clown is proven, ${selected.male.name}'s visual Clown odds rise from ${pct(d.pVisual)} to ${pct(d.pVisualProven)} per egg${d.spec && d.spec !== 'Clown' ? `, and ${d.spec} from ${pct(d.pTarget)} to ${pct(d.pTargetProven)}` : ''}. I've switched the odds view to "If het is proven". A clutch from any het Clown male is the usual way to prove her.`,
      action: { type: 'hetProven', maleId: selected.male.id },
    };
  }

  const ranked = q.match(/why is (\w+) ranked/);
  if (ranked) {
    const r = top.find((x) => x.male.name.toLowerCase() === ranked[1]);
    const lead = top[0];
    if (r && r.rank === 1) return { reply: `${r.male.name} ranks first for ${goals.objective.toLowerCase()} with a score of ${r.score}. ${r.reason}` };
    if (r) {
      return {
        reply: `${r.male.name} scores ${r.score} against ${lead.male.name}'s ${lead.score}. For ${goals.objective.toLowerCase()}, target odds carry the most weight: ${r.male.name} gives ${r.compare.target} vs ${lead.compare.target}. ${r.compare.clutches > lead.compare.clutches ? `He has the stronger record (${r.compare.record}), which is why he'd move up under "Low risk".` : ''}`.trim(),
        action: { type: 'select', maleId: r.male.id },
      };
    }
  }

  const excluded = q.match(/why was (\w+) excluded/);
  if (excluded) {
    const e = current.excluded.find((x) => x.male.name.toLowerCase() === excluded[1]);
    if (e) return { reply: `${e.male.name} was excluded (${e.code}). ${e.reason}` };
  }

  if (q.includes('compare') || q.includes('add cedar') || q.includes('add ')) {
    const named = top.filter((r) => q.includes(r.male.name.toLowerCase())).map((r) => r.male.id);
    const ids = [...new Set([...(context.compareIds || []), ...named])];
    const finalIds = ids.length >= 2 ? ids.slice(0, 3) : top.slice(0, 2).map((r) => r.male.id);
    return { reply: `Here they are side by side. Stronger values are highlighted per row — the choice stays yours.`, action: { type: 'openCompare', ids: finalIds } };
  }

  if (q.includes('track record')) {
    return { reply: 'Under "Low risk", a proven record and complete data count for most of the score (80%), because they predict a successful, healthy clutch. Target odds still count, but less (15%).' };
  }
  if (q.includes('66%') || q.includes('het mean')) {
    return { reply: `"66% het" means ${female.name} came from a het × het pairing and looks normal, so there's a 2 in 3 chance she carries Clown. It becomes 100% once she produces a visual Clown.` };
  }
  if (q.includes('which goals')) {
    return { reply: `For ${female.name}, "Rare morph" with a Clown target makes the most of her genetics. "Low risk" favours proven males if you want a dependable clutch.` };
  }
  if (q.includes('long-term') || q.includes('value')) {
    return { reply: 'Long-term value depends on market demand, which this PoC does not model yet. As a proxy: visual Clowns and holdback hets keep more future pairing options open.' };
  }
  return { reply: 'In this PoC I can explain the ranking, offspring odds, exclusions and missing data, or re-rank for another objective. Try one of the suggestions.' };
}

export function publicSnake(s) {
  return { id: s.id, name: s.name, cltchId: s.cltchId, sex: s.sex, morph: s.morph, line: s.line, tags: s.tags, age: s.age, weight: s.weight };
}

export function publicFemale(f) {
  return { ...publicSnake(f), status: f.status, ready: f.ready, readiness: f.readiness, blocked: f.blocked || null, hetLabel: f.genes.Clown && f.genes.Clown.hetLabel ? f.genes.Clown.hetLabel : null };
}

export function listFemales() {
  return FEMALES.map(publicFemale);
}
