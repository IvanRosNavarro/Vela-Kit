import { describe, expect, it } from 'vitest';
import { BASE_DEV_CSP, BASE_PROD_CSP, buildCspHeader, extendCsp } from './index';

describe('CSP', () => {
  it('producción no permite eval ni scripts inline', () => {
    const header = buildCspHeader(BASE_PROD_CSP);
    expect(header).toContain("script-src 'self';");
    expect(header).not.toContain('unsafe-eval');
    expect(header.endsWith('upgrade-insecure-requests')).toBe(true);
    expect(buildCspHeader(BASE_DEV_CSP)).toContain("'unsafe-eval'");
  });

  it('extendCsp añade fuentes sin duplicar ni mutar la base', () => {
    const policy = extendCsp(BASE_PROD_CSP, {
      'img-src': ['vela:', 'data:'],
      'connect-src': ['https://sync.vela-browser.com'],
    });
    expect(policy['img-src']).toEqual(["'self'", 'data:', 'blob:', 'vela:']);
    expect(policy['connect-src']).toEqual(["'self'", 'https://sync.vela-browser.com']);
    expect(BASE_PROD_CSP['img-src']).toEqual(["'self'", 'data:', 'blob:']);
  });

  it("'none' desaparece al añadir fuentes y se crean directivas nuevas", () => {
    const policy = extendCsp(BASE_PROD_CSP, { 'frame-src': ['https://example.com'], 'worker-src': ["'self'"] });
    expect(policy['frame-src']).toEqual(['https://example.com']);
    expect(policy['worker-src']).toEqual(["'self'"]);
    expect(extendCsp(BASE_PROD_CSP, { 'frame-src': [] })['frame-src']).toEqual(["'none'"]);
  });
});
