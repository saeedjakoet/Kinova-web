// Sample collection — ported from the Figma generator (figma-plugin/code.js).
// Ball pythons only. All data is invented for the PoC.

/**
 * @typedef {Object} Snake
 * @property {string} id
 * @property {string} name
 * @property {string} cltchId
 * @property {'female'|'male'} sex
 * @property {string} morph        Avatar placeholder palette (SnakeAvatar)
 * @property {string} line         Short morph description
 * @property {[string,string][]} tags  [Kind, label] — Kind: Visual | Het | PossibleHet | Super
 * @property {string} age
 * @property {string} weight
 * @property {Object<string, number|{visual?:boolean, het?:number}>} genes
 *   Incomplete-dominant genes as copy count (1). Recessive Clown as { visual } or { het: probability }.
 */

export const GENE_MODES = {
  Clown: 'recessive',
  Pastel: 'incomplete dominant',
  Mojave: 'incomplete dominant',
  Enchi: 'incomplete dominant',
  Lesser: 'incomplete dominant',
  Yellowbelly: 'incomplete dominant',
  Spider: 'dominant',
};

// Order in which visual traits are named (e.g. "Pastel Mojave Clown").
export const VISUAL_ORDER = ['Pastel', 'Mojave', 'Enchi', 'Lesser', 'Yellowbelly', 'Spider'];

export { OBJECTIVES, TRAIT_OPTIONS, CONSTRAINT_OPTIONS, GOAL_TEXT, DEFAULT_GOALS, goalsFor } from './goals';

export const KINSHIP_LIMIT = 0.0625;

/** @type {(Snake & Object)[]} */
export const FEMALES = [
  {
    id: 'juniper', name: 'Juniper', cltchId: 'KB-F-0142', sex: 'female', morph: 'Pastel',
    line: 'Pastel · 66% het Clown', tags: [['Visual', 'Pastel'], ['PossibleHet', '66% het Clown']],
    age: '4 yrs', weight: '1,850 g', genes: { Pastel: 1, Clown: { het: 2 / 3, hetLabel: '66%' } },
    status: ['Success', 'Ready to breed'], ready: true,
    readiness: [['ok', 'Age', '4 yrs · mature'], ['ok', 'Weight', '1,850 g · min 1,500 g'], ['ok', 'Gravid', 'No · last clutch Mar 2025'], ['warn', 'Het Clown', '66% possible · unproven']],
    lineage: { parents: 'Rowan (Pastel het Clown) × Hazel (het Clown)', generations: 3 },
  },
  {
    id: 'saffron', name: 'Saffron', cltchId: 'KB-F-0108', sex: 'female', morph: 'Mojave',
    line: 'Mojave · het Clown', tags: [['Visual', 'Mojave'], ['Het', 'het Clown']],
    age: '5 yrs', weight: '2,140 g', genes: { Mojave: 1, Clown: { het: 1 } },
    status: ['Success', 'Ready to breed'], ready: true,
    readiness: [['ok', 'Age', '5 yrs · mature'], ['ok', 'Weight', '2,140 g · min 1,500 g'], ['ok', 'Gravid', 'No · last clutch Apr 2024'], ['ok', 'Het Clown', 'Proven by 2023 clutch']],
    lineage: { parents: 'Basil (Mojave) × Clove (het Clown)', generations: 3 },
  },
  {
    id: 'willow', name: 'Willow', cltchId: 'KB-F-0163', sex: 'female', morph: 'Enchi',
    line: 'Enchi · Yellowbelly', tags: [['Visual', 'Enchi'], ['Visual', 'Yellowbelly']],
    age: '3 yrs', weight: '1,620 g', genes: { Enchi: 1, Yellowbelly: 1 },
    status: ['Success', 'Ready to breed'], ready: true,
    readiness: [['ok', 'Age', '3 yrs · mature'], ['ok', 'Weight', '1,620 g · min 1,500 g'], ['ok', 'Gravid', 'No · never bred'], ['ok', 'Status', 'Holdback']],
    lineage: { parents: 'Ash (Enchi) × Fern (Yellowbelly)', generations: 2 },
  },
  {
    id: 'ember', name: 'Ember', cltchId: 'KB-F-0171', sex: 'female', morph: 'Lesser',
    line: 'Lesser · Pastel', tags: [['Visual', 'Lesser'], ['Visual', 'Pastel']],
    age: '2 yrs', weight: '1,180 g', genes: { Lesser: 1, Pastel: 1 },
    status: ['Caution', 'Underweight · min 1,500 g'], ready: false,
    readiness: [['warn', 'Age', '2 yrs · borderline'], ['fail', 'Weight', '1,180 g · min 1,500 g'], ['ok', 'Gravid', 'No'], ['ok', 'Status', 'Holdback']],
    blocked: {
      title: "Ember isn't ready to breed yet",
      body: "She's 1,180 g — below the 1,500 g minimum for females. The advisor won't suggest pairings until she passes the readiness checks.",
      advisor: "I only suggest pairings for females that pass every readiness check. Ember is 1,180 g; the minimum for females is 1,500 g. She's also only 2 years old.",
    },
    lineage: { parents: 'Rowan (Pastel het Clown) × Sorrel (Lesser)', generations: 2 },
  },
  {
    id: 'marigold', name: 'Marigold', cltchId: 'KB-F-0097', sex: 'female', morph: 'Yellowbelly',
    line: 'Yellowbelly · het Clown', tags: [['Visual', 'Yellowbelly'], ['Het', 'het Clown']],
    age: '6 yrs', weight: '2,380 g', genes: { Yellowbelly: 1, Clown: { het: 1 } },
    status: ['Risk', 'Gravid · not eligible'], ready: false,
    readiness: [['ok', 'Age', '6 yrs · mature'], ['ok', 'Weight', '2,380 g · min 1,500 g'], ['fail', 'Gravid', 'Yes · due in ~3 weeks'], ['ok', 'Status', 'Breeder']],
    blocked: {
      title: "Marigold isn't ready to breed",
      body: "She's gravid (due in about 3 weeks). The advisor won't suggest pairings for gravid females.",
      advisor: "I only suggest pairings for females that pass every readiness check. Marigold is gravid, so she needs to lay and recover before her next pairing.",
    },
    lineage: { parents: 'Juniper line · 2 generations', generations: 2 },
  },
];

