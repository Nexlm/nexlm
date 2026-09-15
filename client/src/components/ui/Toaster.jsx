import clsx from 'clsx';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { useToastStore } from '../../store/toastStore.js';

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };
const TONES = { success: 'text-mint', error: 'text-ember', info: 'text-frost' };

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
      {toasts.map((t) => {
        const Icon = ICONS[t.tone] ?? Info;
        return (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded border border-line bg-raised p-3 shadow-xl shadow-black/50"
          >
            <Icon className={clsx('mt-0.5 h-5 w-5 shrink-0', TONES[t.tone])} aria-hidden />
            <p className="flex-1 text-sm text-paper">{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} className="text-moss hover:text-paper" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
