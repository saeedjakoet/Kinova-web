'use client';

import clsx from 'clsx';
import Chip from '../ui/Chip';
import Button from '../ui/Button';
import { Callout } from '../ui/Misc';
import { SELLABLE_MIX } from '@/lib/goals';
import MorphPicker from './MorphPicker';

/** Single-select chip group (Sellable mix). */
function ChoiceGroup({ label, id, options, value, onChange, disabled, helper }) {
  return (
    <div className="flex flex-col gap-2" role="group" aria-labelledby={id}>
      <span id={id} className="text-body-sm-md text-charcoal-700">{label}</span>
      <span role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Chip key={o.id} type="objective" role="radio" selected={!disabled && value === o.id} disabled={disabled} onClick={() => onChange(o.id)}>{o.label}</Chip>
        ))}
      </span>
      {helper && <span className="text-label text-stone-500">{helper}</span>}
    </div>
  );
}

/**
 * Goals: Season targets (Cltch morph catalogue, used in the ranking) + Sellable mix (captured, not
 * scored yet) + primary action. Used in the desktop rail, tablet sheet and mobile step 2.
 */
export default function GoalsForm({ goals, onChange, disabled, disabledText, onSubmit, submitLabel = 'Find pairings', loading, showAction = true }) {
  const set = (patch) => onChange({ ...goals, ...patch });
  const targets = goals.seasonTargets || [];
  // Keep `traits` (names) in sync for summary chips.
  const setTargets = (list) => set({ seasonTargets: list, traits: list.map((t) => t.name) });

  return (
    <div className={clsx('flex flex-col gap-4', disabled && 'opacity-55')}>
      {disabled ? (
        <p className="text-body-sm text-stone-500">{disabledText || 'Choose a female first'}</p>
      ) : (
        <Callout tone="Info" size="compact">Season targets rank the males. Sellable mix is captured but doesn&apos;t change the ranking yet.</Callout>
      )}
      <div className="flex flex-col gap-2" role="group" aria-labelledby="g-traits">
        <span id="g-traits" className="text-body-sm-md text-charcoal-700">Season targets</span>
        <div className="flex flex-wrap gap-2">
          {!disabled && targets.map((t) => (
            <Chip key={t.id} type="trait" selected onRemove={() => setTargets(targets.filter((x) => x.id !== t.id))} removeLabel={`Remove target ${t.name}`}>
              {t.name}
            </Chip>
          ))}
          <MorphPicker selected={targets} disabled={disabled} onAdd={(t) => setTargets([...targets, t])} />
        </div>
        <span className="text-label text-stone-500">
          {targets.length > 1
            ? 'Males are ranked by the chance of a baby showing all of these in one egg.'
            : targets.length === 1
              ? 'Males are ranked by the chance of this morph per egg.'
              : 'Pick morphs or combos from the Cltch catalogue to rank males by the odds of producing them.'}
        </span>
      </div>
      <ChoiceGroup
        label="Sellable mix"
        id="g-sellable-mix"
        options={SELLABLE_MIX}
        value={goals.sellableMix || 'balanced'}
        onChange={(v) => set({ sellableMix: v })}
        disabled={disabled}
        helper="Which price tiers to aim for."
      />
      {showAction && (
        <>
          <Button variant="primary" size="md" iconLeft="search" loading={loading} disabled={disabled} onClick={onSubmit} className="w-full">
            {loading ? 'Finding pairings…' : submitLabel}
          </Button>
          <p className="text-center text-label text-stone-500">
            {disabled ? 'Select a ready female to set goals.' : 'Shows the best 4 of all your ready males'}
          </p>
        </>
      )}
    </div>
  );
}
