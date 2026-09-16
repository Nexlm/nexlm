import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/api.js', () => ({ api: { get: vi.fn(), post: vi.fn() }, setAuthHandlers: vi.fn() }));

const { api } = await import('../lib/api.js');
const PublicProfilePage = (await import('./PublicProfilePage.jsx')).default;

const profile = (overrides = {}) => ({
  id: 'usr_1',
  displayName: 'ada',
  kycStatus: 'VERIFIED',
  createdAt: '2026-01-15T10:00:00Z',
  stats: { completedTrades: 12, completionRate: 98.5 },
  activeOrders: [{ id: 'ord_1', type: 'SELL', xlmAmount: '250', ngnRate: '1500', paymentMethods: ['OPAY'] }],
  ...overrides,
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/u/ada']}>
      <Routes>
        <Route path="/u/:displayName" element={<PublicProfilePage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue(profile());
});

describe('PublicProfilePage', () => {
  it('loads the trader named in the URL', async () => {
    renderPage();
    await screen.findByRole('heading', { name: /ada/ });
    expect(api.get).toHaveBeenCalledWith('/users/ada');
  });

  it('shows reputation as headline numbers', async () => {
    renderPage();
    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByText('98.5%')).toBeInTheDocument();
  });

  it('marks a verified trader', async () => {
    renderPage();
    expect(await screen.findByLabelText('Verified')).toBeInTheDocument();
  });

  it('does not mark an unverified trader', async () => {
    api.get.mockResolvedValue(profile({ kycStatus: 'PENDING' }));
    renderPage();

    await screen.findByRole('heading', { name: 'ada' });
    expect(screen.queryByLabelText('Verified')).not.toBeInTheDocument();
  });

  it('lists the offers they have on the market', async () => {
    renderPage();
    expect(await screen.findByText('Selling')).toBeInTheDocument();
    expect(screen.getByText('250 XLM')).toBeInTheDocument();
    expect(screen.getByText('OPay')).toBeInTheDocument();
  });

  it('says when a trader has no offers up', async () => {
    api.get.mockResolvedValue(profile({ activeOrders: [] }));
    renderPage();
    expect(await screen.findByText('No active orders')).toBeInTheDocument();
  });

  it('offers a retry for an unknown trader', async () => {
    api.get.mockRejectedValueOnce({ status: 404, message: 'Trader not found' }).mockResolvedValue(profile());
    renderPage();

    expect(await screen.findByText('Trader not found')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /ada/ })).toBeInTheDocument());
  });
});
