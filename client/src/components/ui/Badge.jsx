import clsx from 'clsx';

// Tinted mono chips, like the transaction kinds on the pitch reel.
const TONES = {
  moss: 'bg-moss/15 text-soft',
  mint: 'bg-mint/[0.12] text-mint',
  ember: 'bg-ember/15 text-ember',
  gold: 'bg-gold/[0.12] text-gold',
  frost: 'bg-frost/[0.12] text-frost',
};

export function Badge({ tone = 'moss', className, children }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-[3px] px-2 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em]',
        TONES[tone] ?? TONES.moss,
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Renders a status badge from a { label, tone } lookup table. */
export function StatusBadge({ map, status }) {
  const meta = map[status] ?? { label: status, tone: 'moss' };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
