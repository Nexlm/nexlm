import { describe, expect, it } from 'vitest';
import { isSmileConfigured } from '../../../src/services/smileId.js';

describe('isSmileConfigured', () => {
  it('is false without partner credentials, so KYC falls back to manual review', () => {
    expect(isSmileConfigured()).toBe(false);
  });
});
