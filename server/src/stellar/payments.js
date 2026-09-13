import { Asset, BASE_FEE, Keypair, Memo, Operation, TransactionBuilder } from '@stellar/stellar-sdk';
import { badRequest } from '../lib/errors.js';
import { compareXlm } from '../lib/amount.js';
import { accountExists, horizon, networkPassphrase, submitTransaction, wrapHorizonError } from './client.js';

/**
 * Sends XLM from a custodial wallet. If the destination account does not exist
 * yet, it is created (Stellar requires at least 1 XLM to do so).
 */
export async function sendXlm({ sourceSecret, destination, amount, memo }) {
  const source = Keypair.fromSecret(sourceSecret);
  if (destination === source.publicKey()) throw badRequest('You cannot send XLM to your own wallet');

  const exists = await accountExists(destination);
  if (!exists && compareXlm(amount, '1') < 0) {
    throw badRequest('This address is not activated yet — send at least 1 XLM to create it');
  }

  let account;
  try {
    account = await horizon.loadAccount(source.publicKey());
  } catch (err) {
    throw wrapHorizonError(err);
  }

  const op = exists
    ? Operation.payment({ destination, asset: Asset.native(), amount })
    : Operation.createAccount({ destination, startingBalance: amount });

  const builder = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase })
    .addOperation(op)
    .setTimeout(60);

  if (memo) builder.addMemo(Memo.text(memo));

  const tx = builder.build();
  tx.sign(source);
  const result = await submitTransaction(tx);
  return { txHash: result.hash };
}
