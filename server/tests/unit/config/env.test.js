import { describe, expect, it } from 'vitest';
import { env, parseEnv } from '../../../src/config/env.js';

const required = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/nexlm',
  JWT_SECRET: 'a'.repeat(32),
  ENCRYPTION_KEY: '0'.repeat(64),
  PLATFORM_SECRET_KEY: 'SBVYPYFR7LVS6LOFWSUSLOFRFZ2HPTR7WUHJVWZRDPJ5PS3DUCSUPPD4',
};

const errorsFor = (source) => {
  const result = parseEnv(source);
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'));
};

describe('parseEnv', () => {
  it('accepts the minimum configuration', () => {
    expect(parseEnv(required).success).toBe(true);
  });

  it('names every missing variable so a deploy can be fixed in one pass', () => {
    expect(errorsFor({})).toEqual(['DATABASE_URL', 'JWT_SECRET', 'ENCRYPTION_KEY', 'PLATFORM_SECRET_KEY']);
  });

  it('treats empty values as unset', () => {
    expect(errorsFor({ ...required, JWT_SECRET: '' })).toEqual(['JWT_SECRET']);
  });

  it('rejects a short JWT secret', () => {
    expect(errorsFor({ ...required, JWT_SECRET: 'too-short' })).toEqual(['JWT_SECRET']);
  });

  it('requires a 32-byte hex encryption key', () => {
    expect(errorsFor({ ...required, ENCRYPTION_KEY: 'abc' })).toEqual(['ENCRYPTION_KEY']);
  });

  it('requires a Stellar seed for the platform signer', () => {
    expect(errorsFor({ ...required, PLATFORM_SECRET_KEY: 'GABC' })).toEqual(['PLATFORM_SECRET_KEY']);
  });

  it('defaults to a 15 minute payment window and 30 minute order life', () => {
    const { data } = parseEnv(required);
    expect(data.TRADE_PAYMENT_WINDOW_MINUTES).toBe(15);
    expect(data.ORDER_TTL_MINUTES).toBe(30);
    expect(data.STELLAR_NETWORK).toBe('testnet');
    expect(data.REQUIRE_KYC).toBe(true);
  });

  it('coerces numeric and boolean strings', () => {
    const { data } = parseEnv({ ...required, PORT: '8080', REQUIRE_KYC: 'false', MIN_TRADE_XLM: '5' });
    expect(data).toMatchObject({ PORT: 8080, REQUIRE_KYC: false, MIN_TRADE_XLM: 5 });
  });

  it('rejects an unknown Stellar network', () => {
    expect(errorsFor({ ...required, STELLAR_NETWORK: 'futurenet' })).toEqual(['STELLAR_NETWORK']);
  });

  it('requires a long cron secret when one is set', () => {
    expect(errorsFor({ ...required, CRON_SECRET: 'short' })).toEqual(['CRON_SECRET']);
    expect(parseEnv({ ...required, CRON_SECRET: 'x'.repeat(16) }).success).toBe(true);
  });
});

describe('env', () => {
  it('splits CLIENT_URL into allowed origins', () => {
    expect(env.clientOrigins).toContain('http://localhost:5173');
  });

  it('knows it is not running serverless in tests', () => {
    expect(env.isServerless).toBe(false);
    expect(env.isTest).toBe(true);
  });
});
