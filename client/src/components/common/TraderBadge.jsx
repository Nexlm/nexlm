import { BadgeCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPercent } from '../../lib/format.js';

export function Avatar({ name, size = 'md' }) {
  const dims = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm';
  return (
    <div
      className={`${dims} flex shrink-0 items-center justify-center rounded border border-line bg-raised font-display font-bold uppercase text-mint`}
    >
      {name?.[0] ?? '?'}
    </div>
  );
}

export const tradeCountLabel = (count) => `${count} ${count === 1 ? 'trade' : 'trades'}`;

/** Trader name with verified badge and trade stats. */
export function TraderBadge({ user, showStats = true }) {
  if (!user) return null;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar name={user.displayName} />
      <div className="min-w-0">
        <div className="flex items-center gap-1">
          <Link to={`/u/${user.displayName}`} className="truncate font-semibold text-paper hover:text-mint">
            {user.displayName}
          </Link>
          {user.kycStatus === 'VERIFIED' && <BadgeCheck className="h-4 w-4 shrink-0 text-mint" aria-label="KYC verified" />}
        </div>
        {showStats && user.stats && (
          <p className="font-mono text-[11px] text-moss">
            {tradeCountLabel(user.stats.completedTrades)} · {formatPercent(user.stats.completionRate)} completion
          </p>
        )}
      </div>
    </div>
  );
}
