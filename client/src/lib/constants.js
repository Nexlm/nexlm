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
  PENDING_ESCROW: { label: 'Locking escrow', tone: 'amber' },
  ESCROW_LOCKED: { label: 'Awaiting payment', tone: 'amber' },
  PAID: { label: 'Paid — awaiting release', tone: 'blue' },
  RELEASING: { label: 'Releasing XLM', tone: 'blue' },
  REFUNDING: { label: 'Refunding seller', tone: 'blue' },
  COMPLETED: { label: 'Completed', tone: 'green' },
  CANCELLED: { label: 'Cancelled', tone: 'slate' },
};

export const ORDER_STATUS = {
  ACTIVE: { label: 'Active', tone: 'green' },
  FILLED: { label: 'Matched', tone: 'blue' },
  CANCELLED: { label: 'Cancelled', tone: 'slate' },
  EXPIRED: { label: 'Expired', tone: 'slate' },
};

export const KYC_STATUS = {
  UNVERIFIED: { label: 'Not verified', tone: 'slate' },
  PENDING: { label: 'Under review', tone: 'amber' },
  VERIFIED: { label: 'Verified', tone: 'green' },
  REJECTED: { label: 'Rejected', tone: 'red' },
};

export const USER_STATUS = {
  ACTIVE: { label: 'Active', tone: 'green' },
  SUSPENDED: { label: 'Suspended', tone: 'amber' },
  BANNED: { label: 'Banned', tone: 'red' },
};

export const CANCEL_REASONS = {
  BUYER_CANCELLED: 'Cancelled by buyer',
  PAYMENT_TIMEOUT: 'Payment window expired',
  ESCROW_FAILED: 'Escrow could not be funded',
};
