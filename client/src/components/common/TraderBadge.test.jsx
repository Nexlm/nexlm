import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Avatar, TraderBadge, tradeCountLabel } from './TraderBadge.jsx';

const renderBadge = (props) => render(<MemoryRouter><TraderBadge {...props} /></MemoryRouter>);

const user = {
  displayName: 'ada',
  kycStatus: 'VERIFIED',
  stats: { completedTrades: 12, completionRate: 98.5 },
};

describe('tradeCountLabel', () => {
  it('pluralises', () => {
    expect(tradeCountLabel(1)).toBe('1 trade');
    expect(tradeCountLabel(0)).toBe('0 trades');
    expect(tradeCountLabel(12)).toBe('12 trades');
  });
});

describe('Avatar', () => {
  it('uses the first letter of the name', () => {
    render(<Avatar name="ada" />);
    expect(screen.getByText('a')).toBeInTheDocument();
  });

  it('falls back when there is no name', () => {
    render(<Avatar name={undefined} />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});

describe('TraderBadge', () => {
  it('links to the public profile', () => {
    renderBadge({ user });
    expect(screen.getByRole('link', { name: 'ada' })).toHaveAttribute('href', '/u/ada');
  });

  it('marks verified traders', () => {
    renderBadge({ user });
    expect(screen.getByLabelText('KYC verified')).toBeInTheDocument();
  });

  it('does not mark unverified traders', () => {
    renderBadge({ user: { ...user, kycStatus: 'PENDING' } });
    expect(screen.queryByLabelText('KYC verified')).not.toBeInTheDocument();
  });

  it('shows trade history', () => {
    renderBadge({ user });
    expect(screen.getByText('12 trades · 98.5% completion')).toBeInTheDocument();
  });

  it('can hide stats in compact rows', () => {
    renderBadge({ user, showStats: false });
    expect(screen.queryByText(/completion/)).not.toBeInTheDocument();
  });

  it('renders nothing without a user', () => {
    const { container } = renderBadge({ user: null });
    expect(container).toBeEmptyDOMElement();
  });
});
