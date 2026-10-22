// Adapts females from the FastAPI route GET /api/cltch/females into the shape the UI uses
// (same fields as the sample females in mock-data.js).

const PALETTES = ['Normal', 'Pastel', 'Clown', 'Mojave', 'Enchi', 'Yellowbelly', 'Lesser', 'Spider'];
const BLOCKING = new Set(['underweight', 'too_young', 'status_not_eligible']);

// Stable "random" pick so each snake keeps the same icon between visits.
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function avatarFor(id, morphNames) {
  const match = (morphNames || []).map((n) => n.replace(/^(super|het)\s+/i, '').trim()).find((n) => PALETTES.includes(n));
  return match || PALETTES[hash(String(id)) % PALETTES.length];
}

export function tagFor(name) {
  if (/%|possible|pos\.?\s*het/i.test(name)) return ['PossibleHet', name];
  if (/^het\s/i.test(name)) return ['Het', name];
  if (/^super\s/i.test(name)) return ['Super', name];
  return ['Visual', name];
}

function grams(n) {
  return `${Math.round(n).toLocaleString('en-US')} g`;
}

function yearsLabel(months) {
  return months % 12 === 0 ? `${months / 12} yrs` : `${months} months`;
}

/**
 * @param {Object} row     one item of `data` from /api/cltch/females
 * @param {{femaleMinBreedingWeightGrams?: number, femaleMinBreedingAgeMonths?: number}} [policy]
 */
export function adaptFemale(row, policy = {}) {
  const minW = policy.femaleMinBreedingWeightGrams || 500;
  const minAge = policy.femaleMinBreedingAgeMonths || 12;
  const reasons = Array.isArray(row.readinessReasons) ? row.readinessReasons : [];
  const codes = new Set(reasons.map((r) => r.code));
  const morphNames = (row.morphNames || []).filter((n) => typeof n === 'string' && n.trim());
  const weightNum = Number(row.weight);
  const hasWeight = row.weight != null && row.weight !== '' && Number.isFinite(weightNum);
  const name = (row.name || row.title || 'Unnamed female').trim();
  const cltchId = row.title && row.title !== row.name ? row.title : `CL-${String(row.id).slice(0, 6).toUpperCase()}`;
  const ageLabel = row.ageLabel || null;

  const readiness = [
    codes.has('missing_age')
      ? ['warn', 'Age', 'Unknown · birth date not recorded']
      : codes.has('too_young')
        ? ['fail', 'Age', `${ageLabel} · min ${yearsLabel(minAge)}`]
        : ['ok', 'Age', `${ageLabel} · mature`],
    codes.has('missing_weight')
      ? ['warn', 'Weight', 'Unknown · not recorded']
      : codes.has('underweight')
        ? ['fail', 'Weight', `${grams(weightNum)} · min ${grams(minW)}`]
        : ['ok', 'Weight', `${grams(weightNum)} · min ${grams(minW)}`],
    codes.has('missing_status')
      ? ['warn', 'Status', 'Unknown']
      : codes.has('status_not_eligible')
        ? ['fail', 'Status', `${row.statusLabel || 'Unknown'} · not eligible`]
        : ['ok', 'Status', row.statusLabel || 'Unknown'],
  ];

  const blockingReasons = reasons.filter((r) => BLOCKING.has(r.code));
  const missing = reasons.filter((r) => r.code.startsWith('missing_'));
  const selectable = blockingReasons.length === 0;

  let status;
  if (row.readyToBreed) status = ['Success', 'Ready to breed'];
  else if (codes.has('status_not_eligible')) status = ['Risk', `${row.statusLabel || 'Status'} · not eligible`];
  else if (codes.has('underweight')) status = ['Caution', `Underweight · min ${grams(minW)}`];
  else if (codes.has('too_young')) status = ['Caution', 'Too young to breed'];
  else if (codes.has('missing_weight') && codes.has('missing_age')) status = ['Neutral', 'Weight & age unknown'];
  else if (codes.has('missing_weight')) status = ['Neutral', 'Weight unknown'];
  else if (codes.has('missing_age')) status = ['Neutral', 'Age unknown'];
  else status = ['Neutral', 'Status unknown'];

  const hetName = morphNames.find((n) => /het\s+clown/i.test(n) && /%|possible/i.test(n));
  const hetPct = hetName && hetName.match(/(\d{1,3})\s*%/);

  return {
    id: row.id,
    name,
    cltchId,
    sex: 'female',
    morph: avatarFor(row.id, morphNames),
    line: morphNames.length ? morphNames.join(' · ') : 'Morph not recorded',
    tags: morphNames.map(tagFor),
    morphNames,
    age: ageLabel || 'Age unknown',
    weight: hasWeight ? grams(weightNum) : 'Weight unknown',
    status,
    ready: selectable,
    selectable,
    missingData: missing.map((r) => r.message),
    readiness,
    blocked: selectable ? null : {
      title: `${name} isn't ready to breed yet`,
      body: blockingReasons.map((r) => r.message).join(' ') + " The advisor won't suggest pairings until she passes the readiness checks.",
      advisor: `I only suggest pairings for females that pass every readiness check. ${blockingReasons.map((r) => r.message).join(' ')}`,
    },
    hetLabel: hetName ? (hetPct ? `${hetPct[1]}%` : '50%') : null,
    source: 'cltch',
  };
}

/** Profile sent to the pairing/advisor routes so the mock engine can approximate her genetics. */
export function femaleProfile(f) {
  if (!f || f.source !== 'cltch') return null;
  const { id, name, cltchId, morph, line, tags, age, weight, readiness, morphNames, hetLabel, selectable } = f;
  return { id, name, cltchId, morph, line, tags, age, weight, readiness, morphNames, hetLabel, ready: selectable };
}
