import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../../src/lib/logger.js';

afterEach(() => vi.restoreAllMocks());

describe('logger', () => {
  it('writes errors to stderr', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('Escrow failed');
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0].join(' ')).toContain('Escrow failed');
  });

  it('serialises Error metadata instead of logging an empty object', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('Horizon request failed', { err: new Error('timeout') });
    expect(JSON.stringify(spy.mock.calls[0][1])).toContain('timeout');
  });

  it('stays quiet below the level threshold in tests', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.info('routine');
    logger.debug('noisy');
    expect(spy).not.toHaveBeenCalled();
  });
});
