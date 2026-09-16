import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/api.js', () => ({ api: { get: vi.fn(), post: vi.fn() }, setAuthHandlers: vi.fn() }));

const { api } = await import('../../lib/api.js');
const { DepositPanel } = await import('./DepositPanel.jsx');

const publicKey = 'GA6HCMBLTZS5VYYBCATRBRZ3BZJMAFUDKYYF6AH6MVCMGWMRDNSWJPIH';
const deposit = (overrides = {}) => ({
  publicKey,
  network: 'testnet',
  qrCode: 'data:image/png;base64,abc',
  warning: 'This is a TESTNET wallet. Do not send real XLM to this address.',
  ...overrides,
});

beforeEach(() => vi.clearAllMocks());

describe('DepositPanel', () => {
  it('shows a scannable QR code with alt text', async () => {
    api.get.mockResolvedValue(deposit());
    render(<DepositPanel />);

    const qr = await screen.findByAltText('Deposit address QR code');
    expect(qr).toHaveAttribute('src', 'data:image/png;base64,abc');
  });

  it('shows the full address and a way to copy it', async () => {
    api.get.mockResolvedValue(deposit());
    render(<DepositPanel />);

    expect(await screen.findByText(publicKey)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });

  it('warns loudly that a testnet address takes no real XLM', async () => {
    api.get.mockResolvedValue(deposit());
    render(<DepositPanel />);
    expect(await screen.findByText(/This is a TESTNET wallet/)).toBeInTheDocument();
  });

  it('says no memo is needed', async () => {
    api.get.mockResolvedValue(deposit());
    render(<DepositPanel />);
    expect(await screen.findByText(/No memo needed/)).toBeInTheDocument();
  });

  it('offers a retry when the address cannot be loaded', async () => {
    api.get.mockRejectedValueOnce(new Error('Could not reach Nexlm')).mockResolvedValue(deposit());
    render(<DepositPanel />);

    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByText(publicKey)).toBeInTheDocument());
  });
});
