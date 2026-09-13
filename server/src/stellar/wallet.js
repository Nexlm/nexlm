import { Keypair } from '@stellar/stellar-sdk';
import { env } from '../config/env.js';
import { BASE_RESERVE_XLM, FEE_BUFFER_XLM } from '../config/constants.js';
import { fromStroops, toStroops } from '../lib/amount.js';
import { horizon, isNotFound, wrapHorizonError } from './client.js';

export function generateKeypair() {
  const kp = Keypair.random();
  return { publicKey: kp.publicKey(), secret: kp.secret() };
}

/** Funds a new account with 10,000 test XLM. No-op on mainnet. */
export async function fundTestnetAccount(publicKey) {
  if (env.STELLAR_NETWORK !== 'testnet') return false;
  const res = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`);
  return res.ok;
}

/**
 * Returns the native balance of an account and how much of it is spendable
 * after the minimum reserve, selling liabilities and a small fee buffer.
 */
export async function getXlmBalance(publicKey) {
  let account;
  try {
    account = await horizon.loadAccount(publicKey);
  } catch (err) {
    if (isNotFound(err)) {
      return { funded: false, balance: '0', available: '0', minimumBalance: '1' };
    }
    throw wrapHorizonError(err);
  }

  const native = account.balances.find((b) => b.asset_type === 'native');
  const balance = toStroops(native?.balance ?? '0');
  const liabilities = toStroops(native?.selling_liabilities ?? '0');
  const entries = 2n + BigInt(account.subentry_count) + BigInt(account.num_sponsoring ?? 0) - BigInt(account.num_sponsored ?? 0);
  const minimum = entries * toStroops(BASE_RESERVE_XLM);
  const available = balance - minimum - liabilities - toStroops(FEE_BUFFER_XLM);

  return {
    funded: true,
    balance: fromStroops(balance),
    available: fromStroops(available > 0n ? available : 0n),
    minimumBalance: fromStroops(minimum),
  };
}

/** Recent native payment activity for an account, newest first. */
export async function getPaymentHistory(publicKey, { cursor, limit = 20 } = {}) {
  let page;
  try {
    let query = horizon.payments().forAccount(publicKey).order('desc').limit(limit);
    if (cursor) query = query.cursor(cursor);
    page = await query.call();
  } catch (err) {
    if (isNotFound(err)) return { records: [], nextCursor: null };
    throw wrapHorizonError(err);
  }

  const records = page.records
    .map((r) => toActivity(r, publicKey))
    .filter(Boolean);

  const last = page.records.at(-1);
  return { records, nextCursor: page.records.length === limit ? last?.paging_token : null };
}

function toActivity(record, publicKey) {
  const base = { id: record.id, txHash: record.transaction_hash, createdAt: record.created_at };

  switch (record.type) {
    case 'payment':
      if (record.asset_type !== 'native') return null;
      return {
        ...base,
        kind: 'payment',
        direction: record.to === publicKey ? 'in' : 'out',
        amount: record.amount,
        counterparty: record.to === publicKey ? record.from : record.to,
      };
    case 'create_account':
      return {
        ...base,
        kind: 'create_account',
        direction: record.account === publicKey ? 'in' : 'out',
        amount: record.starting_balance,
        counterparty: record.account === publicKey ? record.funder : record.account,
      };
    case 'account_merge':
      return {
        ...base,
        kind: 'account_merge',
        direction: record.into === publicKey ? 'in' : 'out',
        amount: null,
        counterparty: record.into === publicKey ? record.account : record.into,
      };
    default:
      return null;
  }
}
