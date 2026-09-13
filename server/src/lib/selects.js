/** Fields safe to show to any other user. */
export const publicUserSelect = {
  id: true,
  displayName: true,
  kycStatus: true,
  createdAt: true,
};

/** Fields for the authenticated user's own session. Never includes secrets or hashes. */
export const sessionUserSelect = {
  id: true,
  email: true,
  displayName: true,
  phone: true,
  role: true,
  status: true,
  emailVerified: true,
  kycStatus: true,
  kycIdType: true,
  kycIdLast4: true,
  stellarPublicKey: true,
  createdAt: true,
};
