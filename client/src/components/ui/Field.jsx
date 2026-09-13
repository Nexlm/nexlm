import clsx from 'clsx';
import { forwardRef, useId } from 'react';

function FieldShell({ id, label, hint, error, children, className }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-rose-600">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      )}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, hint, error, className, suffix, ...props }, ref) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          aria-invalid={Boolean(error)}
          className={clsx('field', error && 'field-error', suffix && 'pr-14')}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">
            {suffix}
          </span>
        )}
      </div>
    </FieldShell>
  );
});

export const Textarea = forwardRef(function Textarea({ label, hint, error, className, ...props }, ref) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <textarea ref={ref} id={id} className={clsx('field min-h-[96px]', error && 'field-error')} {...props} />
    </FieldShell>
  );
});

export const Select = forwardRef(function Select({ label, hint, error, className, options, ...props }, ref) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} className={className}>
      <select ref={ref} id={id} className={clsx('field', error && 'field-error')} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
});
