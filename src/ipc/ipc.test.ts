import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { UntrustedFrameError, createFrameGuard, validatePayload } from './index';

describe('validatePayload', () => {
  const schema = z.object({ id: z.string().min(1) });

  it('devuelve los datos parseados', () => {
    expect(validatePayload(schema, { id: 'a', extra: 1 })).toEqual({ ok: true, data: { id: 'a' } });
  });

  it('devuelve INVALID_INPUT con los issues', () => {
    const res = validatePayload(schema, { id: '' });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe('INVALID_INPUT');
      expect(Array.isArray(res.details)).toBe(true);
    }
  });
});

describe('createFrameGuard', () => {
  const frame = (url: string) => ({ senderFrame: { url } });

  it('confía en los prefijos y en el origen exacto del dev server', () => {
    const guard = createFrameGuard({
      trustedPrefixes: ['vela://', 'file://'],
      devServerOrigin: 'http://localhost:5183',
      logger: { warn: vi.fn() },
    });
    expect(guard.isTrustedFrame(frame('vela://settings'))).toBe(true);
    expect(guard.isTrustedFrame(frame('file:///C:/app/index.html'))).toBe(true);
    expect(guard.isTrustedFrame(frame('http://localhost:5183/?page=x'))).toBe(true);
  });

  it('rechaza orígenes parecidos al dev server y frames vacíos', () => {
    const guard = createFrameGuard({
      trustedPrefixes: ['vela://'],
      devServerOrigin: 'http://localhost:5183',
      logger: { warn: vi.fn() },
    });
    expect(guard.isTrustedFrame(frame('http://localhost.evil.com:5183/'))).toBe(false);
    expect(guard.isTrustedFrame(frame('http://localhost:5184/'))).toBe(false);
    expect(guard.isTrustedFrame(frame('https://example.com'))).toBe(false);
    expect(guard.isTrustedFrame({ senderFrame: null })).toBe(false);
  });

  it('en producción no hay dev server de confianza', () => {
    const guard = createFrameGuard({ trustedPrefixes: [], devServerOrigin: null, logger: { warn: vi.fn() } });
    expect(guard.isTrustedFrame(frame('http://localhost:5183/'))).toBe(false);
  });

  it('guardTrustedFrame registra y lanza un error tipado', () => {
    const warn = vi.fn();
    const guard = createFrameGuard({ trustedPrefixes: ['vela://'], devServerOrigin: null, logger: { warn } });
    expect(() => guard.guardTrustedFrame(frame('https://evil.com'), 'site:create')).toThrow(UntrustedFrameError);
    expect(warn).toHaveBeenCalledOnce();
    expect(() => guard.guardTrustedFrame(frame('vela://x'), 'site:create')).not.toThrow();
  });
});
