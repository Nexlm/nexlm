import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useToastStore } from '../../store/toastStore.js';
import { Toaster } from './Toaster.jsx';

beforeEach(() => useToastStore.setState({ toasts: [] }));

describe('Toaster', () => {
  it('shows nothing when there is nothing to say', () => {
    render(<Toaster />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('announces a message as a status region', () => {
    useToastStore.setState({ toasts: [{ id: 1, tone: 'success', message: 'Trade completed' }] });
    render(<Toaster />);

    expect(screen.getByRole('status')).toHaveTextContent('Trade completed');
  });

  it('stacks several messages', () => {
    useToastStore.setState({
      toasts: [
        { id: 1, tone: 'success', message: 'Order posted' },
        { id: 2, tone: 'error', message: 'Withdrawal failed' },
      ],
    });
    render(<Toaster />);
    expect(screen.getAllByRole('status')).toHaveLength(2);
  });

  it('can be dismissed by hand', async () => {
    useToastStore.setState({ toasts: [{ id: 1, tone: 'info', message: 'Waiting for payment' }] });
    render(<Toaster />);

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(useToastStore.getState().toasts).toEqual([]);
  });

  it('falls back to the info icon for an unknown tone', () => {
    useToastStore.setState({ toasts: [{ id: 1, tone: 'mystery', message: 'Something happened' }] });
    render(<Toaster />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
