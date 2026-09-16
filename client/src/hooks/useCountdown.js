import { useEffect, useState } from 'react';

const secondsLeft = (target) => Math.max(0, Math.floor((new Date(target).getTime() - Date.now()) / 1000));

/** Seconds remaining until `target`, updated every second. */
export function useCountdown(target) {
  const [seconds, setSeconds] = useState(() => (target ? secondsLeft(target) : 0));
  const [lastTarget, setLastTarget] = useState(target);

  // A new deadline must show immediately, before the first tick lands.
  if (target !== lastTarget) {
    setLastTarget(target);
    setSeconds(target ? secondsLeft(target) : 0);
  }

  useEffect(() => {
    if (!target) return undefined;
    const timer = setInterval(() => {
      const next = secondsLeft(target);
      setSeconds(next);
      if (next === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [target]);

  return seconds;
}
