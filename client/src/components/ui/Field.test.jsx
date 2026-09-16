import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Input, Select, Textarea } from './Field.jsx';

describe('Input', () => {
  it('links its label to the control', async () => {
    render(<Input label="Amount" />);
    await userEvent.type(screen.getByLabelText('Amount'), '250');
    expect(screen.getByLabelText('Amount')).toHaveValue('250');
  });

  it('shows a hint when there is no error', () => {
    render(<Input label="Amount" hint="Minimum 10 XLM" />);
    expect(screen.getByText('Minimum 10 XLM')).toBeInTheDocument();
  });

  it('replaces the hint with the error and marks the field invalid', () => {
    render(<Input label="Amount" hint="Minimum 10 XLM" error="Enter a valid XLM amount" />);
    expect(screen.queryByText('Minimum 10 XLM')).not.toBeInTheDocument();
    expect(screen.getByText('Enter a valid XLM amount')).toBeInTheDocument();
    expect(screen.getByLabelText('Amount')).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders a unit suffix', () => {
    render(<Input label="Amount" suffix="XLM" />);
    expect(screen.getByText('XLM')).toBeInTheDocument();
  });
});

describe('Textarea', () => {
  it('accepts long terms', async () => {
    const onChange = vi.fn();
    render(<Textarea label="Terms" onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('Terms'), 'Pay within 15 minutes');
    expect(onChange).toHaveBeenCalled();
  });
});

describe('Select', () => {
  it('renders its options and reports changes', async () => {
    const onChange = vi.fn();
    render(
      <Select
        label="Payment method"
        value="OPAY"
        onChange={onChange}
        options={[
          { value: 'OPAY', label: 'OPay' },
          { value: 'KUDA', label: 'Kuda' },
        ]}
      />,
    );
    await userEvent.selectOptions(screen.getByLabelText('Payment method'), 'KUDA');
    expect(onChange).toHaveBeenCalled();
    expect(screen.getByRole('option', { name: 'Kuda' })).toBeInTheDocument();
  });
});
