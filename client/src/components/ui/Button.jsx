import clsx from 'clsx';
import { Loader2 } from 'lucide-react';
import { forwardRef } from 'react';

const VARIANTS = {
  primary: 'bg-leaf text-ink hover:bg-mint disabled:bg-leaf/40',
  success: 'bg-leaf text-ink hover:bg-mint disabled:bg-leaf/40',
  gold: 'bg-gold text-ink hover:brightness-110 disabled:bg-gold/40',
  danger: 'bg-ember text-ink hover:brightness-110 disabled:bg-ember/40',
  secondary: 'border border-line bg-panel text-paper hover:border-leaf disabled:text-moss disabled:hover:border-line',
  ghost: 'text-soft hover:bg-panel hover:text-paper disabled:text-moss',
};

const SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, disabled, className, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center rounded font-semibold transition disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
