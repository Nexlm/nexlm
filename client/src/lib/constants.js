export const PAYMENT_METHODS = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'OPAY', label: 'OPay' },
  { value: 'PALMPAY', label: 'PalmPay' },
  { value: 'KUDA', label: 'Kuda' },
  { value: 'MONIEPOINT', label: 'Moniepoint' },
];

export const paymentMethodLabel = (value) =>
  PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value;

export const TRADE_STATUS = {
  PENDING_ESCROW: { label: 'Locking escrow', tone: 'gold' },
  ESCROW_LOCKED: { label: 'Awaiting payment', tone: 'gold' },
  PAID: { label: 'Paid · awaiting release', tone: 'frost' },
  RELEASING: { label: 'Releasing XLM', tone: 'frost' },
  REFUNDING: { label: 'Refunding seller', tone: 'frost' },
  COMPLETED: { label: 'Completed', tone: 'mint' },
  CANCELLED: { label: 'Cancelled', tone: 'moss' },
};

export const ORDER_STATUS = {
  ACTIVE: { label: 'Active', tone: 'mint' },
  FILLED: { label: 'Matched', tone: 'frost' },
  CANCELLED: { label: 'Cancelled', tone: 'moss' },
  EXPIRED: { label: 'Expired', tone: 'moss' },
};

export const KYC_STATUS = {
  UNVERIFIED: { label: 'Not verified', tone: 'moss' },
  PENDING: { label: 'Under review', tone: 'gold' },
  VERIFIED: { label: 'Verified', tone: 'mint' },
  REJECTED: { label: 'Rejected', tone: 'ember' },
};

export const USER_STATUS = {
  ACTIVE: { label: 'Active', tone: 'mint' },
  SUSPENDED: { label: 'Suspended', tone: 'gold' },
  BANNED: { label: 'Banned', tone: 'ember' },
};

export const CANCEL_REASONS = {
  BUYER_CANCELLED: 'Cancelled by buyer',
  PAYMENT_TIMEOUT: 'Payment window expired',
  ESCROW_FAILED: 'Escrow could not be funded',
};
