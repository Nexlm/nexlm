import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/api.js', () => ({ api: { get: vi.fn(), post: vi.fn() }, setAuthHandlers: vi.fn() }));

const { api } = await import('../../lib/api.js');
const { ActivityList } = await import('./ActivityList.jsx');

const entry = (overrides = {}) => ({
  id: '1',
  kind: 'payment',
  direction: 'in',
  amount: '50',
  counterparty: 'GA6HCMBLTZS5VYYBCATRBRZ3BZJMAFUDKYYF6AH6MVCMGWMRDNSWJPIH',
  createdAt: '2026-09-01T12:00:00Z',
  explorerUrl: 'https://stellar.expert/explorer/testnet/tx/abc',
  ...overrides,
});

beforeEach(() => vi.clearAllMocks());

describe('ActivityList', () => {
  it('lists received and sent payments with signed amounts', async () => {
    api.get.mockResolvedValue({ items: [entry(), entry({ id: '2', direction: 'out', amount: '20' })], nextCursor: null });
    render(<ActivityList />);

    expect(await screen.findByText('Received')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
    expect(screen.getByText('+50 XLM')).toBeInTheDocument();
    expect(screen.getByText('−20 XLM')).toBeInTheDocument();
  });

  it('labels escrow movements in plain language', async () => {
    api.get.mockResolvedValue({
      items: [entry({ kind: 'create_account', direction: 'out' }), entry({ id: '2', kind: 'account_merge', direction: 'in', amount: null })],
      nextCursor: null,
    });
    render(<ActivityList />);

    expect(await screen.findByText('Escrow funded')).toBeInTheDocument();
    expect(screen.getByText('Escrow returned')).toBeInTheDocument();
  });

  it('links each entry to the block explorer', async () => {
    api.get.mockResolvedValue({ items: [entry()], nextCursor: null });
    render(<ActivityList />);

    const link = await screen.findByRole('link', { name: /tx/ });
    expect(link).toHaveAttribute('href', 'https://stellar.expert/explorer/testnet/tx/abc');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('explains an empty wallet', async () => {
    api.get.mockResolvedValue({ items: [], nextCursor: null });
    render(<ActivityList />);
    expect(await screen.findByText('No activity yet')).toBeInTheDocument();
  });

  it('offers a retry when the history cannot be loaded', async () => {
    api.get.mockRejectedValueOnce(new Error('Could not reach Nexlm')).mockResolvedValue({ items: [], nextCursor: null });
    render(<ActivityList />);

    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByText('No activity yet')).toBeInTheDocument());
  });

  it('loads older entries with the cursor', async () => {
    api.get
      .mockResolvedValueOnce({ items: [entry()], nextCursor: 'p1' })
      .mockResolvedValueOnce({ items: [entry({ id: '2', amount: '5' })], nextCursor: null });
    render(<ActivityList />);

    await userEvent.click(await screen.findByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(screen.getByText('+5 XLM')).toBeInTheDocument());
    expect(api.get).toHaveBeenLastCalledWith('/wallet/activity', { cursor: 'p1' });
  });

  it('hides Load more on the last page', async () => {
    api.get.mockResolvedValue({ items: [entry()], nextCursor: null });
    render(<ActivityList />);

    await screen.findByText('Received');
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });
});
