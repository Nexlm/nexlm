import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { OrderRow } from './OrderRow.jsx';

const order = (overrides = {}) => ({
  id: 'ord_1',
  type: 'SELL',
  xlmAmount: '250',
  ngnRate: '1500.50',
  paymentMethods: ['OPAY', 'KUDA'],
  user: { displayName: 'ada', kycStatus: 'VERIFIED', stats: { completedTrades: 12, completionRate: 98.5 } },
  ...overrides,
});

const renderRow = (props = {}) =>
  render(
    <MemoryRouter>
      <OrderRow order={order(props.order)} isOwn={props.isOwn} onTrade={props.onTrade ?? vi.fn()} />
    </MemoryRouter>,
  );

describe('OrderRow', () => {
  it('shows the price per XLM and the amount on offer', () => {
    renderRow();
    expect(screen.getByText(/1,500\.50/)).toBeInTheDocument();
    expect(screen.getByText('250 XLM')).toBeInTheDocument();
  });

  it('estimates the Naira total', () => {
    renderRow();
    expect(screen.getByText(/375,125\.00/)).toBeInTheDocument();
  });

  it('shows who is advertising and their payment rails', () => {
    renderRow();
    expect(screen.getByRole('link', { name: 'ada' })).toBeInTheDocument();
    expect(screen.getByText('OPay')).toBeInTheDocument();
    expect(screen.getByText('Kuda')).toBeInTheDocument();
  });

  it('offers to buy from a sell order and to sell into a buy order', () => {
    const { unmount } = renderRow();
    expect(screen.getByRole('button', { name: 'Buy XLM' })).toBeInTheDocument();
    unmount();

    renderRow({ order: { type: 'BUY' } });
    expect(screen.getByRole('button', { name: 'Sell XLM' })).toBeInTheDocument();
  });

  it('passes the order to the trade handler', async () => {
    const onTrade = vi.fn();
    renderRow({ onTrade });
    await userEvent.click(screen.getByRole('button', { name: 'Buy XLM' }));
    expect(onTrade).toHaveBeenCalledWith(expect.objectContaining({ id: 'ord_1' }));
  });

  it('never offers to trade against your own order', () => {
    renderRow({ isOwn: true });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Your order')).toBeInTheDocument();
  });
});
