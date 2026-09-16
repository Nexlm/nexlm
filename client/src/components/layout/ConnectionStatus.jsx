import clsx from 'clsx';
import { useSocketConnected } from '../../hooks/useSocket.js';

/**
 * Says whether updates are arriving live or being polled. Serverless
 * deployments have no socket server, and a trader watching a payment window
 * deserves to know which one they are looking at.
 */
export function ConnectionStatus({ className }) {
  const connected = useSocketConnected();

  return (
    <span
      className={clsx('flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-moss', className)}
      title={connected ? 'Updates arrive instantly' : 'Updates refresh every few seconds'}
    >
      <span
        aria-hidden
        className={clsx(
          'h-1.5 w-1.5 rounded-full',
          connected ? 'bg-mint shadow-[0_0_0_3px_rgba(63,208,138,0.18)]' : 'bg-gold shadow-[0_0_0_3px_rgba(243,196,75,0.15)]',
        )}
      />
      {connected ? 'Live' : 'Polling'}
    </span>
  );
}
