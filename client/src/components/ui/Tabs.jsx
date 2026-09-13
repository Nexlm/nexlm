import clsx from 'clsx';

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div role="tablist" className={clsx('inline-flex rounded-lg bg-slate-100 p-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          type="button"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={clsx(
            'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
            value === tab.value ? (tab.activeClass ?? 'bg-white text-slate-900 shadow-sm') : 'text-slate-500 hover:text-slate-700',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
