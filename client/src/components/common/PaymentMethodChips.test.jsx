import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PaymentMethodChips } from './PaymentMethodChips.jsx';

describe('PaymentMethodChips', () => {
  it('shows human labels, not API codes', () => {
    render(<PaymentMethodChips methods={['BANK_TRANSFER', 'OPAY']} />);
    expect(screen.getByText('Bank Transfer')).toBeInTheDocument();
    expect(screen.getByText('OPay')).toBeInTheDocument();
    expect(screen.queryByText('BANK_TRANSFER')).not.toBeInTheDocument();
  });

  it('renders nothing for an offer with no methods', () => {
    const { container } = render(<PaymentMethodChips methods={[]} />);
    expect(container.querySelectorAll('span')).toHaveLength(0);
  });

  it('passes through rails it does not know yet', () => {
    render(<PaymentMethodChips methods={['FUTURE_RAIL']} />);
    expect(screen.getByText('FUTURE_RAIL')).toBeInTheDocument();
  });
});
