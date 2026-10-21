// Adapts GET /api/cltch/females/{id}/males into the `results` shape the workspace renders.
// Scores are provisional (Kinova's pairing criteria with an assumed season goal) until objectives exist.

import { avatarFor, tagFor } from './cltch';

const levelFor = (score) => (score >= 80 ? 'Strong' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Low');

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
    tags: morphNames.slice(0, 3).map(tagFor),
    morphNames,
    age: m.ageLabel || 'Age unknown',
    weight: grams(m.weight),
    statusLabel: m.statusLabel || null,
  };
}

const crit = (m, key) => (m.criteria || []).find((c) => c.key === key) || null;

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
  return ['Welfare', 'No warnings', 'Gene Engine'];
}

function confidenceFor(m, welfareChecked) {
  const relKnown = m.relatedness && m.relatedness.known;
  const welfareOk = welfareChecked && !(m.warnings || []).some((w) => /failed|timed_out/.test(w.code));
  const known = (relKnown ? 1 : 0) + (welfareOk ? 1 : 0) + ((m.morphNames || []).length ? 1 : 0);
  return known >= 3 ? 'High' : known === 2 ? 'Medium' : 'Low';
}

function toRec(m, female, welfareChecked) {
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
    reason: top.map((c) => c.detail).join(' '),
    stats: [targetStat(crit(m, 'recessive_progress')), relatednessStat(m), welfareStat(m, welfareChecked)],
    flag: warnings.length ? warnings.join(' ') : null,
    criteria: m.criteria || [],
    awaitingInput: m.awaitingInput || [],
    relatedness: rel,
    warnings: m.warnings || [],
    superfluous: !!m.superfluous,
    explanation: {
      title: `Why ${male.name}?`,
      subtitle: `${female.name} × ${male.name} · ranked #${m.rank} · provisional score`,
      summary: `${male.name} scores ${m.score} on Kinova's pairing criteria. ${top.length ? top[0].detail : ''}`.trim(),
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
        body: `Season targets are assumed (recessive progress) until you set them. Still awaiting your input: ${(m.awaitingInput || []).map((a) => a.label.toLowerCase()).join(', ')}.${warnings.length ? ' ' + warnings.join(' ') : ''}`,
      },
      followUps: [],
    },
  };
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
  return {
    source: 'cltch',
    objective: 'Provisional criteria',
    spec: null,
    sampleMales: false,
    screened: data.counts ? data.counts.fetched : 0,
    recommendations: (data.eligible || []).map((m) => toRec(m, female, welfareChecked)),
    excluded: (data.excluded || []).map(toExcluded),
    notChecked: (data.notChecked || []).map((m) => ({ ...maleSnake(m), preScore: m.preScore })),
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
  const recommendations = [...prev.recommendations, ...next.recommendations.filter((r) => !recIds.has(r.male.id))]
    .map((r, i) => ({ ...r, rank: i + 1, explanation: { ...r.explanation, subtitle: r.explanation.subtitle.replace(/ranked #\d+/, `ranked #${i + 1}`) } }));
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
