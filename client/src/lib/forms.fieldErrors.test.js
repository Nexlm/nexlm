import { describe, expect, it } from 'vitest';
import { fieldErrors } from './forms.js';

describe('fieldErrors', () => {
  it('maps server validation details onto form fields', () => {
    const error = {
      code: 'VALIDATION_ERROR',
      details: [
        { path: 'email', message: 'Enter a valid email address' },
        { path: 'password', message: 'Password must contain a number' },
      ],
    };
    expect(fieldErrors(error)).toEqual({
      email: 'Enter a valid email address',
      password: 'Password must contain a number',
    });
  });

  it('ignores details without a field path', () => {
    expect(fieldErrors({ details: [{ message: 'Something went wrong' }] })).toEqual({});
  });

  it('returns an empty map for other errors', () => {
    expect(fieldErrors(undefined)).toEqual({});
    expect(fieldErrors({ code: 'INTERNAL_ERROR' })).toEqual({});
  });
});
