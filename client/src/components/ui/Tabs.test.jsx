import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from './Tabs.jsx';

const tabs = [
  { value: 'buy', label: 'Buy XLM' },
  { value: 'sell', label: 'Sell XLM' },
];

describe('Tabs', () => {
  it('exposes the tab roles to assistive technology', () => {
    render(<Tabs tabs={tabs} value="buy" onChange={vi.fn()} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('marks the selected tab', () => {
    render(<Tabs tabs={tabs} value="sell" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Sell XLM' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Buy XLM' })).toHaveAttribute('aria-selected', 'false');
  });

  it('reports the tab that was clicked', async () => {
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} value="buy" onChange={onChange} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Sell XLM' }));
    expect(onChange).toHaveBeenCalledWith('sell');
  });
});
