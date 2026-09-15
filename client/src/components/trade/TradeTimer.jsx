import clsx from 'clsx';
import { useCountdown } from '../../hooks/useCountdown.js';
import { formatCountdown } from '../../lib/format.js';

export function TradeTimer({ deadline, label = 'Time left to pay' }) {
  const seconds = useCountdown(deadline);
  const urgent = seconds <= 120;

  return (
    <div className="border-y border-line py-5" role="timer" aria-live="polite">
      <p className={clsx('eyebrow', urgent && 'text-ember')}>{seconds === 0 ? 'Payment window closed' : label}</p>
      <p
        className={clsx(
          'mt-2 font-mono text-6xl font-semibold leading-none tracking-tighter tabular-nums sm:text-7xl',
          urgent ? 'text-ember' : 'text-gold',
        )}
      >
        {formatCountdown(seconds)}
      </p>
    </div>
  );
}
