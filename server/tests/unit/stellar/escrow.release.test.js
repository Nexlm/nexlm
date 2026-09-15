import { Account, Keypair } from '@stellar/stellar-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/stellar/client.js', async (importOriginal) => ({
  ...(await importOriginal()),
  horizon: { loadAccount: vi.fn() },
  accountExists: vi.fn(),
  submitTransaction: vi.fn(),
}));

const { accountExists, horizon, platformKeypair, submitTransaction } = await import('../../../src/stellar/client.js');
const { ESCROW_MEMOS, releaseEscrow } = await import('../../../src/stellar/escrow.js');

const escrow = Keypair.random().publicKey();
const buyer = Keypair.random().publicKey();
const seller = Keypair.random().publicKey();

beforeEach(() => {
  vi.clearAllMocks();
  horizon.loadAccount.mockResolvedValue(new Account(escrow, '1'));
  accountExists.mockResolvedValue(true);
  submitTransaction.mockResolvedValue({ hash: 'release-hash' });
});

const release = () =>
  releaseEscrow({ escrowPublicKey: escrow, buyerPublicKey: buyer, sellerPublicKey: seller, xlmAmount: '250' });

describe('releaseEscrow', () => {
  it('pays the buyer, drops the signer and merges the rest back to the seller', async () => {
    expect(await release()).toEqual({ txHash: 'release-hash' });
    const [tx] = submitTransaction.mock.calls[0];

    expect(tx.operations.map((op) => op.type)).toEqual(['payment', 'setOptions', 'accountMerge']);
    expect(tx.operations[0]).toMatchObject({ destination: buyer, amount: '250.0000000' });
    expect(tx.operations[1].signer).toEqual({ ed25519PublicKey: platformKeypair().publicKey(), weight: 0 });
    expect(tx.operations[2].destination).toBe(seller);
  });

  it('creates the buyer account when it does not exist yet', async () => {
    accountExists.mockResolvedValue(false);
    await release();
    const [tx] = submitTransaction.mock.calls[0];
    expect(tx.operations[0]).toMatchObject({
      type: 'createAccount',
      destination: buyer,
      startingBalance: '250.0000000',
    });
  });

  it('is signed only by the platform key', async () => {
    await release();
    const [tx] = submitTransaction.mock.calls[0];
    expect(tx.signatures).toHaveLength(1);
    expect(tx.source).toBe(escrow);
  });

  it('memos the release', async () => {
    await release();
    expect(submitTransaction.mock.calls[0][0].memo.value.toString()).toBe(ESCROW_MEMOS.release);
  });

  it('fails loudly when the escrow account is gone', async () => {
    horizon.loadAccount.mockRejectedValue({ response: { status: 404 } });
    await expect(release()).rejects.toMatchObject({ code: 'HORIZON_UNAVAILABLE' });
  });
});
