import { beforeEach, describe, expect, it, vi } from 'vitest';

const call = vi.fn();
const query = { forAccount: () => query, order: () => query, limit: () => query, call };

vi.mock('../../../src/stellar/client.js', async (importOriginal) => ({
  ...(await importOriginal()),
  horizon: { transactions: () => query },
}));

const { ESCROW_MEMOS, findEscrowTransactions } = await import('../../../src/stellar/escrow.js');

beforeEach(() => vi.clearAllMocks());

describe('findEscrowTransactions', () => {
  it('returns successful transactions with their memos', async () => {
    call.mockResolvedValue({
      records: [
        { hash: 'h2', memo: ESCROW_MEMOS.release, successful: true, created_at: 't2' },
        { hash: 'h1', memo: ESCROW_MEMOS.lock, successful: true, created_at: 't1' },
      ],
    });
    expect(await findEscrowTransactions('GESCROW')).toEqual([
      { hash: 'h2', memo: ESCROW_MEMOS.release, createdAt: 't2' },
      { hash: 'h1', memo: ESCROW_MEMOS.lock, createdAt: 't1' },
    ]);
  });

  it('ignores failed transactions so reconciliation does not settle on them', async () => {
    call.mockResolvedValue({ records: [{ hash: 'h3', memo: ESCROW_MEMOS.refund, successful: false }] });
    expect(await findEscrowTransactions('GESCROW')).toEqual([]);
  });

  it('returns nothing when the escrow was never created', async () => {
    call.mockRejectedValue({ response: { status: 404 } });
    expect(await findEscrowTransactions('GESCROW')).toEqual([]);
  });

  it('reports other Horizon failures', async () => {
    call.mockRejectedValue(new Error('ETIMEDOUT'));
    await expect(findEscrowTransactions('GESCROW')).rejects.toMatchObject({ code: 'HORIZON_UNAVAILABLE' });
  });
});
