import { useEffect } from 'react';

const SUFFIX = 'Nexlm';

/**
 * Sets the document title for a screen, so browser tabs and history are
 * readable when a trader has several trades open at once.
 */
export function usePageTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · ${SUFFIX}` : SUFFIX;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
