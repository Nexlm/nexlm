import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { validate } from '../../../src/middleware/validate.js';

describe('validate middleware', () => {
  it('exposes parsed values on req.valid', () => {
    const req = { params: { id: 'abc' }, query: { page: '2' }, body: { name: ' Ada ' } };
    const next = vi.fn();
    validate({
      params: z.object({ id: z.string() }),
      query: z.object({ page: z.coerce.number() }),
      body: z.object({ name: z.string().trim() }),
    })(req, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.valid).toEqual({ params: { id: 'abc' }, query: { page: 2 }, body: { name: 'Ada' } });
  });

  it('leaves the raw request untouched', () => {
    const req = { body: { name: ' Ada ' } };
    validate({ body: z.object({ name: z.string().trim() }) })(req, {}, vi.fn());
    expect(req.body.name).toBe(' Ada ');
  });

  it('treats a missing body as empty', () => {
    const req = {};
    const next = vi.fn();
    validate({ body: z.object({ note: z.string().optional() }) })(req, {}, next);
    expect(req.valid.body).toEqual({});
  });

  it('passes validation errors to next', () => {
    const next = vi.fn();
    validate({ body: z.object({ amount: z.number() }) })({ body: {} }, {}, next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(z.ZodError);
  });

  it('keeps values validated by earlier middleware', () => {
    const req = { valid: { params: { id: 'x' } }, query: {} };
    validate({ query: z.object({}) })(req, {}, vi.fn());
    expect(req.valid.params).toEqual({ id: 'x' });
  });
});
