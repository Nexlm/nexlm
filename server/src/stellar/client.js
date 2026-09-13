import { Horizon, Keypair, Networks } from '@stellar/stellar-sdk';
import { env } from '../config/env.js';
import { AppError, serviceUnavailable } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export const horizon = new Horizon.Server(env.HORIZON_URL);

export const networkPassphrase = env.STELLAR_NETWORK === 'public' ? Networks.PUBLIC : Networks.TESTNET;

let cachedPlatformKeypair;
export function platformKeypair() {
  cachedPlatformKeypair ??= Keypair.fromSecret(env.PLATFORM_SECRET_KEY);
  return cachedPlatformKeypair;
}

export const explorerTxUrl = (hash) =>
  `https://stellar.expert/explorer/${env.STELLAR_NETWORK === 'public' ? 'public' : 'testnet'}/tx/${hash}`;

export const explorerAccountUrl = (publicKey) =>
  `https://stellar.expert/explorer/${env.STELLAR_NETWORK === 'public' ? 'public' : 'testnet'}/account/${publicKey}`;

export const isNotFound = (err) => err?.response?.status === 404 || err?.name === 'NotFoundError';

export async function accountExists(publicKey) {
  try {
    await horizon.loadAccount(publicKey);
    return true;
  } catch (err) {
    if (isNotFound(err)) return false;
    throw wrapHorizonError(err);
  }
}

export function wrapHorizonError(err) {
  if (err instanceof AppError) return err;
  const resultCodes = err?.response?.data?.extras?.result_codes;
  if (resultCodes) {
    return new AppError(502, 'Stellar rejected the transaction', 'STELLAR_TX_FAILED', resultCodes);
  }
  logger.error('Horizon request failed', { err });
  return serviceUnavailable('The Stellar network is unreachable right now. Please try again shortly.', 'HORIZON_UNAVAILABLE');
}

export async function submitTransaction(tx) {
  try {
    return await horizon.submitTransaction(tx);
  } catch (err) {
    throw wrapHorizonError(err);
  }
}
