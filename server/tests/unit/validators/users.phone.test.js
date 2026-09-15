import { describe, expect, it } from 'vitest';
import { nigerianPhone, updateProfileBody } from '../../../src/validators/users.js';

describe('nigerianPhone', () => {
  it.each([
    ['08031234567', '+2348031234567'],
    ['0803 123 4567', '+2348031234567'],
    ['0703-123-4567', '+2347031234567'],
    ['2349011234567', '+2349011234567'],
    ['+2348111234567', '+2348111234567'],
  ])('normalises %s to %s', (input, expected) => {
    expect(nigerianPhone.parse(input)).toBe(expected);
  });

  it.each(['0803123456', '06031234567', '+14155550100', '08231234567', 'phone'])('rejects %s', (input) => {
    expect(nigerianPhone.safeParse(input).success).toBe(false);
  });
});

describe('updateProfileBody', () => {
  it('lets the phone be omitted', () => {
    expect(updateProfileBody.parse({})).toEqual({});
  });
});
