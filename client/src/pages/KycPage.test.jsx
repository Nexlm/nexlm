import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/api.js', () => ({ api: { get: vi.fn(), post: vi.fn() }, setAuthHandlers: vi.fn() }));

const { api } = await import('../lib/api.js');
const { useAuthStore } = await import('../store/authStore.js');
const KycPage = (await import('./KycPage.jsx')).default;

const status = (overrides = {}) => ({
  kycStatus: 'UNVERIFIED',
  kycIdType: null,
  kycIdLast4: null,
  kycFullName: null,
  kycSubmittedAt: null,
  ...overrides,
});

const renderPage = () => render(<MemoryRouter><KycPage /></MemoryRouter>);

const fillForm = async () => {
  await userEvent.type(screen.getByLabelText('BVN number'), '22212345678');
  await userEvent.type(screen.getByLabelText('First name'), 'Ada');
  await userEvent.type(screen.getByLabelText('Last name'), 'Obi');
  await userEvent.type(screen.getByLabelText('Date of birth'), '1994-05-17');
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ token: 'tok', user: { id: 'usr_1' }, refreshUser: vi.fn() });
  api.get.mockResolvedValue(status());
});

describe('KycPage for an unverified trader', () => {
  it('explains that only the last four digits are kept', async () => {
    renderPage();
    expect(await screen.findByText(/only keep the last 4 digits/)).toBeInTheDocument();
  });

  it('switches between BVN and NIN', async () => {
    renderPage();
    await screen.findByLabelText('BVN number');

    await userEvent.click(screen.getByRole('button', { name: /NIN National Identity Number/ }));
    expect(screen.getByLabelText('NIN number')).toBeInTheDocument();
  });

  it('submits the details and reports the outcome', async () => {
    api.post.mockResolvedValue({ status: 'VERIFIED', message: 'Your identity has been verified. You can now trade.' });
    renderPage();
    await screen.findByLabelText('BVN number');

    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Verify identity' }));

    expect(api.post).toHaveBeenCalledWith('/kyc', {
      idType: 'BVN',
      idNumber: '22212345678',
      firstName: 'Ada',
      lastName: 'Obi',
      dateOfBirth: '1994-05-17',
    });
    expect(await screen.findByText(/Your identity has been verified/)).toBeInTheDocument();
  });

  it('refreshes the session so trading unlocks immediately', async () => {
    const refreshUser = vi.fn();
    useAuthStore.setState({ refreshUser });
    api.post.mockResolvedValue({ status: 'VERIFIED', message: 'Verified' });
    renderPage();
    await screen.findByLabelText('BVN number');

    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Verify identity' }));
    await waitFor(() => expect(refreshUser).toHaveBeenCalled());
  });

  it('shows server validation errors on the right field', async () => {
    api.post.mockRejectedValue({
      message: 'Invalid request',
      details: [{ path: 'idNumber', message: 'BVN and NIN are 11 digits' }],
    });
    renderPage();
    await screen.findByLabelText('BVN number');

    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Verify identity' }));
    expect(await screen.findByText('BVN and NIN are 11 digits')).toBeInTheDocument();
  });

  it('reports errors that belong to no field', async () => {
    api.post.mockRejectedValue({ code: 'KYC_PROVIDER_ERROR', message: 'Identity verification is temporarily unavailable' });
    renderPage();
    await screen.findByLabelText('BVN number');

    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Verify identity' }));
    expect(await screen.findByText('Identity verification is temporarily unavailable')).toBeInTheDocument();
  });
});

describe('KycPage for other states', () => {
  it('confirms a verified identity and hides the form', async () => {
    api.get.mockResolvedValue(status({ kycStatus: 'VERIFIED', kycIdType: 'BVN', kycIdLast4: '5678', kycFullName: 'Ada Obi' }));
    renderPage();

    expect(await screen.findByText("You're verified")).toBeInTheDocument();
    expect(screen.getByText(/Ada Obi · BVN ···5678/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Verify identity' })).not.toBeInTheDocument();
  });

  it('says a submission is under review', async () => {
    api.get.mockResolvedValue(status({ kycStatus: 'PENDING', kycIdType: 'NIN', kycIdLast4: '1234', kycSubmittedAt: '2026-09-01T12:00:00Z' }));
    renderPage();

    expect(await screen.findByText('Under review')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Verify identity' })).not.toBeInTheDocument();
  });

  it('lets a rejected trader correct their details', async () => {
    api.get.mockResolvedValue(status({ kycStatus: 'REJECTED' }));
    renderPage();

    expect(await screen.findByText(/Enter your details exactly as they appear on your ID/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verify identity' })).toBeInTheDocument();
  });
});