export const MALES = [
  {
    id: 'atlas', name: 'Atlas', cltchId: 'KB-M-0217', sex: 'male', morph: 'Clown',
    line: 'Clown · Mojave', tags: [['Visual', 'Clown'], ['Visual', 'Mojave']],
    age: '3 yrs', weight: '1,120 g', genes: { Clown: { visual: true }, Mojave: 1 },
    record: { proven: true, clutches: 1, note: '5 of 6 eggs hatched', sentence: 'one recorded clutch, 5 of 6 eggs hatched' },
    lineage: { parents: 'Orion (Clown) × Lark (Mojave het Clown)', generations: 2, note: '2 generations (bought in 2024)' },
    confidence: 'Medium',
  },
  {
    id: 'bramble', name: 'Bramble', cltchId: 'KB-M-0189', sex: 'male', morph: 'Enchi',
    line: 'Enchi · het Clown', tags: [['Visual', 'Enchi'], ['Het', 'het Clown']],
    age: '5 yrs', weight: '1,340 g', genes: { Enchi: 1, Clown: { het: 1 } },
    record: { proven: true, clutches: 4, note: '94% hatch rate', sentence: 'four recorded clutches, 94% hatch rate' },
    lineage: { parents: 'Thistle (Enchi) × Wren (het Clown)', generations: 3, note: '3 generations recorded' },
    confidence: 'High',
  },
  {
    id: 'cedar', name: 'Cedar', cltchId: 'KB-M-0233', sex: 'male', morph: 'Lesser',
    line: 'Lesser · Yellowbelly', tags: [['Visual', 'Lesser'], ['Visual', 'Yellowbelly']],
    age: '2 yrs', weight: '820 g', genes: { Lesser: 1, Yellowbelly: 1 },
    record: { proven: false, clutches: 0, note: 'First season', sentence: 'no recorded clutches yet' },
    lineage: { parents: 'Unknown sire × Sorrel (Lesser)', generations: 1, sireMissing: true, note: 'Sire not recorded' },
    confidence: 'Low',
  },
  {
    id: 'dune', name: 'Dune', cltchId: 'KB-M-0201', sex: 'male', morph: 'Spider',
    line: 'Spider · Pastel', tags: [['Visual', 'Spider'], ['Visual', 'Pastel']],
    age: '4 yrs', weight: '1,050 g', genes: { Spider: 1, Pastel: 1 },
    record: { proven: true, clutches: 2, note: '2 clutches', sentence: 'two recorded clutches' },
    lineage: { parents: 'Bought 2023 · 1 generation', generations: 1 },
    confidence: 'Medium',
  },
  {
    id: 'fennel', name: 'Fennel', cltchId: 'KB-M-0155', sex: 'male', morph: 'Clown',
    line: 'Clown', tags: [['Visual', 'Clown']],
    age: '3 yrs', weight: '980 g', genes: { Clown: { visual: true } },
    record: { proven: true, clutches: 2, note: '2 clutches', sentence: 'two recorded clutches' },
    lineage: { parents: 'Rowan (Pastel het Clown) × Juno (het Clown)', generations: 3 },
    relations: { juniper: { kinship: 0.25, text: 'Half-brother to Juniper (shared sire Rowan)' } },
    confidence: 'High',
  },
  {
    id: 'gale', name: 'Gale', cltchId: 'KB-M-0249', sex: 'male', morph: 'Pastel',
    line: 'Pastel · het Clown', tags: [['Visual', 'Pastel'], ['Het', 'het Clown']],
    age: '18 months', weight: '520 g', genes: { Pastel: 1, Clown: { het: 1 } },
    record: { proven: false, clutches: 0, note: 'Not yet bred', sentence: 'no recorded clutches yet' },
    lineage: { parents: 'Kinova bred · 3 generations', generations: 3 },
    immature: { reason: '18 months and 520 g — below breeding maturity for males (700 g).' },
    confidence: 'High',
  },
];

