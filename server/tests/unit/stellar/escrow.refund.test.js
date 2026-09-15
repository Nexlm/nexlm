import { Account, Keypair } from '@stellar/stellar-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/stellar/client.js', async (importOriginal) => ({
  ...(await importOriginal()),
  horizon: { loadAccount: vi.fn() },
  submitTransaction: vi.fn(),
}));

const { horizon, platformKeypair, submitTransaction } = await import('../../../src/stellar/client.js');
const { ESCROW_MEMOS, refundEscrow } = await import('../../../src/stellar/escrow.js');

const escrow = Keypair.random().publicKey();
const seller = Keypair.random().publicKey();

beforeEach(() => {
  vi.clearAllMocks();
  horizon.loadAccount.mockResolvedValue(new Account(escrow, '1'));
  submitTransaction.mockResolvedValue({ hash: 'refund-hash' });
});

const refund = () => refundEscrow({ escrowPublicKey: escrow, sellerPublicKey: seller });

describe('refundEscrow', () => {
  it('returns everything to the seller', async () => {
    expect(await refund()).toEqual({ txHash: 'refund-hash' });
    const [tx] = submitTransaction.mock.calls[0];
    expect(tx.operations.map((op) => op.type)).toEqual(['setOptions', 'accountMerge']);
    expect(tx.operations[1].destination).toBe(seller);
  });

  it('never pays the buyer', async () => {
    await refund();
    const [tx] = submitTransaction.mock.calls[0];
    expect(tx.operations.some((op) => op.type === 'payment')).toBe(false);
  });

  it('removes the platform signer before merging', async () => {
    await refund();
    const [tx] = submitTransaction.mock.calls[0];
    expect(tx.operations[0].signer).toEqual({ ed25519PublicKey: platformKeypair().publicKey(), weight: 0 });
  });

  it('memos the refund', async () => {
    await refund();
    expect(submitTransaction.mock.calls[0][0].memo.value.toString()).toBe(ESCROW_MEMOS.refund);
  });
});
