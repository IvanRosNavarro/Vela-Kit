/** Directiva → fuentes. Una directiva sin fuentes se emite sola. */
export type CspPolicy = Readonly<Record<string, readonly string[]>>;

/**
 * Base de desarrollo para una shell servida por el dev server de Vite: HMR
 * necesita `unsafe-inline`, `unsafe-eval` y websockets a localhost.
 */
export const BASE_DEV_CSP: CspPolicy = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'ws://localhost:*', 'http://localhost:*'],
  'style-src': ["'self'", "'unsafe-inline'"],
  'connect-src': ["'self'", 'ws://localhost:*', 'http://localhost:*'],
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'", 'data:'],
  'frame-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
};

/** Base de producción: sin `unsafe-eval` ni scripts inline. */
export const BASE_PROD_CSP: CspPolicy = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  // unsafe-inline para los estilos inline que inyectan React y los temas.
  'style-src': ["'self'", "'unsafe-inline'"],
  'connect-src': ["'self'"],
  'img-src': ["'self'", 'data:', 'blob:'],
  'font-src': ["'self'", 'data:'],
  'frame-src': ["'none'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'upgrade-insecure-requests': [],
};

/**
 * Añade fuentes a una política. Si una directiva era `'none'` y se le añaden
 * fuentes, `'none'` desaparece (combinarlo con otras fuentes es inválido).
 */
export function extendCsp(base: CspPolicy, extra: CspPolicy): CspPolicy {
  const result: Record<string, string[]> = {};
  for (const [directive, sources] of Object.entries(base)) {
    result[directive] = [...sources];
  }
  for (const [directive, sources] of Object.entries(extra)) {
    const current = (result[directive] ?? []).filter((s) => !(s === "'none'" && sources.length > 0));
    result[directive] = [...new Set([...current, ...sources])];
  }
  return result;
}

export function buildCspHeader(policy: CspPolicy): string {
  return Object.entries(policy)
    .map(([directive, sources]) => (sources.length > 0 ? `${directive} ${sources.join(' ')}` : directive))
    .join('; ');
}
