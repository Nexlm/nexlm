import clsx from 'clsx';
import { CircleAlert, CircleCheck, Info, Loader2, TriangleAlert } from 'lucide-react';

export function Spinner({ className }) {
  return <Loader2 className={clsx('h-5 w-5 animate-spin text-mint', className)} aria-label="Loading" />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="h-7 w-7" />
    </div>
  );
}

const ALERT_TONES = {
  info: { icon: Info, classes: 'border-frost/30 bg-frost/[0.06] text-paper', iconClass: 'text-frost' },
  success: { icon: CircleCheck, classes: 'border-mint/30 bg-mint/[0.06] text-paper', iconClass: 'text-mint' },
  warning: { icon: TriangleAlert, classes: 'border-gold/35 bg-gold/[0.07] text-paper', iconClass: 'text-gold' },
  error: { icon: CircleAlert, classes: 'border-ember/35 bg-ember/[0.07] text-paper', iconClass: 'text-ember' },
};

export function Alert({ tone = 'info', title, children, action, className }) {
  const { icon: Icon, classes, iconClass } = ALERT_TONES[tone];
  return (
    <div className={clsx('flex gap-3 rounded border p-4 text-sm', classes, className)} role="status">
      <Icon className={clsx('mt-0.5 h-5 w-5 shrink-0', iconClass)} aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={clsx(title && 'mt-1', 'text-soft')}>{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon && (
        <div className="mb-4 rounded border border-line p-3">
          <Icon className="h-6 w-6 text-moss" aria-hidden />
        </div>
      )}
      <p className="font-display text-lg font-bold text-paper">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-moss">{description}</p>}
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
          <button type="button" onClick={() => onRetry()} className="link text-sm">
            Retry
          </button>
        )
      }
    >
      {error?.message ?? 'Something went wrong.'}
      {error?.requestId && <p className="mono mt-1 text-moss">Reference {error.requestId}</p>}
    </Alert>
  );
}
