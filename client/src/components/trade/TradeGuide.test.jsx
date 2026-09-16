import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TradeGuide } from './TradeGuide.jsx';

const trade = (overrides = {}) => ({
  role: 'BUYER',
  status: 'ESCROW_LOCKED',
  ngnAmount: '375000.00',
  xlmAmount: '250',
  ...overrides,
});

describe('TradeGuide while escrow is locking', () => {
  it('says the XLM is on its way into escrow', () => {
    render(<TradeGuide trade={trade({ status: 'PENDING_ESCROW' })} />);
    expect(screen.getByText('Locking escrow on Stellar')).toBeInTheDocument();
  });
});

describe('TradeGuide while payment is due', () => {
  it('tells the buyer exactly how much to send', () => {
    render(<TradeGuide trade={trade()} />);
    expect(screen.getByText(/Send ₦?375,000\.00 to the seller/)).toBeInTheDocument();
    expect(screen.getByText(/250 XLM is locked in escrow for you/)).toBeInTheDocument();
  });

  it('reassures the seller that a timeout refunds them', () => {
    render(<TradeGuide trade={trade({ role: 'SELLER' })} />);
    expect(screen.getByText('Waiting for the buyer to pay')).toBeInTheDocument();
    expect(screen.getByText(/returned to you automatically/)).toBeInTheDocument();
  });
});

describe('TradeGuide after the buyer marks payment', () => {
  it('asks the buyer to wait', () => {
    render(<TradeGuide trade={trade({ status: 'PAID' })} />);
    expect(screen.getByText('Waiting for the seller to release')).toBeInTheDocument();
  });

  it('warns the seller never to release on a screenshot', () => {
    render(<TradeGuide trade={trade({ status: 'PAID', role: 'SELLER' })} />);
    expect(screen.getByText(/The buyer says they sent/)).toBeInTheDocument();
    expect(screen.getByText(/Never release on a screenshot/)).toBeInTheDocument();
  });
});

describe('TradeGuide when the trade closes', () => {
  it('tells the buyer the XLM arrived', () => {
    render(<TradeGuide trade={trade({ status: 'COMPLETED' })} />);
    expect(screen.getByText('Trade complete')).toBeInTheDocument();
    expect(screen.getByText('250 XLM has been sent to your Nexlm wallet.')).toBeInTheDocument();
  });

  it('tells the seller the XLM was released', () => {
    render(<TradeGuide trade={trade({ status: 'COMPLETED', role: 'SELLER' })} />);
    expect(screen.getByText('250 XLM was released to the buyer.')).toBeInTheDocument();
  });

  it('explains why a trade was cancelled', () => {
    render(<TradeGuide trade={trade({ status: 'CANCELLED', cancelReason: 'PAYMENT_TIMEOUT' })} />);
    expect(screen.getByText(/Payment window expired/)).toBeInTheDocument();
  });

  it('falls back when the cancel reason is unknown', () => {
    render(<TradeGuide trade={trade({ status: 'CANCELLED', cancelReason: 'SOMETHING_NEW' })} />);
    expect(screen.getByText(/This trade was cancelled\./)).toBeInTheDocument();
  });

  it('shows progress while funds move', () => {
    const { unmount } = render(<TradeGuide trade={trade({ status: 'RELEASING' })} />);
    expect(screen.getByText('Releasing XLM from escrow…')).toBeInTheDocument();
    unmount();

    render(<TradeGuide trade={trade({ status: 'REFUNDING' })} />);
    expect(screen.getByText('Returning XLM to the seller…')).toBeInTheDocument();
  });
});
