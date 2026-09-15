import { Networks } from '@stellar/stellar-sdk';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../../src/lib/errors.js';
import {
  explorerAccountUrl,
  explorerTxUrl,
  isNotFound,
  networkPassphrase,
  platformKeypair,
  wrapHorizonError,
} from '../../../src/stellar/client.js';
import { logger } from '../../../src/lib/logger.js';

describe('network configuration', () => {
  it('uses the testnet passphrase in tests', () => {
    expect(networkPassphrase).toBe(Networks.TESTNET);
  });

  it('loads the platform keypair once', () => {
    expect(platformKeypair()).toBe(platformKeypair());
    expect(platformKeypair().publicKey()).toMatch(/^G[A-Z2-7]{55}$/);
  });
});

describe('explorer links', () => {
  it('points at the testnet explorer', () => {
    expect(explorerTxUrl('abc')).toBe('https://stellar.expert/explorer/testnet/tx/abc');
    expect(explorerAccountUrl('GXYZ')).toBe('https://stellar.expert/explorer/testnet/account/GXYZ');
  });
});

describe('isNotFound', () => {
  it('recognises both Horizon shapes', () => {
    expect(isNotFound({ response: { status: 404 } })).toBe(true);
    expect(isNotFound({ name: 'NotFoundError' })).toBe(true);
    expect(isNotFound({ response: { status: 500 } })).toBe(false);
    expect(isNotFound(undefined)).toBe(false);
  });
});

describe('wrapHorizonError', () => {
  it('passes AppErrors through untouched', () => {
    const original = new AppError(400, 'nope');
    expect(wrapHorizonError(original)).toBe(original);
  });

  it('surfaces Stellar result codes so failures can be diagnosed', () => {
    const result_codes = { transaction: 'tx_failed', operations: ['op_underfunded'] };
    expect(wrapHorizonError({ response: { data: { extras: { result_codes } } } })).toMatchObject({
      status: 502,
      code: 'STELLAR_TX_FAILED',
      details: result_codes,
    });
  });

  it('reports unreachable Horizon as a service outage', () => {
    const error = vi.spyOn(logger, 'error').mockImplementation(() => {});
    expect(wrapHorizonError(new Error('ETIMEDOUT'))).toMatchObject({ status: 503, code: 'HORIZON_UNAVAILABLE' });
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});
