export const PAYMENT_METHODS = ['BANK_TRANSFER', 'OPAY', 'PALMPAY', 'KUDA', 'MONIEPOINT'];

export const PAYMENT_METHOD_LABELS = {
  BANK_TRANSFER: 'Bank Transfer',
  OPAY: 'OPay',
  PALMPAY: 'PalmPay',
  KUDA: 'Kuda',
  MONIEPOINT: 'Moniepoint',
};

/**
 * Extra XLM sent into every escrow account on top of the trade amount.
 * Covers the 1 XLM account minimum, the 0.5 XLM platform-signer subentry and
 * transaction fees. Whatever is left is merged back to the seller on close.
 */
export const ESCROW_OVERHEAD_XLM = '2';

/** Stellar base reserve per ledger entry. */
export const BASE_RESERVE_XLM = '0.5';

/** Fee buffer kept aside when computing what a wallet can spend. */
export const FEE_BUFFER_XLM = '0.01';

export const TRADE_ACTIVE_STATUSES = ['PENDING_ESCROW', 'ESCROW_LOCKED', 'PAID', 'RELEASING', 'REFUNDING'];
export const TRADE_TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED'];

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
