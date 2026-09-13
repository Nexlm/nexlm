import { Asset, BASE_FEE, Keypair, Memo, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { ESCROW_OVERHEAD_XLM } from '../config/constants.js';
import { addXlm } from '../lib/amount.js';
import {
  accountExists,
  horizon,
  networkPassphrase,
  platformKeypair,
  submitTransaction,
  wrapHorizonError,
} from './client.js';

/*
 * Escrow model
 * ────────────
 * Every trade gets its own freshly generated Stellar account.
 *
 * lock:    seller → createAccount(escrow, amount + overhead)
 *          escrow → setOptions(add platform signer w=1, master weight 0)
 *          Both operations are atomic in one transaction, signed by the seller
 *          and the throwaway escrow key. After it lands, the escrow key can no
 *          longer sign — only the platform key controls the funds, and the
 *          escrow secret is discarded.
 *
 * release: escrow → payment(buyer, amount)
 *          escrow → setOptions(remove platform signer)
 *          escrow → accountMerge(seller)   ← returns the unused overhead
 *
 * refund:  escrow → setOptions(remove platform signer)
 *          escrow → accountMerge(seller)   ← returns everything
 *
 * Signatures are checked before operations apply, so the platform signature
 * remains valid for the merge even though the signer is removed first.
 */

async function loadEscrow(escrowPublicKey) {
  try {
    return await horizon.loadAccount(escrowPublicKey);
  } catch (err) {
    throw wrapHorizonError(err);
  }
}

/**
 * Generate the escrow keypair up front so its address can be persisted before
 * the lock is submitted — if the outcome is ever unknown, we still know where
 * the funds went.
 */
export const createEscrowKeypair = () => Keypair.random();

export async function lockEscrow({ sellerSecret, escrowKeypair, xlmAmount }) {
  const seller = Keypair.fromSecret(sellerSecret);
  const escrow = escrowKeypair ?? createEscrowKeypair();
  const platform = platformKeypair();

  let sellerAccount;
  try {
    sellerAccount = await horizon.loadAccount(seller.publicKey());
  } catch (err) {
    throw wrapHorizonError(err);
  }

  const tx = new TransactionBuilder(sellerAccount, { fee: BASE_FEE, networkPassphrase })
    .addOperation(
      Operation.createAccount({
        destination: escrow.publicKey(),
        startingBalance: addXlm(xlmAmount, ESCROW_OVERHEAD_XLM),
      }),
    )
    .addOperation(
      Operation.setOptions({
        source: escrow.publicKey(),
        signer: { ed25519PublicKey: platform.publicKey(), weight: 1 },
        masterWeight: 0,
        lowThreshold: 1,
        medThreshold: 1,
        highThreshold: 1,
      }),
    )
    .addMemo(Memo.text('nexlm escrow lock'))
    .setTimeout(60)
    .build();

  tx.sign(seller, escrow);
  const result = await submitTransaction(tx);
  return { escrowPublicKey: escrow.publicKey(), txHash: result.hash };
}

export async function releaseEscrow({ escrowPublicKey, buyerPublicKey, sellerPublicKey, xlmAmount }) {
  const platform = platformKeypair();
  const account = await loadEscrow(escrowPublicKey);
  const buyerExists = await accountExists(buyerPublicKey);

  const payout = buyerExists
    ? Operation.payment({ destination: buyerPublicKey, asset: Asset.native(), amount: xlmAmount })
    : Operation.createAccount({ destination: buyerPublicKey, startingBalance: xlmAmount });

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
    .addOperation(payout)
    .addOperation(Operation.setOptions({ signer: { ed25519PublicKey: platform.publicKey(), weight: 0 } }))
    .addOperation(Operation.accountMerge({ destination: sellerPublicKey }))
    .addMemo(Memo.text('nexlm escrow release'))
    .setTimeout(60)
    .build();

  tx.sign(platform);
  const result = await submitTransaction(tx);
  return { txHash: result.hash };
}

export async function refundEscrow({ escrowPublicKey, sellerPublicKey }) {
  const platform = platformKeypair();
  const account = await loadEscrow(escrowPublicKey);

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
    .addOperation(Operation.setOptions({ signer: { ed25519PublicKey: platform.publicKey(), weight: 0 } }))
    .addOperation(Operation.accountMerge({ destination: sellerPublicKey }))
    .addMemo(Memo.text('nexlm escrow refund'))
    .setTimeout(60)
    .build();

  tx.sign(platform);
  const result = await submitTransaction(tx);
  return { txHash: result.hash };
}
