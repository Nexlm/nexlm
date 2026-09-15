import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/stellar/client.js', async (importOriginal) => ({
  ...(await importOriginal()),
  horizon: { loadAccount: vi.fn() },
}));

const { horizon } = await import('../../../src/stellar/client.js');
const { generateKeypair, getXlmBalance } = await import('../../../src/stellar/wallet.js');

const account = (overrides = {}) => ({
  balances: [{ asset_type: 'native', balance: '100.0000000', selling_liabilities: '0.0000000' }],
  subentry_count: 0,
  ...overrides,
});

beforeEach(() => vi.clearAllMocks());

describe('generateKeypair', () => {
  it('returns a matching public key and seed', () => {
    const { publicKey, secret } = generateKeypair();
    expect(publicKey).toMatch(/^G[A-Z2-7]{55}$/);
    expect(secret).toMatch(/^S[A-Z2-7]{55}$/);
  });
});

describe('getXlmBalance', () => {
  it('subtracts the base reserve and fee buffer from what can be spent', async () => {
    horizon.loadAccount.mockResolvedValue(account());
    expect(await getXlmBalance('G...')).toEqual({
      funded: true,
      balance: '100',
      available: '98.99',
      minimumBalance: '1',
    });
  });

  it('counts subentries in the minimum balance', async () => {
    horizon.loadAccount.mockResolvedValue(account({ subentry_count: 2 }));
    const result = await getXlmBalance('G...');
    expect(result.minimumBalance).toBe('2');
    expect(result.available).toBe('97.99');
  });

  it('holds back selling liabilities', async () => {
    horizon.loadAccount.mockResolvedValue(
      account({ balances: [{ asset_type: 'native', balance: '100', selling_liabilities: '40' }] }),
    );
    expect((await getXlmBalance('G...')).available).toBe('58.99');
  });

  it('never reports a negative spendable balance', async () => {
    horizon.loadAccount.mockResolvedValue(account({ balances: [{ asset_type: 'native', balance: '0.5' }] }));
    expect((await getXlmBalance('G...')).available).toBe('0');
  });

  it('reports unfunded accounts instead of failing', async () => {
    horizon.loadAccount.mockRejectedValue({ response: { status: 404 } });
    expect(await getXlmBalance('G...')).toEqual({ funded: false, balance: '0', available: '0', minimumBalance: '1' });
  });

  it('turns other Horizon failures into service errors', async () => {
    horizon.loadAccount.mockRejectedValue(new Error('ETIMEDOUT'));
    await expect(getXlmBalance('G...')).rejects.toMatchObject({ code: 'HORIZON_UNAVAILABLE' });
  });
});
