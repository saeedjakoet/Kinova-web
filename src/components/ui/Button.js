import clsx from 'clsx';
import Icon from './Icon';

const VARIANTS = {
  primary: 'bg-forest-900 text-ivory-50 hover:bg-forest-700',
  secondary: 'bg-card text-charcoal-900 border border-line-strong hover:bg-ivory-100',
  ghost: 'bg-transparent text-forest-700 hover:bg-sage-100',
  danger: 'bg-risk text-card hover:bg-risk-strong',
};

const SIZES = {
  md: 'h-11 px-[18px] text-body-md',
  sm: 'h-9 px-3.5 text-body-sm-md',
};

/**
 * Figma: Button — Variant (primary|secondary|ghost|danger) × State (default|hover|disabled|loading) × Size (md 44 | sm 36)
 */
export default function Button({ variant = 'primary', size = 'md', loading = false, iconLeft, iconRight, className, children, disabled, type = 'button', ...rest }) {
  const is = size === 'md' ? 18 : 16;
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        'focus-ring inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control transition-colors',
        VARIANTS[variant],
        SIZES[size],
        disabled && !loading && 'opacity-40 pointer-events-none',
        loading && 'cursor-progress',
        className,
      )}
      {...rest}
    >
      {loading && <Icon name="loader" size={is} className="animate-spin" />}
      {!loading && iconLeft && <Icon name={iconLeft} size={is} />}
      <span>{children}</span>
      {iconRight && <Icon name={iconRight} size={is} />}
    </button>
  );
}

export function IconButton({ icon, label, size = 36, iconSize = 18, className, variant = 'ghost', ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        'focus-ring inline-flex shrink-0 items-center justify-center rounded-icon transition-colors',
        variant === 'solid' ? 'bg-forest-900 text-ivory-50 hover:bg-forest-700' : 'text-charcoal-600 hover:bg-ivory-100',
        className,
      )}
      style={{ width: size, height: size }}
      {...rest}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  );
}
