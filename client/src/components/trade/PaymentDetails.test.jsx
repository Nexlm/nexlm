import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PaymentDetails } from './PaymentDetails.jsx';

const account = {
  method: 'BANK_TRANSFER',
  bankName: 'GTBank',
  accountName: 'Ada Obi',
  accountNumber: '0123456789',
};

describe('PaymentDetails', () => {
  it('shows the exact amount and the payout account', () => {
    render(<PaymentDetails account={account} amount="375000.00" isBuyer />);
    expect(screen.getByText(/375,000\.00/)).toBeInTheDocument();
    expect(screen.getByText('Bank Transfer')).toBeInTheDocument();
    expect(screen.getByText('GTBank')).toBeInTheDocument();
    expect(screen.getByText('Ada Obi')).toBeInTheDocument();
    expect(screen.getByText('0123456789')).toBeInTheDocument();
  });

  it('omits the bank row for mobile wallets', () => {
    render(<PaymentDetails account={{ ...account, method: 'OPAY', bankName: null }} amount="1000" isBuyer />);
    expect(screen.queryByText('Bank')).not.toBeInTheDocument();
    expect(screen.getByText('OPay')).toBeInTheDocument();
  });

  it('gives the buyer copy buttons and payment advice', () => {
    render(<PaymentDetails account={account} amount="1000" isBuyer />);
    expect(screen.getByText('Send exactly this amount')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Copy' })).toHaveLength(2);
    expect(screen.getByText(/Don't mention crypto/)).toBeInTheDocument();
  });

  it('shows the seller their own account without copy buttons', () => {
    render(<PaymentDetails account={account} amount="1000" isBuyer={false} />);
    expect(screen.getByText('Buyer pays into your account')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copy' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Don't mention crypto/)).not.toBeInTheDocument();
  });

  it('explains when the seller has no payout details', () => {
    render(<PaymentDetails account={null} amount="1000" isBuyer />);
    expect(screen.getByText("The seller's payout details are unavailable.")).toBeInTheDocument();
  });
});
