import clsx from 'clsx';

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div role="tablist" className={clsx('inline-flex rounded border border-line bg-ink p-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          type="button"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={clsx(
            'whitespace-nowrap rounded-[4px] px-4 py-1.5 text-sm font-semibold transition-colors',
            value === tab.value ? (tab.activeClass ?? 'bg-raised text-paper') : 'text-moss hover:text-paper',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
