// Goal options and per-female starting goals — safe to import in client components.

export const OBJECTIVES = ['Variability', 'Rare morph', 'Quick success', 'Low risk', 'Target morph'];
export const TRAIT_OPTIONS = ['Clown', 'Pastel Clown', 'Mojave Clown', 'Enchi Clown', 'Pastel', 'Mojave', 'Enchi', 'Lesser', 'Yellowbelly'];
export const CONSTRAINT_OPTIONS = [
  { id: 'avoidSpider', label: 'Avoid Spider', kind: 'Avoid' },
  { id: 'provenOnly', label: 'Proven males only', kind: 'Objective' },
  { id: 'maxKinship', label: 'Max kinship 6.25%', kind: 'Objective' },
];

// Sellable mix: which price tiers to aim for.
export const SELLABLE_MIX = [
  { id: 'high_end', label: 'High-end (tip)' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'retail_b', label: 'Retail B' },
  { id: 'avoid_sit', label: 'Avoid sit-or-wholesale' },
];

export const GOAL_TEXT = "I'd like visual Clowns from Juniper this season — ideally Pastel Clowns. Avoid Spider, and I'd prefer a proven male.";

export const DEFAULT_GOALS = {
  text: GOAL_TEXT,
  objective: 'Rare morph',
  traits: ['Clown', 'Pastel Clown'],
  constraints: ['avoidSpider', 'provenOnly'],
  preferredMaleId: null,
  sellableMix: 'balanced',
};

// Starting goals per female (Juniper's match the Figma exactly).
const GOALS_BY_FEMALE = {
  saffron: {
    text: "I'd like visual Clowns from Saffron this season — ideally Mojave Clowns. Avoid Spider, and I'd prefer a proven male.",
    objective: 'Rare morph', traits: ['Clown', 'Mojave Clown'],
  },
  willow: {
    text: "I'd like more variety from Willow — Enchi and Yellowbelly combinations. Avoid Spider, and I'd prefer a proven male.",
    objective: 'Variability', traits: ['Enchi', 'Yellowbelly'],
  },
};

export function goalsFor(femaleId, female) {
  if (female && female.source === 'cltch') {
    // Real Cltch female: neutral starting goals (no trait assumptions).
    return {
      ...DEFAULT_GOALS,
      text: `I'd like the best pairing for ${female.name} this season. Avoid Spider, and I'd prefer a proven male.`,
      traits: [],
      seasonTargets: [],
      constraints: [...DEFAULT_GOALS.constraints],
    };
  }
  const g = GOALS_BY_FEMALE[femaleId];
  return g ? { ...DEFAULT_GOALS, ...g, constraints: [...DEFAULT_GOALS.constraints] } : { ...DEFAULT_GOALS, traits: [...DEFAULT_GOALS.traits], constraints: [...DEFAULT_GOALS.constraints] };
}
