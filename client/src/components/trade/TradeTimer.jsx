import clsx from 'clsx';
import { Clock } from 'lucide-react';
import { useCountdown } from '../../hooks/useCountdown.js';
import { formatCountdown } from '../../lib/format.js';

export function TradeTimer({ deadline, label = 'Time left to pay' }) {
  const seconds = useCountdown(deadline);
  const urgent = seconds <= 120;

  return (
    <div
      className={clsx(
        'flex items-center justify-between rounded-lg border px-4 py-3',
        urgent ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-amber-200 bg-amber-50 text-amber-900',
      )}
      role="timer"
      aria-live="polite"
    >
      <span className="flex items-center gap-2 text-sm font-medium">
        <Clock className="h-4 w-4" /> {seconds === 0 ? 'Payment window closed' : label}
      </span>
      <span className="font-mono text-xl font-semibold tabular-nums">{formatCountdown(seconds)}</span>
    </div>
  );
}
