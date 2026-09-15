import { Account, Keypair } from '@stellar/stellar-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/stellar/client.js', async (importOriginal) => ({
  ...(await importOriginal()),
  horizon: { loadAccount: vi.fn() },
  submitTransaction: vi.fn(async () => ({ hash: 'lock-hash' })),
}));

const { horizon, platformKeypair, submitTransaction } = await import('../../../src/stellar/client.js');
const { createEscrowKeypair, ESCROW_MEMOS, lockEscrow } = await import('../../../src/stellar/escrow.js');

const seller = Keypair.random();

beforeEach(() => {
  vi.clearAllMocks();
  horizon.loadAccount.mockResolvedValue(new Account(seller.publicKey(), '1'));
  submitTransaction.mockResolvedValue({ hash: 'lock-hash' });
});

const lock = (xlmAmount = '250', escrowKeypair = createEscrowKeypair()) =>
  lockEscrow({ sellerSecret: seller.secret(), escrowKeypair, xlmAmount });

describe('lockEscrow', () => {
  it('returns the escrow address and transaction hash', async () => {
    const escrowKeypair = createEscrowKeypair();
    const result = await lock('250', escrowKeypair);
    expect(result).toEqual({ escrowPublicKey: escrowKeypair.publicKey(), txHash: 'lock-hash' });
  });

  it('funds the escrow with the trade amount plus the overhead', async () => {
    await lock('250');
    const [tx] = submitTransaction.mock.calls[0];
    expect(tx.operations[0]).toMatchObject({ type: 'createAccount', startingBalance: '252.0000000' });
  });

  it('disables the escrow key and adds the platform signer atomically', async () => {
    const escrowKeypair = createEscrowKeypair();
    await lock('250', escrowKeypair);
    const [tx] = submitTransaction.mock.calls[0];

    expect(tx.operations).toHaveLength(2);
    expect(tx.operations[1]).toMatchObject({
      type: 'setOptions',
      source: escrowKeypair.publicKey(),
      masterWeight: 0,
      signer: { ed25519PublicKey: platformKeypair().publicKey(), weight: 1 },
    });
  });

  it('requires both the seller and escrow signatures', async () => {
    await lock();
    const [tx] = submitTransaction.mock.calls[0];
    expect(tx.signatures).toHaveLength(2);
  });

  it('memos the transaction so it is recognisable on-chain', async () => {
    await lock();
    const [tx] = submitTransaction.mock.calls[0];
    expect(tx.memo.value.toString()).toBe(ESCROW_MEMOS.lock);
  });

  it('generates its own escrow key when none is given', async () => {
    const result = await lockEscrow({ sellerSecret: seller.secret(), xlmAmount: '10' });
    expect(result.escrowPublicKey).toMatch(/^G[A-Z2-7]{55}$/);
  });

  it('reports Horizon failures when the seller account cannot be loaded', async () => {
    horizon.loadAccount.mockRejectedValue(new Error('ETIMEDOUT'));
    await expect(lock()).rejects.toMatchObject({ code: 'HORIZON_UNAVAILABLE' });
  });
});
