import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Pagination } from './Pagination.jsx';

const pagination = (overrides = {}) => ({ page: 2, pageSize: 20, total: 45, totalPages: 3, ...overrides });

describe('Pagination', () => {
  it('hides itself when everything fits on one page', () => {
    const { container } = render(<Pagination pagination={pagination({ totalPages: 1 })} onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the position and total', () => {
    render(<Pagination pagination={pagination()} onChange={vi.fn()} />);
    expect(screen.getByText('Page 2 / 3 · 45 total')).toBeInTheDocument();
  });

  it('moves between pages', async () => {
    const onChange = vi.fn();
    render(<Pagination pagination={pagination()} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /prev/i }));
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onChange).toHaveBeenNthCalledWith(1, 1);
    expect(onChange).toHaveBeenNthCalledWith(2, 3);
  });

  it('disables Prev on the first page and Next on the last', () => {
    const { rerender } = render(<Pagination pagination={pagination({ page: 1 })} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled();

    rerender(<Pagination pagination={pagination({ page: 3 })} onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });
});
