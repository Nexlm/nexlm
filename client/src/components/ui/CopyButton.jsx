import clsx from 'clsx';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

export function CopyButton({ value, label = 'Copy', className }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (e.g. insecure context); the value is still selectable.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={clsx(
        'inline-flex items-center gap-1 rounded px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-mint hover:bg-mint/10',
        className,
      )}
      aria-label={copied ? 'Copied' : label || 'Copy'}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {label && (copied ? 'Copied' : label)}
    </button>
  );
}
