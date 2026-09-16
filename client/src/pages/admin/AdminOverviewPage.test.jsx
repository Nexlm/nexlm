import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/api.js', () => ({ api: { get: vi.fn(), post: vi.fn() }, setAuthHandlers: vi.fn() }));

const { api } = await import('../../lib/api.js');
const AdminOverviewPage = (await import('./AdminOverviewPage.jsx')).default;

const overview = (overrides = {}) => ({
  users: { total: 120, verified: 80, pendingKyc: 3 },
  trades: { active: 4, completed30d: 56, cancelled30d: 4, completionRate30d: 93.3 },
  volume30d: { ngn: '5000000.00', xlm: '3200' },
  activeOrders: 14,
  ...overrides,
});

const renderPage = () => render(<MemoryRouter><AdminOverviewPage /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue(overview());
});

describe('AdminOverviewPage', () => {
  it('leads with 30-day traded volume', async () => {
    renderPage();
    expect(await screen.findByText(/5,000,000\.00/)).toBeInTheDocument();
    expect(screen.getByText('3,200 XLM')).toBeInTheDocument();
  });

  it('shows trade health', async () => {
    renderPage();
    expect(await screen.findByText('56')).toBeInTheDocument();
    expect(screen.getByText('93.3%')).toBeInTheDocument();
    expect(screen.getByText('completion rate')).toBeInTheDocument();
  });

  it('links live trades and user segments to their queues', async () => {
    renderPage();
    await screen.findByText('56');

    expect(screen.getByRole('link', { name: /trades in progress/ })).toHaveAttribute('href', '/admin/trades');
    expect(screen.getByRole('link', { name: /pending KYC reviews/ })).toHaveAttribute(
      'href',
      '/admin/users?kycStatus=PENDING',
    );
  });

  it('highlights work waiting on an admin', async () => {
    renderPage();
    const pending = await screen.findByText('3');
    expect(pending.className).toContain('text-gold');
  });

  it('does not highlight an empty queue', async () => {
    api.get.mockResolvedValue(overview({ users: { total: 120, verified: 80, pendingKyc: 0 } }));
    renderPage();

    const pending = await screen.findByText('0');
    expect(pending.className).not.toContain('text-gold');
  });

  it('shows a dash for completion rate before any trade closes', async () => {
    api.get.mockResolvedValue(overview({ trades: { active: 0, completed30d: 0, cancelled30d: 0, completionRate30d: null } }));
    renderPage();
    expect(await screen.findByText('—')).toBeInTheDocument();
  });

  it('offers a retry when the dashboard cannot be loaded', async () => {
    api.get.mockRejectedValueOnce(new Error('Could not reach Nexlm')).mockResolvedValue(overview());
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByText('56')).toBeInTheDocument());
  });
});
