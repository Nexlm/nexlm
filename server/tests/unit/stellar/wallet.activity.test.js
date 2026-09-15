import { beforeEach, describe, expect, it, vi } from 'vitest';

const call = vi.fn();
const query = { forAccount: () => query, order: () => query, limit: () => query, cursor: vi.fn(() => query), call };

vi.mock('../../../src/stellar/client.js', async (importOriginal) => ({
  ...(await importOriginal()),
  horizon: { payments: () => query },
}));

const { getPaymentHistory } = await import('../../../src/stellar/wallet.js');

const me = 'GME';
const page = (records) => ({ records });

beforeEach(() => vi.clearAllMocks());

describe('getPaymentHistory', () => {
  it('maps incoming and outgoing payments', async () => {
    call.mockResolvedValue(
      page([
        { id: '1', type: 'payment', asset_type: 'native', to: me, from: 'GOTHER', amount: '50', transaction_hash: 'h1', created_at: 't1', paging_token: 'p1' },
        { id: '2', type: 'payment', asset_type: 'native', to: 'GOTHER', from: me, amount: '20', transaction_hash: 'h2', created_at: 't2', paging_token: 'p2' },
      ]),
    );
    const { records } = await getPaymentHistory(me);
    expect(records).toEqual([
      { id: '1', txHash: 'h1', createdAt: 't1', kind: 'payment', direction: 'in', amount: '50', counterparty: 'GOTHER' },
      { id: '2', txHash: 'h2', createdAt: 't2', kind: 'payment', direction: 'out', amount: '20', counterparty: 'GOTHER' },
    ]);
  });

  it('shows account creation as an incoming transfer', async () => {
    call.mockResolvedValue(
      page([{ id: '3', type: 'create_account', account: me, funder: 'GFRIEND', starting_balance: '10000', transaction_hash: 'h3', created_at: 't3' }]),
    );
    expect((await getPaymentHistory(me)).records[0]).toMatchObject({ kind: 'create_account', direction: 'in', amount: '10000', counterparty: 'GFRIEND' });
  });

  it('shows escrow merges as incoming with no amount', async () => {
    call.mockResolvedValue(page([{ id: '4', type: 'account_merge', into: me, account: 'GESCROW', transaction_hash: 'h4', created_at: 't4' }]));
    expect((await getPaymentHistory(me)).records[0]).toMatchObject({ kind: 'account_merge', direction: 'in', amount: null, counterparty: 'GESCROW' });
  });

  it('hides non-XLM payments and other operations', async () => {
    call.mockResolvedValue(
      page([
        { id: '5', type: 'payment', asset_type: 'credit_alphanum4', to: me, amount: '1' },
        { id: '6', type: 'path_payment_strict_send', to: me },
      ]),
    );
    expect((await getPaymentHistory(me)).records).toEqual([]);
  });

  it('only returns a cursor when the page was full', async () => {
    call.mockResolvedValue(page([{ id: '7', type: 'payment', asset_type: 'native', to: me, amount: '1', paging_token: 'p7' }]));
    expect((await getPaymentHistory(me, { limit: 1 })).nextCursor).toBe('p7');
    expect((await getPaymentHistory(me, { limit: 20 })).nextCursor).toBeNull();
  });

  it('passes the cursor through for the next page', async () => {
    call.mockResolvedValue(page([]));
    await getPaymentHistory(me, { cursor: 'p7' });
    expect(query.cursor).toHaveBeenCalledWith('p7');
  });

  it('returns nothing for an account Horizon has never seen', async () => {
    call.mockRejectedValue({ response: { status: 404 } });
    expect(await getPaymentHistory(me)).toEqual({ records: [], nextCursor: null });
  });
});
