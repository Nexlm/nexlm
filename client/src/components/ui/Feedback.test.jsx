import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Wallet } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { Alert, EmptyState, ErrorState, PageLoader, Spinner } from './Feedback.jsx';

describe('Spinner', () => {
  it('announces that something is loading', () => {
    render(<Spinner />);
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });

  it('is used by the full-page loader', () => {
    render(<PageLoader />);
    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
  });
});

describe('Alert', () => {
  it('renders a title and body as a status region', () => {
    render(
      <Alert tone="warning" title="Payment window closing">
        Pay within 2 minutes or the trade is refunded.
      </Alert>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Payment window closing')).toBeInTheDocument();
    expect(screen.getByText(/refunded/)).toBeInTheDocument();
  });

  it('colours by tone', () => {
    const { rerender } = render(<Alert tone="error">Escrow failed</Alert>);
    expect(screen.getByRole('status').className).toContain('border-ember');
    rerender(<Alert tone="success">Trade completed</Alert>);
    expect(screen.getByRole('status').className).toContain('border-mint');
  });

  it('can carry an action', () => {
    render(<Alert action={<button type="button">Verify</button>}>Verify your email</Alert>);
    expect(screen.getByRole('button', { name: 'Verify' })).toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('explains what is missing and what to do', () => {
    render(
      <EmptyState
        icon={Wallet}
        title="No offers yet"
        description="Be the first to post a sell offer."
        action={<button type="button">Post an offer</button>}
      />,
    );
    expect(screen.getByText('No offers yet')).toBeInTheDocument();
    expect(screen.getByText('Be the first to post a sell offer.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post an offer' })).toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('shows the error message', () => {
    render(<ErrorState error={new Error('Could not reach Nexlm')} />);
    expect(screen.getByText('Could not reach Nexlm')).toBeInTheDocument();
  });

  it('falls back when the error has no message', () => {
    render(<ErrorState error={undefined} />);
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('retries on demand', async () => {
    const onRetry = vi.fn();
    render(<ErrorState error={new Error('boom')} onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('hides the retry button when there is nothing to retry', () => {
    render(<ErrorState error={new Error('boom')} />);
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });
});