// Exact Figma copy for the flagship pairing (Juniper). Other pairings use the templates in engine.js.
export const SCORE_OVERRIDES = {
  'juniper:Rare morph': { atlas: 92, bramble: 78, cedar: 54 },
  'juniper:Low risk': { bramble: 88, atlas: 84, cedar: 41 },
};

export const REASON_OVERRIDES = {
  'juniper:atlas': 'Visual Clown Mojave. Every baby carries Clown; about 1 in 3 eggs should be visual Clowns, with Pastel Clowns possible.',
  'juniper:bramble': 'Proven het Clown with Enchi. Lower Clown odds than Atlas, but adds Enchi and has the strongest breeding record in your collection.',
  'juniper:cedar': 'No Clown genes, so no visual Clowns this season. Included for variety: Pastel Lesser and Yellowbelly combinations.',
};

export const SUMMARY_OVERRIDES = {
  'juniper:atlas': "Atlas is the best fit for Pastel Clowns. As a visual Clown he passes Clown to every baby — so whether you get visual Clowns depends on Juniper, who is likely (66%) but not proven het.",
};

export const COMPARE_OVERRIDES = {
  'juniper:atlas+bramble': {
    summary: 'Atlas gives about twice the chance of visual Clowns (33% vs 17%). Bramble is the safer bet if reliability matters: four clutches, a 94% hatch rate and fully recorded lineage.',
    choices: {
      atlas: ['Pastel Clowns this season matter most', 'You accept that Juniper may not be het'],
      bramble: ['A reliable, well-documented pairing matters most', 'You also want Enchi in the clutch'],
    },
  },
};

export const LOW_RISK_REPLY_OVERRIDE = {
  juniper: "Done — I re-ranked for low risk. Bramble moves to #1: four recorded clutches with a 94% hatch rate and fully recorded lineage. Atlas drops to #2 only because he has one recorded clutch; he's still the stronger fit for Pastel Clowns. Cedar stays third — he's unproven and his sire isn't recorded.",
};

export function findFemale(id) { return FEMALES.find((f) => f.id === id) || null; }
export function findMale(id) { return MALES.find((m) => m.id === id) || null; }
