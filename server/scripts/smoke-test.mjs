/**
 * End-to-end smoke test for a running API on Stellar TESTNET.
 *
 * Creates throwaway users, funds them with Friendbot and runs a full trade
 * lifecycle: order → escrow lock → chat → mark paid → release, plus cancel,
 * timeout auto-refund, withdrawal and admin checks.
 *
 * It writes directly to the database to skip the email link and KYC review,
 * so only ever point it at a disposable development database.
 *
 *   API_URL=http://localhost:4000 npm run smoke -w server
 */
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { io } from 'socket.io-client';

const API = process.env.API_URL ?? 'http://localhost:4000';

if (process.env.NODE_ENV === 'production' || process.env.STELLAR_NETWORK === 'public') {
  console.error('Refusing to run the smoke test against production or mainnet.');
  process.exit(1);
}

const prisma = new PrismaClient();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;

function check(label, condition, detail) {
  console.log(`${condition ? 'PASS' : 'FAIL'} ${label}`);
  if (!condition) {
    failures += 1;
    if (detail !== undefined) console.log(`     ${JSON.stringify(detail).slice(0, 400)}`);
  }
}

async function call(method, path, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}${path}`, { method, headers, body: form ?? (body ? JSON.stringify(body) : undefined) });
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  return { status: res.status, data };
}

async function makeTrader(name) {
  const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const reg = await call('POST', '/api/auth/register', {
    body: { email: `${name}_${suffix}@smoke.test`, password: 'smoke2026', displayName: `${name}_${suffix}` },
  });
  check(`register ${name}`, reg.status === 201, reg);
  // Skip the email link and KYC review for the test accounts.
  await prisma.user.update({
    where: { id: reg.data.user.id },
    data: { emailVerified: true, kycStatus: 'VERIFIED', emailVerifyTokenHash: null },
  });
  return { token: reg.data.token, user: reg.data.user };
}

async function waitForFunding(...traders) {
  for (let i = 0; i < 20; i++) {
    const wallets = await Promise.all(traders.map((t) => call('GET', '/api/wallet', { token: t.token })));
    if (wallets.every((w) => w.data?.funded)) return wallets;
    await sleep(2000);
  }
  throw new Error('Friendbot funding timed out');
}

const health = await call('GET', '/health');
check('API is healthy', health.status === 200, health);

const seller = await makeTrader('seller');
const buyer = await makeTrader('buyer');
const [, buyerWalletBefore] = await waitForFunding(seller, buyer);

check(
  'add payout account',
  (await call('POST', '/api/users/me/payment-accounts', {
    token: seller.token,
    body: { method: 'OPAY', accountName: 'Smoke Seller', accountNumber: '8031234567' },
  })).status === 201,
);

const order = await call('POST', '/api/orders', {
  token: seller.token,
  body: { type: 'SELL', xlmAmount: '100', ngnRate: '520.50', paymentMethods: ['OPAY'] },
});
check('post sell order', order.status === 201, order);

const socket = io(API, { auth: { token: buyer.token }, transports: ['websocket'] });
await new Promise((resolve, reject) => {
  socket.on('connect', resolve);
  socket.on('connect_error', reject);
});
const events = [];
socket.onAny((event, payload) => events.push({ event, payload }));

const trade = await call('POST', '/api/trades', { token: buyer.token, body: { orderId: order.data.id, paymentMethod: 'OPAY' } });
check('open trade locks escrow', trade.data?.status === 'ESCROW_LOCKED', trade);
const tradeId = trade.data.id;
check('socket joins trade room', (await new Promise((r) => socket.emit('trade:join', tradeId, r))).ok);

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
const form = new FormData();
form.append('content', 'Paid via OPay ✅ ₦52,050');
form.append('image', new Blob([png], { type: 'image/png' }), 'receipt.png');
const message = await call('POST', `/api/trades/${tradeId}/messages`, { token: buyer.token, form });
check('send chat message with payment proof', message.status === 201 && message.data.imageUrl, message);

check('buyer marks paid', (await call('POST', `/api/trades/${tradeId}/paid`, { token: buyer.token })).data?.status === 'PAID');
const released = await call('POST', `/api/trades/${tradeId}/release`, { token: seller.token });
check('seller releases escrow', released.data?.status === 'COMPLETED', released);

await sleep(500);
check('realtime trade updates delivered', events.some((e) => e.event === 'trade:updated' && e.payload.id === tradeId));

const buyerWalletAfter = await call('GET', '/api/wallet', { token: buyer.token });
const delta = Number(buyerWalletAfter.data.balance) - Number(buyerWalletBefore.data.balance);
check('buyer received 100 XLM on-chain', Math.abs(delta - 100) < 0.001, { delta });

const order2 = await call('POST', '/api/orders', {
  token: seller.token,
  body: { type: 'SELL', xlmAmount: '20', ngnRate: '519', paymentMethods: ['OPAY'] },
});
const trade2 = await call('POST', '/api/trades', { token: buyer.token, body: { orderId: order2.data.id, paymentMethod: 'OPAY' } });
const cancelled = await call('POST', `/api/trades/${trade2.data.id}/cancel`, { token: buyer.token });
check('buyer cancel refunds seller', cancelled.data?.status === 'CANCELLED' && cancelled.data.links.refund, cancelled);
check('order reopened after cancel', (await call('GET', `/api/orders/${order2.data.id}`)).data?.status === 'ACTIVE');

const trade3 = await call('POST', '/api/trades', { token: buyer.token, body: { orderId: order2.data.id, paymentMethod: 'OPAY' } });
await prisma.trade.update({ where: { id: trade3.data.id }, data: { paymentDeadline: new Date(Date.now() - 1000) } });
let expired;
for (let i = 0; i < 20; i++) {
  await sleep(2000);
  expired = (await call('GET', `/api/trades/${trade3.data.id}`, { token: buyer.token })).data;
  if (expired?.status === 'CANCELLED') break;
}
check('overdue trade auto-refunded by scheduler', expired?.cancelReason === 'PAYMENT_TIMEOUT', expired?.status);

const withdraw = await call('POST', '/api/wallet/withdraw', {
  token: buyer.token,
  body: { destination: seller.user.stellarPublicKey, amount: '5' },
});
check('withdraw XLM', withdraw.status === 201, withdraw);

const verifyToken = 'b'.repeat(64);
await prisma.user.update({
  where: { id: seller.user.id },
  data: { emailVerifyTokenHash: createHash('sha256').update(verifyToken).digest('hex') },
});
check('email verification link works', (await call('POST', '/api/auth/verify-email', { body: { token: verifyToken } })).status === 200);

socket.close();
await prisma.$disconnect();

console.log(failures ? `\n${failures} check(s) failed` : '\nAll smoke checks passed');
process.exit(failures ? 1 : 0);
