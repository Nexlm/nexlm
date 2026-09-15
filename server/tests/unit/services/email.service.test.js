import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('nodemailer', () => ({ default: { createTransport: vi.fn(() => ({ sendMail: vi.fn() })) } }));

const { sendMail, sendPasswordResetEmail, sendVerificationEmail } = await import(
  '../../../src/services/email.service.js'
);
const { logger } = await import('../../../src/lib/logger.js');

beforeEach(() => vi.clearAllMocks());

describe('email service without SMTP', () => {
  it('logs the message instead of failing', async () => {
    const info = vi.spyOn(logger, 'info').mockImplementation(() => {});
    await sendMail({ to: 'ada@x.ng', subject: 'Hello', text: 'body' });
    expect(info.mock.calls[0][0]).toContain('[email disabled] Hello → ada@x.ng');
    info.mockRestore();
  });
});

describe('verification email', () => {
  it('links to the client with the token', async () => {
    const info = vi.spyOn(logger, 'info').mockImplementation(() => {});
    await sendVerificationEmail('ada@x.ng', 'tok123');
    expect(info.mock.calls[0][1].text).toContain('/verify-email?token=tok123');
    info.mockRestore();
  });
});

describe('password reset email', () => {
  it('links to the reset page and says how long it lasts', async () => {
    const info = vi.spyOn(logger, 'info').mockImplementation(() => {});
    await sendPasswordResetEmail('ada@x.ng', 'tok456');
    const { text } = info.mock.calls[0][1];
    expect(text).toContain('/reset-password?token=tok456');
    expect(text).toContain('1 hour');
    info.mockRestore();
  });
});
