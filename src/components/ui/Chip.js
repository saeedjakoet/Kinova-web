import clsx from 'clsx';
import Icon from './Icon';

const STYLES = {
  neutral: { on: 'bg-forest-900 text-ivory-50 border-forest-900', off: 'bg-card text-charcoal-700 border-line-strong hover:bg-ivory-100' },
  objective: { on: 'bg-sage-200 text-forest-900 border-forest-700', off: 'bg-card text-charcoal-700 border-line-strong hover:bg-ivory-100' },
  trait: { on: 'bg-forest-700 text-card border-forest-700', off: 'bg-sage-100 text-forest-900 border-sage-200 hover:bg-sage-200' },
  avoid: { on: 'bg-risk-bg text-risk border-risk', off: 'bg-card text-risk border-line-strong hover:bg-risk-bg' },
};

/**
 * Figma: Chip — Type (neutral|objective|trait|avoid) × State (default|selected); optional remove (×) and leading icon.
 * Rendered as a toggle button (aria-pressed). The remove button is separate so it is keyboard reachable.
 */
export default function Chip({ type = 'neutral', selected = false, children, icon, onClick, onRemove, removeLabel, disabled, className, role, ...rest }) {
  const s = STYLES[type];
  const lead = icon || (selected ? (type === 'avoid' ? 'ban' : 'check') : null);
  const body = (
    <>
      {lead && <Icon name={lead} size={14} />}
      <span>{children}</span>
    </>
  );
  return (
    <span
      className={clsx(
        'inline-flex h-8 items-center rounded-full border text-body-sm-md transition-colors',
        selected ? s.on : s.off,
        disabled && 'opacity-55',
        className,
      )}
    >
      {onClick ? (
        <button
          type="button"
          role={role}
          aria-pressed={role ? undefined : selected}
          aria-checked={role === 'radio' ? selected : undefined}
          disabled={disabled}
          onClick={onClick}
          className={clsx('focus-ring inline-flex h-full items-center gap-1.5 rounded-full pl-3', onRemove ? 'pr-1.5' : 'pr-3')}
          {...rest}
        >
          {body}
        </button>
      ) : (
        <span className={clsx('inline-flex items-center gap-1.5 pl-3', onRemove ? 'pr-1.5' : 'pr-3')}>{body}</span>
      )}
      {onRemove && (
        <button
          type="button"
          aria-label={removeLabel || `Remove ${typeof children === 'string' ? children : ''}`}
          onClick={onRemove}
          disabled={disabled}
          className="focus-ring mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-black/5"
        >
          <Icon name="x" size={14} />
        </button>
      )}
    </span>
  );
}
