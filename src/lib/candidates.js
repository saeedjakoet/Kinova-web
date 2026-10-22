// Adapts GET /api/cltch/females/{id}/males into the `results` shape the workspace renders.
// Scores are provisional (Kinova's pairing criteria with an assumed season goal) until objectives exist.

import { avatarFor, tagFor } from './cltch';

/** Recommendations shown (and checked) per step; the API checks further until this top is guaranteed. */
export const SHORTLIST = 4;

const levelFor =(score) => (score >= 80 ? 'Strong' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Low');

function grams(w) {
  const n = Number(w);
  return w != null && w !== '' && Number.isFinite(n) ? `${Math.round(n).toLocaleString('en-US')} g` : 'Weight unknown';
}

export function maleSnake(m) {
  const morphNames = (m.morphNames || []).filter((n) => typeof n === 'string' && n.trim());
  const name = (m.name || m.title || 'Unnamed male').trim();
  return {
    id: m.id,
    name,
    cltchId: m.title && m.title !== m.name ? m.title : `CL-${String(m.id).slice(0, 6).toUpperCase()}`,
    sex: 'male',
    morph: avatarFor(m.id, morphNames),
    line: morphNames.length ? morphNames.join(' · ') : 'Morph not recorded',
    tags: morphNames.map(tagFor),
    morphNames,
    age: m.ageLabel || 'Age unknown',
    weight: grams(m.weight),
    statusLabel: m.statusLabel || null,
  };
}

const crit = (m, key) => (m.criteria || []).find((c) => c.key === key) || null;

function seasonTargetStat(t, label) {
  if (!t) return null;
  if (!t.probability) return ['Target odds', '0%', `Can't produce ${label}`];
  const pct = t.percent >= 10 ? Math.round(t.percent) : t.percent;
  return ['Target odds', `${pct}% per egg`, `${t.chanceLabel} · ${label}`];
}

function targetStat(c) {
  if (!c) return ['Season targets', 'Not assessed', 'Awaiting goals'];
  const vis = c.detail.match(/^Can produce visual (.+?) \((\d+%) per egg\)/);
  if (vis) return ['Season targets', `Visual ${vis[1]}`, `${vis[2]} per egg (assumed goal)`];
  const het = c.detail.match(/^Adds het (.+?) to this line/);
  if (het) return ['Season targets', 'New het', het[1]];
  return ['Season targets', 'No progress', 'No recessive progress'];
}

function relatednessStat(m) {
  const r = m.relatedness;
  if ((m.warnings || []).some((w) => w.code === 'checks_timed_out')) return ['Relatedness', 'Not confirmed', 'Check timed out'];
  if (!r) return ['Relatedness', 'Not checked', '—'];
  if (!r.known || r.coefficient == null) return ['Relatedness', 'Unknown', 'Pedigree not recorded'];
  const gens = r.pedigreeGenerations ? `${r.pedigreeGenerations.searched} generations checked` : '';
  if (r.coefficient === 0) return ['Relatedness', '0% · outcross', gens];
  return ['Relatedness', `${Math.round(r.coefficient * 1000) / 10}%`, r.relationship];
}

function welfareStat(m, checked) {
  if (!checked) return ['Welfare', 'Not checked', 'Gene Engine'];
  if ((m.warnings || []).some((w) => w.code === 'pairing_check_failed' || w.code === 'checks_timed_out')) return ['Welfare', 'Not confirmed', 'Gene Engine check failed'];
  if ((m.warnings || []).some((w) => w.code === 'welfare_leucism')) return ['Welfare', 'Leucism note', 'Can produce Ivory / white babies'];
  return ['Welfare', 'No warnings', 'Gene Engine'];
}

function confidenceFor(m, welfareChecked) {
  const relKnown = m.relatedness && m.relatedness.known;
  const welfareOk = welfareChecked && !(m.warnings || []).some((w) => /failed|timed_out/.test(w.code));
  const known = (relKnown ? 1 : 0) + (welfareOk ? 1 : 0) + ((m.morphNames || []).length ? 1 : 0);
  return known >= 3 ? 'High' : known === 2 ? 'Medium' : 'Low';
}

function toRec(m, female, welfareChecked, targetLabel) {
  const male = maleSnake(m);
  const scored = (m.criteria || []).filter((c) => c.score != null);
  const top = [...scored].sort((a, b) => b.score * b.weight - a.score * a.weight).slice(0, 2);
  const warnings = (m.warnings || []).map((w) => w.message);
  const rel = m.relatedness;
  return {
    source: 'cltch',
    male,
    rank: m.rank,
    score: m.score,
    level: levelFor(m.score),
    confidence: confidenceFor(m, welfareChecked),
    reason: m.targetOdds
      ? [crit(m, 'season_targets') && crit(m, 'season_targets').detail, ...top.filter((c) => c.key !== 'season_targets').slice(0, 1).map((c) => c.detail)].filter(Boolean).join(' ')
      : top.map((c) => c.detail).join(' '),
    stats: [
      seasonTargetStat(m.targetOdds, targetLabel) || targetStat(crit(m, 'recessive_progress')),
      relatednessStat(m),
      welfareStat(m, welfareChecked),
    ],
    targetOdds: m.targetOdds || null,
    flag: warnings.length ? warnings.join(' ') : null,
    criteria: m.criteria || [],
    awaitingInput: m.awaitingInput || [],
    relatedness: rel,
    warnings: m.warnings || [],
    superfluous: !!m.superfluous,
    explanation: {
      title: `Why ${male.name}?`,
      subtitle: `${female.name} × ${male.name} · ranked #${m.rank} · provisional score`,
      summary: m.targetOdds
        ? (m.targetOdds.probability
          ? `${male.name} gives a ${m.targetOdds.percent}% chance per egg (${m.targetOdds.chanceLabel}) of a baby showing ${targetLabel}. ${m.targetOdds.perGene.map((g) => `${g.name}: ${g.percent}%`).join(' · ')}.`
          : `${male.name} can't produce ${targetLabel} with ${female.name}: ${m.targetOdds.perGene.filter((g) => !g.probability).map((g) => g.name).join(', ')} isn't possible from this pair.`)
        : `${male.name} scores ${m.score} on Kinova's pairing criteria. ${top.length ? top[0].detail : ''}`.trim(),
      fitsTitle: 'How it scores on the pairing criteria',
      fits: scored.map((c) => `${c.label}: ${c.detail}`),
      awaiting: (m.awaitingInput || []).map((a) => `${a.label}: ${a.detail}`),
      oddsless: true,
      odds: [],
      genetics: rel
        ? rel.known
          ? `Relatedness ${rel.coefficient === 0 ? '0% — no shared ancestors' : `${Math.round(rel.coefficient * 1000) / 10}% (${rel.relationship})`} within ${rel.pedigreeGenerations ? rel.pedigreeGenerations.searched : 2} generations.`
          : 'Pedigree not recorded in Cltch, so relatedness is unknown (not assumed to be zero).'
        : 'Relatedness was not checked for this male.',
      caveat: {
        tone: 'Caution',
        title: 'Provisional ranking',
        body: `${m.targetOdds ? `Ranked by the chance of ${targetLabel} in one baby (Mendelian odds from Cltch genetic records; each gene treated as independent).` : 'Season targets are assumed (recessive progress) until you set them.'} Still awaiting your input: ${(m.awaitingInput || []).map((a) => a.label.toLowerCase()).join(', ')}.${warnings.length ? ' ' + warnings.join(' ') : ''}`,
      },
      followUps: [],
    },
  };
}

const pctText = (t) => `${t.percent >= 10 ? Math.round(t.percent) : t.percent}%`;

// What pulled this male's score down most (relatedness gets its relationship spelled out).
function scoreDrag(rec) {
  const worst = rec.criteria
    .filter((c) => c.key !== 'season_targets' && c.score != null)
    .sort((a, b) => (1 - b.score) * b.weight - (1 - a.score) * a.weight)[0];
  if (!worst) return '';
  const r = rec.relatedness;
  if (worst.key === 'relatedness' && r && r.coefficient) return `it's closely related (${r.relationship}, ${Math.round(r.coefficient * 1000) / 10}%)`;
  return `of "${worst.label.toLowerCase()}"`;
}

/**
 * Target odds rank first, so a male can sit above higher-scoring males. Say so on his card,
 * with what lowered his score, so the order isn't a surprise.
 */
function withRankNotes(recs, targetLabel) {
  return recs.map((rec, i) => {
    const base = rec.explanation.summary.replace(/ Why #\d+:.*$/, '');
    const below = recs.slice(i + 1);
    const outscored = rec.targetOdds && below.some((b) => b.score > rec.score);
    if (!outscored) return { ...rec, rankNote: null, explanation: { ...rec.explanation, summary: base } };
    const next = below.find((b) => b.targetOdds && b.targetOdds.probability < rec.targetOdds.probability);
    const drag = scoreDrag(rec);
    const rankNote = `Why #${rec.rank}: ${i === 0 ? 'the best' : 'a higher'} chance of ${targetLabel} (${pctText(rec.targetOdds)} per egg${next ? ` vs ${pctText(next.targetOdds)} below him` : ''}). `
      + `Target odds rank first, so he sits above higher-scoring males${drag ? `; his score is lower because ${drag}` : ''}.`;
    return { ...rec, rankNote, explanation: { ...rec.explanation, summary: `${base} ${rankNote}` } };
  });
}

function toExcluded(m) {
  const reasons = m.reasons || [];
  return {
    male: maleSnake(m),
    stage: m.stage,
    code: [...new Set(reasons.map((r) => r.code))].join(' · ').toUpperCase(),
    reason: reasons.map((r) => r.message).join(' '),
  };
}

/** Build workspace `results` from the API response. */
export function toResults(data, female) {
  const welfareChecked = !!(data.policy && data.policy.pairingWarningsChecked);
  const targets = data.targets || [];
  const targetLabel = targets.map((t) => t.name).join(' + ');
  return {
    targets,
    targetLabel,
    rankedBy: data.rankedBy || 'Provisional pairing criteria',
    source: 'cltch',
    objective: 'Provisional criteria',
    spec: null,
    sampleMales: false,
    screened: data.counts ? data.counts.fetched : 0,
    recommendations: withRankNotes((data.eligible || []).map((m) => toRec(m, female, welfareChecked, targetLabel)), targetLabel),
    excluded: (data.excluded || []).map(toExcluded),
    notChecked: (data.notChecked || []).map((m) => ({ ...maleSnake(m), preScore: m.preScore, targetPercent: m.targetOdds ? m.targetOdds.percent : null })),
    paging: data.paging || { hasMore: false },
    timingsMs: data.timingsMs || {},
    notes: data.notes || [],
    welfareChecked,
    compareNotes: {},
  };
}

/** Merge a "check more" response into existing results (no duplicates, nobody lost). */
export function mergeResults(prev, next) {
  const recIds = new Set(prev.recommendations.map((r) => r.male.id));
  const exIds = new Set(prev.excluded.map((x) => x.male.id));
  // Renumber: a batch's ranks start at its offset, so excluded males would otherwise leave gaps.
  // Re-sort the combined list by the API's own order (target odds, then score) so the top stays the top.
  const odds = (r) => (r.targetOdds ? r.targetOdds.probability : 0);
  const recommendations = withRankNotes([...prev.recommendations, ...next.recommendations.filter((r) => !recIds.has(r.male.id))]
    .sort((a, b) => odds(b) - odds(a) || b.score - a.score || a.warnings.length - b.warnings.length || a.rank - b.rank)
    .map((r, i) => ({ ...r, rank: i + 1, explanation: { ...r.explanation, subtitle: r.explanation.subtitle.replace(/ranked #\d+/, `ranked #${i + 1}`) } })), prev.targetLabel);
  const excluded = [...prev.excluded, ...next.excluded.filter((x) => !exIds.has(x.male.id))];
  const done = new Set([...recommendations.map((r) => r.male.id), ...excluded.map((x) => x.male.id)]);
  return {
    ...prev,
    recommendations,
    excluded,
    notChecked: next.notChecked.filter((m) => !done.has(m.id)),
    paging: next.paging,
    timingsMs: next.timingsMs,
  };
}
