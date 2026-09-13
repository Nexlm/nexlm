import clsx from 'clsx';
import { CircleAlert, CircleCheck, Info, Loader2, TriangleAlert } from 'lucide-react';

export function Spinner({ className }) {
  return <Loader2 className={clsx('h-5 w-5 animate-spin text-brand-600', className)} aria-label="Loading" />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

const ALERT_TONES = {
  info: { icon: Info, classes: 'border-sky-200 bg-sky-50 text-sky-900' },
  success: { icon: CircleCheck, classes: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
  warning: { icon: TriangleAlert, classes: 'border-amber-200 bg-amber-50 text-amber-900' },
  error: { icon: CircleAlert, classes: 'border-rose-200 bg-rose-50 text-rose-900' },
};

export function Alert({ tone = 'info', title, children, action, className }) {
  const { icon: Icon, classes } = ALERT_TONES[tone];
  return (
    <div className={clsx('flex gap-3 rounded-lg border p-4 text-sm', classes, className)} role="status">
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={clsx(title && 'mt-1', 'opacity-90')}>{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon && (
        <div className="mb-4 rounded-full bg-slate-100 p-3">
          <Icon className="h-6 w-6 text-slate-500" aria-hidden />
        </div>
      )}
      <p className="font-medium text-slate-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <Alert
      tone="error"
      title="Couldn't load this"
      action={
        onRetry && (
          <button type="button" onClick={() => onRetry()} className="text-sm font-medium underline">
            Retry
          </button>
        )
      }
    >
      {error?.message ?? 'Something went wrong.'}
    </Alert>
  );
}
